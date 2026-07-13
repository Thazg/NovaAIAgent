from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.conversation_store import create_conversation, delete_conversation as delete_store_conversation, get_conversation, list_conversations as list_store_conversations, update_conversation_title

router = APIRouter()


class ConversationUpdate(BaseModel):
    title: str


@router.get("")
def list_conversations():
    return list_store_conversations()


@router.post("/new")
def create_conversation_route():
    return create_conversation()


@router.get("/{id}")
def get_conversation_route(id: str):
    try:
        return get_conversation(id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Conversation not found") from exc


@router.delete("/{id}")
def delete_conversation_route(id: str):
    try:
        delete_store_conversation(id)
        return {"status": "success"}
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Conversation not found") from exc


@router.put("/{id}")
def update_conversation_route(id: str, update: ConversationUpdate):
    try:
        return update_conversation_title(id, update.title)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Conversation not found") from exc
