import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from api.routes import auth, chat, health, conversation, documents
from config.settings import settings
from services.auth import verify_token
import logging

logging.basicConfig(level=settings.LOG_LEVEL, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request.state.user_id = None
        path = request.url.path
        if path.startswith(("/health", "/auth")):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            payload = verify_token(auth_header[7:])
            if payload:
                request.state.user_id = payload.get("user_id")

        return await call_next(request)


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
app.add_middleware(AuthMiddleware)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "message": str(exc)}
    )

app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(conversation.router, prefix="/conversation", tags=["Conversation"])
app.include_router(documents.router, prefix="/documents", tags=["Documents"])

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing Nova AI Agent Backend...")
    from pathlib import Path
    from config.settings import settings

    Path(settings.UPLOAD_FOLDER).mkdir(parents=True, exist_ok=True)
    logger.info("Upload folder ready at %s", settings.UPLOAD_FOLDER)

    from rag.llm_client import warmup_model
    await warmup_model()