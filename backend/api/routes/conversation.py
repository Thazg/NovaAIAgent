from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from services.conversation_store import (
    create_conversation,
    delete_conversation as delete_store_conversation,
    get_conversation,
    list_conversations as list_store_conversations,
    update_conversation_title,
)

router = APIRouter()


class ConversationUpdate(BaseModel):
    title: str


def _get_user(request: Request) -> str:
    return getattr(request.state, "user_id", "") or "__anonymous__"


@router.get("")
def list_conversations(request: Request):
    return list_store_conversations(_get_user(request))


@router.post("/new")
def create_conversation_route(request: Request):
    return create_conversation(_get_user(request))


@router.get("/{id}")
def get_conversation_route(request: Request, id: str):
    try:
        return get_conversation(id, _get_user(request))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Conversation not found") from exc


@router.delete("/{id}")
def delete_conversation_route(request: Request, id: str):
    try:
        delete_store_conversation(id, _get_user(request))
        return {"status": "success"}
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Conversation not found") from exc


@router.put("/{id}")
def update_conversation_route(request: Request, id: str, update: ConversationUpdate):
    try:
        return update_conversation_title(id, update.title, _get_user(request))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Conversation not found") from exc
