from functools import wraps
from flask import session
from .http import err

def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            return err("unauthorized", "Not logged in.", 401)
        return fn(*args, **kwargs)
    return wrapper
