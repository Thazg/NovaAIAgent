import json
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List

from config.settings import settings

BASE_DIR = Path(settings.UPLOAD_FOLDER).resolve().parent / "storage" / "sessions"


def _store_file_for(user_id: str) -> Path:
    path = BASE_DIR / user_id / "conversations.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _b2_path_for(user_id: str) -> str:
    return f"sessions/{user_id}/conversations.json"


def _load_store(user_id: str) -> Dict[str, Dict[str, Any]]:
    store_file = _store_file_for(user_id)
    if not store_file.exists():
        try:
            from services.remote_storage import download_file
            download_file(_b2_path_for(user_id), store_file)
        except ImportError:
            pass
    if not store_file.exists():
        return {}
    try:
        data = json.loads(store_file.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _save_store(data: Dict[str, Dict[str, Any]], user_id: str) -> None:
    store_file = _store_file_for(user_id)
    store_file.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    try:
        from services.remote_storage import upload_file
        upload_file(_b2_path_for(user_id), store_file)
    except ImportError:
        pass


def _normalize_history(messages: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    history = []
    for message in messages[-10:]:
        if isinstance(message, dict) and "role" in message and "content" in message:
            history.append({
                "role": message["role"],
                "content": message["content"],
            })
    return history


def _summary_title(content: str) -> str:
    text = " ".join(content.strip().split())
    if len(text) <= 40:
        return text or "New Chat"
    return text[:37] + "..."


def get_conversation(conversation_id: str, user_id: str) -> Dict[str, Any]:
    data = _load_store(user_id)
    conversation = data.get(conversation_id)
    if not isinstance(conversation, dict):
        raise KeyError(conversation_id)
    return conversation


def list_conversations(user_id: str) -> List[Dict[str, Any]]:
    data = _load_store(user_id)
    conversations = [conv for conv in data.values() if isinstance(conv, dict)]
    conversations.sort(key=lambda item: item.get("updatedAt", 0), reverse=True)
    return conversations


def create_conversation(user_id: str, title: str = "New Chat") -> Dict[str, Any]:
    conversation_id = str(uuid.uuid4())
    now = int(time.time() * 1000)
    conversation = {"id": conversation_id, "title": title, "messages": [], "createdAt": now, "updatedAt": now}
    data = _load_store(user_id)
    data[conversation_id] = conversation
    _save_store(data, user_id)
    return conversation


def get_session_history(session_id: str, user_id: str) -> List[Dict[str, Any]]:
    try:
        conversation = get_conversation(session_id, user_id)
        return _normalize_history(conversation.get("messages", []))
    except KeyError:
        return []


def append_session_message(session_id: str, role: str, content: str, user_id: str) -> Dict[str, Any]:
    data = _load_store(user_id)
    conversation = data.get(session_id)
    now = int(time.time() * 1000)
    if not isinstance(conversation, dict):
        conversation = {"id": session_id, "title": "New Chat", "messages": [], "createdAt": now, "updatedAt": now}
        data[session_id] = conversation

    message = {"role": role, "content": content, "createdAt": now}
    conversation.setdefault("messages", []).append(message)
    conversation["updatedAt"] = now

    if role == "user" and conversation.get("title", "New Chat") == "New Chat":
        conversation["title"] = _summary_title(content)

    _save_store(data, user_id)
    return conversation


def delete_conversation(conversation_id: str, user_id: str) -> None:
    data = _load_store(user_id)
    if conversation_id not in data:
        raise KeyError(conversation_id)
    del data[conversation_id]
    _save_store(data, user_id)


def update_conversation_title(conversation_id: str, title: str, user_id: str) -> Dict[str, Any]:
    data = _load_store(user_id)
    conversation = data.get(conversation_id)
    if not isinstance(conversation, dict):
        raise KeyError(conversation_id)
    conversation["title"] = title
    conversation["updatedAt"] = int(time.time() * 1000)
    _save_store(data, user_id)
    return conversation
