from functools import wraps
from flask import session
from .http import err
from .connect_db import pool

# Roles allowed to review (approve / reject) submissions.
APPROVER_ROLES = ("admin", "approver")

def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user_id"):
            return err("unauthorized", "Not logged in.", 401)
        return fn(*args, **kwargs)
    return wrapper


def _get_user_role(user_id):
    with pool.connection() as conn, conn.cursor() as cur:
        cur.execute("SELECT role FROM public.users WHERE user_id = %s LIMIT 1", (user_id,))
        row = cur.fetchone()
    return row[0] if row else None


def approver_required(fn):
    """Allow only logged-in users whose role is admin or approver."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        uid = session.get("user_id")
        if not uid:
            return err("unauthorized", "Not logged in.", 401)
        if _get_user_role(uid) not in APPROVER_ROLES:
            return err("forbidden", "You do not have permission to do this.", 403)
        return fn(*args, **kwargs)
    return wrapper
