import json
import time
import uuid
from pathlib import Path
from typing import Any, Dict, List

from config.settings import settings

STORE_FILE = Path(settings.UPLOAD_FOLDER).resolve().parent / "storage" / "conversations.json"
STORE_FILE.parent.mkdir(parents=True, exist_ok=True)


def _load_store() -> Dict[str, Dict[str, Any]]:
    if not STORE_FILE.exists():
        return {}

    try:
        data = json.loads(STORE_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _save_store(data: Dict[str, Dict[str, Any]]) -> None:
    STORE_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


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


def get_conversation(conversation_id: str) -> Dict[str, Any]:
    data = _load_store()
    conversation = data.get(conversation_id)
    if not isinstance(conversation, dict):
        raise KeyError(conversation_id)
    return conversation


def list_conversations() -> List[Dict[str, Any]]:
    data = _load_store()
    conversations = [conversation for conversation in data.values() if isinstance(conversation, dict)]
    conversations.sort(key=lambda item: item.get("updatedAt", 0), reverse=True)
    return conversations


def create_conversation(title: str = "New Chat") -> Dict[str, Any]:
    conversation_id = str(uuid.uuid4())
    conversation = {"id": conversation_id, "title": title, "messages": [], "createdAt": int(time.time() * 1000), "updatedAt": int(time.time() * 1000)}
    data = _load_store()
    data[conversation_id] = conversation
    _save_store(data)
    return conversation


def get_session_history(session_id: str) -> List[Dict[str, Any]]:
    try:
        conversation = get_conversation(session_id)
        return _normalize_history(conversation.get("messages", []))
    except KeyError:
        # Session doesn't exist yet, return empty history
        return []


def append_session_message(session_id: str, role: str, content: str) -> Dict[str, Any]:
    data = _load_store()
    conversation = data.get(session_id)
    if not isinstance(conversation, dict):
        conversation = {"id": session_id, "title": "New Chat", "messages": [], "createdAt": int(time.time() * 1000), "updatedAt": int(time.time() * 1000)}
        data[session_id] = conversation

    message = {"role": role, "content": content, "createdAt": int(time.time() * 1000)}
    conversation.setdefault("messages", []).append(message)
    conversation["updatedAt"] = message["createdAt"]

    if role == "user" and conversation.get("title", "New Chat") == "New Chat":
        conversation["title"] = _summary_title(content)

    _save_store(data)
    return conversation


def delete_conversation(conversation_id: str) -> None:
    data = _load_store()
    if conversation_id not in data:
        raise KeyError(conversation_id)
    del data[conversation_id]
    _save_store(data)


def update_conversation_title(conversation_id: str, title: str) -> Dict[str, Any]:
    data = _load_store()
    conversation = data.get(conversation_id)
    if not isinstance(conversation, dict):
        raise KeyError(conversation_id)
    conversation["title"] = title
    conversation["updatedAt"] = int(time.time() * 1000)
    _save_store(data)
    return conversation
