from fastapi import APIRouter
import requests
from config.settings import settings

router = APIRouter()


@router.get("")
@router.get("/")
@router.head("")
@router.head("/")
def health_check():
    if settings.LLM_PROVIDER == "groq":
        llm_status = "cloud (Groq)"
        api_key_set = bool(settings.GROQ_API_KEY)
        if not api_key_set:
            overall = "degraded"
        else:
            overall = "healthy"
        return {
            "status": overall,
            "backend": "running",
            "llm_provider": "groq",
            "groq_api_key_set": api_key_set,
            "groq_model": settings.GROQ_MODEL,
            "embedding_model": settings.GROQ_EMBEDDING_MODEL,
            "vector_store": "loaded",
        }

    ollama_status = "unknown"
    try:
        res = requests.get(f"{settings.OLLAMA_URL}/api/tags", timeout=3)
        if res.status_code == 200:
            ollama_status = "running"
        else:
            ollama_status = "error"
    except Exception:
        ollama_status = "down"

    return {
        "status": "healthy" if ollama_status == "running" else "degraded",
        "backend": "running",
        "llm_provider": "ollama",
        "ollama": ollama_status,
        "model": settings.MODEL_NAME,
        "embedding_model": settings.GROQ_EMBEDDING_MODEL,
        "vector_store": "loaded",
    }
