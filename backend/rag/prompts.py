from config.settings import settings

template = (
    "You are Nova, a research assistant. Answer using the context below.\n"
    "NO GREETINGS: Start directly with the answer. Do NOT say 'I'm happy to help', "
    "'Sure', 'Of course', or any other pleasantries.\n"
    "STRICT LANGUAGE RULE: Detect the user's language and respond in that language only. "
    "Do NOT mix languages. Do NOT repeat in both languages. "
    "If the question is in Vietnamese, write your entire answer in Vietnamese. "
    "If the question is in English, write your entire answer in English.\n"
    "CRITICAL: You MUST cite the source for every fact you use. "
    "Format: (Source: file_name).\n"
    "Use context even if partially relevant; "
    "only say you lack info if the context has absolutely no relation to the question; "
    "resolve pronouns from history.\n\n"
    "Instructions:\n{instructions}\n\n"
    "History:\n{history}\n\n"
    "Context:\n{context}\n\n"
    "Question: {question}\n\n"
    "Answer:"
)

no_context_template = (
    "You are Nova, a professional research assistant. The knowledge base contains documents, "
    "but none were relevant to the user's question.\n"
    "STRICT LANGUAGE RULE: Detect the user's language and respond in that language only. "
    "Do NOT mix languages. Do NOT repeat in both languages. "
    "If the question is in Vietnamese, write your entire answer in Vietnamese. "
    "If the question is in English, write your entire answer in English.\n"
    "NO GREETINGS: Do NOT start with pleasantries. Go straight to the point.\n"
    "CRITICAL OUTPUT FORMAT - follow EXACTLY:\n"
    "Line 1: State that no relevant documents were found (one sentence).\n"
    "Line 2: (empty line)\n"
    "Line 3: - Upload relevant documents using the paperclip upload button.\n"
    "Line 4: - Or say 'search for <topic>' and I will automatically find and download relevant PDFs from the web.\n"
    "Each of the two bullet points MUST be on its own separate line. Do NOT merge them.\n"
    "Keep it concise. Do NOT make up information.\n\n"
    "Instructions:\n{instructions}\n\n"
    "History:\n{history}\n\n"
    "Question: {question}\n\n"
    "Answer:"
)

empty_db_template = (
    "You are Nova, a professional research assistant. The knowledge base is completely empty — "
    "no documents have been uploaded yet.\n"
    "STRICT LANGUAGE RULE: Detect the user's language and respond in that language only. "
    "Do NOT mix languages. Do NOT repeat in both languages. "
    "If the question is in Vietnamese, write your entire answer in Vietnamese. "
    "If the question is in English, write your entire answer in English.\n"
    "NO GREETINGS: Start directly. Do NOT say 'I'm happy to help' or similar.\n"
    "Your response format (follow EXACTLY):\n"
    "Line 1: State that the knowledge base is empty (one sentence).\n"
    "Line 2: (empty line)\n"
    "Line 3: - Upload documents using the 📎 upload button.\n"
    "Line 4: - Or say 'search for <topic>' and I will automatically find and download relevant PDFs from the web.\n"
    "Each bullet MUST be on its own separate line. Do NOT merge them.\n"
    "Keep it concise. Do NOT make up information.\n\n"
    "Instructions:\n{instructions}\n\n"
    "Question: {question}\n\n"
    "Answer:"
)

rewrite_template = (
    """
    You are a query rewriting assistant.

    Given the conversation history and the latest user question,
    rewrite the latest question into a standalone question.

    Rules:
    - Preserve the original meaning.
    - Replace pronouns like \"it\", \"that\", \"they\" with the correct entity.
    - Do NOT answer the question.
    - Only output the rewritten question.

    Conversation History:
    {history}

    Current Question:
    {question}

    Standalone Question:
    """
)

custom_node_template = (
    "(Source: {file_name}, Chunk {chunk_index})\n"
    "{content}\n"
    "-------------------------\n"
)


def build_context(nodes):
    contexts = []
    total_chars = 0
    max_chunk = settings.MAX_CHUNK_CHARS
    max_total = settings.MAX_CONTEXT_CHARS

    for node in nodes:
        metadata = node.get("metadata", {})
        file_name = metadata.get("file_name", "Unknown")
        content = node.get("content", "")
        if len(content) > max_chunk:
            content = content[:max_chunk] + "..."

        block = custom_node_template.format(
            file_name=file_name,
            chunk_index=metadata.get("chunk_index", "-"),
            content=content,
        )
        if total_chars + len(block) > max_total:
            break
        contexts.append(block)
        total_chars += len(block)

    return "\n\n".join(contexts)


def build_prompt(question, nodes, history, instructions="", lang_instruction=""):
    history_text = "\n".join(
        f"{message['role']}: {message['content'][:300]}"
        for message in history[-settings.MAX_HISTORY_MESSAGES :]
    )
    context = build_context(nodes)
    final_instructions = instructions or "No specific instructions."
    if lang_instruction:
        final_instructions = f"{lang_instruction}\n\n{final_instructions}"

    return template.format(
        context=context,
        question=question,
        history=history_text,
        instructions=final_instructions,
    )
