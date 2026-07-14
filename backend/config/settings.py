import os
from pathlib import Path
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")


class Settings:
    # Provider: "ollama" (local) or "groq" (cloud-free, no GPU needed)
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "ollama")

    # Ollama
    OLLAMA_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
    OLLAMA_KEEP_ALIVE: str = os.getenv("OLLAMA_KEEP_ALIVE", "30m")
    MODEL_NAME: str = os.getenv("MODEL_NAME", "qwen3:4b-instruct")

    # Groq (free, no VPS needed)
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    TOP_K: int = int(os.getenv("TOP_K", "5"))
    TEMPERATURE: float = float(os.getenv("TEMPERATURE", "0.1"))
    LLM_TOP_K: int = int(os.getenv("LLM_TOP_K", "40"))
    LLM_TOP_P: float = float(os.getenv("LLM_TOP_P", "0.9"))
    MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", "2048"))
    NUM_CTX: int = int(os.getenv("NUM_CTX", "4096"))
    MAX_HISTORY_MESSAGES: int = int(os.getenv("MAX_HISTORY_MESSAGES", "4"))
    MAX_CHUNK_CHARS: int = int(os.getenv("MAX_CHUNK_CHARS", "1000"))
    MAX_CONTEXT_CHARS: int = int(os.getenv("MAX_CONTEXT_CHARS", "6000"))
    RETRIEVAL_CONFIDENCE_THRESHOLD: float = float(os.getenv("RETRIEVAL_CONFIDENCE_THRESHOLD", "0.1"))
    BROAD_TOP_K: int = int(os.getenv("BROAD_TOP_K", "20"))
    MIN_SIMILARITY_SCORE: float = float(os.getenv("MIN_SIMILARITY_SCORE", "0.12"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    UPLOAD_FOLDER: str = os.getenv(
        "UPLOAD_FOLDER",
        str(BACKEND_DIR / "Dataset" / "uploads"),
    )

    # Backblaze B2 (S3-compatible storage)
    B2_KEY_ID: str = os.getenv("B2_KEY_ID", "")
    B2_APP_KEY: str = os.getenv("B2_APP_KEY", "")
    B2_BUCKET: str = os.getenv("B2_BUCKET", "nova-ai-storage")
    B2_ENDPOINT: str = os.getenv("B2_ENDPOINT", "https://s3.us-west-004.backblazeb2.com")


settings = Settings()
