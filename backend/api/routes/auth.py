from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from services.auth import register, login, verify_token

router = APIRouter()


class AuthRequest(BaseModel):
    username: str
    password: str


@router.post("/register")
def register_user(req: AuthRequest):
    result = register(req.username, req.password)
    if not result:
        raise HTTPException(status_code=400, detail="Username already exists or invalid credentials")
    return result


@router.post("/login")
def login_user(req: AuthRequest):
    result = login(req.username, req.password)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return result


@router.get("/me")
def get_me(request: Request):
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {"user_id": user_id}


@router.delete("/account")
def delete_account(request: Request):
    user_id = getattr(request.state, "user_id", None)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    from services.auth import delete_user
    ok = delete_user(user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "message": "Account and all associated data deleted"}
