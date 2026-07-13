import asyncio
import json
import logging
import re

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config.settings import settings
from rag.llm_client import stream_tokens
from rag.prompts import build_prompt, no_context_template, empty_db_template
from rag.rag_chain import retrieve_context, get_retriever
from services.conversation_store import append_session_message, get_session_history

logger = logging.getLogger(__name__)

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    question: str
    stream: bool = True
    instructions: str = ""


async def _retrieve_nodes(question: str, rewritten_question: str):
    """Run blocking TF-IDF retrieval off the event loop."""
    try:
        nodes = await asyncio.to_thread(retrieve_context, rewritten_question, settings.TOP_K)
        if not nodes:
            nodes = await asyncio.to_thread(retrieve_context, question, settings.TOP_K)
    except FileNotFoundError:
        nodes = []
    except Exception as exc:
        logger.error("Retrieval error: %s", exc)
        nodes = []
    return nodes


async def generate_stream(prompt: str, extra_events: list[dict] | None = None):
    """Stream tokens from LLM with small-batch buffering for smoother UI."""
    batch: list[str] = []
    async for token in stream_tokens(prompt):
        batch.append(token)
        if len(batch) >= 3:  # flush every 3 tokens for smoother rendering
            yield f"data: {json.dumps({'token': ''.join(batch)})}\n\n"
            batch.clear()
    if batch:
        yield f"data: {json.dumps({'token': ''.join(batch)})}\n\n"
    if extra_events:
        for event in extra_events:
            yield f"data: {json.dumps(event)}\n\n"
    yield "data: [DONE]\n\n"


async def single_token_stream(text: str):
    yield f"data: {json.dumps({'token': text})}\n\n"
    yield "data: [DONE]\n\n"


@router.post("")
@router.post("/stream")
async def chat_stream(request: ChatRequest):
    session_id = request.session_id
    question = request.question.strip()

    if not question:
        return StreamingResponse(
            single_token_stream("Please enter a question."),
            media_type="text/event-stream",
        )

    question_lower = question.lower().strip()
    greetings = ["hello", "hi", "hey", "greetings", "good morning", "good afternoon", "good evening"]
    if any(re.search(r'\b' + re.escape(greeting) + r'\b', question_lower) for greeting in greetings):
        return StreamingResponse(
            single_token_stream(
                "Hi! I'm Nova — your intelligent research companion. What would you like to explore today?"
            ),
            media_type="text/event-stream",
        )

    history = get_session_history(session_id)[-settings.MAX_HISTORY_MESSAGES :]

    rewritten_question = question
    pronouns = ["it", "this", "that", "they", "them", "its", "their", "these", "those"]
    if history and any(word in question_lower for word in pronouns):
        history_text = "\n".join(f"{m['role']}: {m['content'][:200]}" for m in history)
        rewritten_question = f"{question} (Previous context: {history_text})"

    nodes = await _retrieve_nodes(question, rewritten_question)
    has_docs = False
    try:
        retriever = get_retriever()
        has_docs = len(retriever.documents) > 0 if retriever else False
    except Exception:
        has_docs = False

    if not nodes and has_docs:
        history_text = "\n".join(
            f"{m['role']}: {m['content'][:300]}"
            for m in history[-settings.MAX_HISTORY_MESSAGES :]
        )
        prompt = no_context_template.format(
            question=question,
            history=history_text,
            instructions=request.instructions or "No specific instructions.",
        )
        no_context_found = True
    elif not nodes and not has_docs:
        prompt = empty_db_template.format(
            question=question,
            instructions=request.instructions or "No specific instructions.",
        )
        no_context_found = True
    else:
        prompt = build_prompt(question, nodes, history, request.instructions)
        no_context_found = False

    logger.info("Prompt length: %d chars, retrieved %d nodes, no_context_found=%s", len(prompt), len(nodes), no_context_found)

    history.append({"role": "user", "content": question})
    append_session_message(session_id, "user", question)

    async def sse_generator():
        full_response = ""
        extra = [{"action": "search_offer", "query": question}] if no_context_found else None
        async for chunk in generate_stream(prompt, extra_events=extra):
            if chunk.startswith("data: ") and not chunk.startswith("data: [DONE]"):
                try:
                    data = json.loads(chunk[6:])
                    if "token" in data:
                        full_response += data["token"]
                except Exception:
                    pass
            yield chunk

        fallback = "I apologize, but I couldn't generate a response. Please try again."
        final_response = full_response or fallback
        history.append({"role": "assistant", "content": final_response})
        append_session_message(session_id, "assistant", final_response)

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
