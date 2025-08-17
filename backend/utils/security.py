import bcrypt
from flask import session

SESSION_KEY = "user_id"

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

def login_user(user_id: str):
    session[SESSION_KEY] = user_id

def logout_user():
    session.pop(SESSION_KEY, None)

def current_user_id():
    return session.get(SESSION_KEY)
