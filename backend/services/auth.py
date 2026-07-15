import hashlib
import json
import time
import uuid
from pathlib import Path

from config.settings import settings

BACKEND_DIR = Path(__file__).resolve().parents[1]
USERS_FILE = BACKEND_DIR / "storage" / "users.json"
USERS_FILE.parent.mkdir(parents=True, exist_ok=True)
JWT_SECRET = settings.JWT_SECRET or "nova-ai-default-secret"
JWT_EXPIRY = 86400 * 30


def _base64url_encode(data: bytes) -> str:
    import base64
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _base64url_decode(s: str) -> bytes:
    import base64
    padding = 4 - len(s) % 4
    if padding != 4:
        s += "=" * padding
    return base64.urlsafe_b64decode(s)


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_token(user_id: str) -> str:
    import json
    header = _base64url_encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    payload = _base64url_encode(json.dumps({
        "user_id": user_id,
        "exp": int(time.time()) + JWT_EXPIRY,
    }).encode())
    signing_input = f"{header}.{payload}"
    sig = _base64url_encode(
        hashlib.sha256(f"{signing_input}{JWT_SECRET}".encode()).digest()
    )
    return f"{header}.{payload}.{sig}"


def verify_token(token: str) -> dict | None:
    import json
    parts = token.split(".")
    if len(parts) != 3:
        return None
    header, payload, sig = parts
    signing_input = f"{header}.{payload}"
    expected = _base64url_encode(
        hashlib.sha256(f"{signing_input}{JWT_SECRET}".encode()).digest()
    )
    if sig != expected:
        return None
    try:
        data = json.loads(_base64url_decode(payload))
    except Exception:
        return None
    if data.get("exp", 0) < time.time():
        return None
    return data


def _load_users() -> dict:
    if USERS_FILE.exists():
        try:
            with USERS_FILE.open("r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def _save_users(users: dict) -> None:
    with USERS_FILE.open("w", encoding="utf-8") as f:
        json.dump(users, f, ensure_ascii=False, indent=2)
    try:
        from services.remote_storage import upload_file
        upload_file("data/users.json", USERS_FILE)
    except Exception:
        pass


def delete_user(user_id: str) -> bool:
    users = _load_users()
    username_to_delete = None
    for uname, data in list(users.items()):
        if data.get("user_id") == user_id:
            username_to_delete = uname
            break
    if not username_to_delete:
        return False
    del users[username_to_delete]
    _save_users(users)

    # Clean up user data
    import shutil
    from pathlib import Path
    from config.settings import settings

    # Remove uploads
    upload_dir = Path(settings.UPLOAD_FOLDER) / user_id
    if upload_dir.exists():
        shutil.rmtree(upload_dir, ignore_errors=True)

    # Remove vector store
    from rag.vector_store import _index_dir
    index_dir = _index_dir(user_id)
    if index_dir.exists():
        shutil.rmtree(index_dir, ignore_errors=True)

    # Remove conversations
    conv_file = Path(__file__).resolve().parents[1] / "storage" / f"conversations_{user_id}.json"
    if conv_file.exists():
        conv_file.unlink(missing_ok=True)

    return True


def register(username: str, password: str) -> dict | None:
    username = username.strip().lower()
    if not username or len(username) < 2:
        return None
    if len(password) < 4:
        return None
    users = _load_users()
    if username in users:
        return None
    user_id = str(uuid.uuid4())
    users[username] = {
        "user_id": user_id,
        "password_hash": _hash_password(password),
        "created_at": time.time(),
    }
    _save_users(users)
    token = create_token(user_id)
    return {"token": token, "user_id": user_id, "username": username}


def login(username: str, password: str) -> dict | None:
    username = username.strip().lower()
    users = _load_users()
    user = users.get(username)
    if not user:
        return None
    if user["password_hash"] != _hash_password(password):
        return None
    token = create_token(user["user_id"])
    return {"token": token, "user_id": user["user_id"], "username": username}
