import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from api.routes import chat, health, conversation, documents
from config.settings import settings
import logging

logging.basicConfig(level=settings.LOG_LEVEL, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Nova AI Agent API",
    version="1.0.0",
    description="Enterprise RAG backend for Nova AI Agent"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "message": str(exc)}
    )

app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(conversation.router, prefix="/conversation", tags=["Conversation"])
app.include_router(documents.router, prefix="/documents", tags=["Documents"])

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing Nova AI Agent Backend...")
    from pathlib import Path

    from rag.vector_store import load_vector_store, build_vector_store
    from rag.load import load_documents, DATASET_DIR
    from rag.chunking import split_documents
    from rag.llm_client import warmup_model
    from rag.rag_chain import get_retriever, reload_vector_store
    from config.settings import settings

    Path(settings.UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)

    try:
        load_vector_store()
        logger.info("Vector store loaded successfully.")
        n_docs = len(get_retriever().documents) if get_retriever() else 0
        logger.info("Total documents in index: %d", n_docs)
    except FileNotFoundError:
        try:
            documents = load_documents(DATASET_DIR)
            if not documents:
                logger.info("Dataset directory is empty — no documents to index.")
            else:
                nodes = split_documents(documents)
                build_vector_store(nodes)
                logger.info("Built a new vector store from %d documents.", len(documents))
        except Exception as exc:
            logger.warning("Auto-indexing skipped: %s", exc)

    reload_vector_store()
    try:
        r = get_retriever()
        n_docs = len(r.documents) if r and r.documents else 0
    except FileNotFoundError:
        n_docs = 0
    logger.info("Retriever ready. Total documents: %d. Upload documents via /documents/upload or use 'search for <topic>' to auto-download.", n_docs)

    await warmup_model()