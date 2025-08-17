from __future__ import annotations
from flask import Blueprint, request, jsonify
from services.auth_service import signup_user, login_with_password, logout_user, me_profile

auth_bp = Blueprint("auth", __name__)


# --- AUTH ENDPOINTS -----------------------------------------------------------
@auth_bp.post("/signup")
def signup():
    body = request.get_json(silent=True) or {}
    payload, status = signup_user(body)
    return jsonify(payload), status


@auth_bp.post("/login")
def login():
    body = request.get_json(silent=True) or {}
    username = body.get("username", "").strip()
    password = body.get("password", "")
    payload, status = login_with_password(username, password)
    return jsonify(payload), status


@auth_bp.post("/logout")
def logout():
    payload, status = logout_user()
    return jsonify(payload), status


@auth_bp.get("/me")
def me():
    payload, status = me_profile()
    return jsonify(payload), status
