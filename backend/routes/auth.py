from __future__ import annotations
from flask import Blueprint, request
from services.auth_service import (
    signup_user,
    login_with_password,
    logout_user,
    me_profile,
    request_password_reset,
    reset_password_with_token,
)

auth_bp = Blueprint("auth", __name__)


# --- AUTH ENDPOINTS -----------------------------------------------------------
@auth_bp.post("/signup")
def signup():
    body = request.get_json(silent=True) or {}
    # payload, status = signup_user(body)
    return signup_user(body)


@auth_bp.post("/login")
def login():
    body = request.get_json(silent=True) or {}
    username = body.get("username", "").strip()
    password = body.get("password", "")
    return login_with_password(username, password)


@auth_bp.post("/logout")
def logout():
    return logout_user()


@auth_bp.get("/me")
def me():
    return me_profile()


@auth_bp.post("/forgot-password")
def forgot_password():
    body = request.get_json(silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    username = (body.get("username") or "").strip()
    return request_password_reset(email, username)


@auth_bp.post("/reset-password")
def reset_password():
    body = request.get_json(silent=True) or {}
    token = (body.get("token") or "").strip()
    new_password = body.get("new_password") or ""
    return reset_password_with_token(token, new_password)
