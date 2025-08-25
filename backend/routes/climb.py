# routes/climb.py
from __future__ import annotations
from flask import Blueprint, jsonify, request, session
from utils.auth import login_required
from utils.security import current_user_id
from services.climb_service import fetch_grades, commit_session_service

climb_bp = Blueprint("climb", __name__)

# ---------- Grade systems ----------
@climb_bp.get("/grades")
def api_get_grade_systems():
    """
    Fetch available grade systems
    """
    items = fetch_grades()   # returns list
    return jsonify(items), 200

# ---------- Commit session ----------
@climb_bp.post("/commit-session")
@login_required
def api_commit_session():
    """
    Commit a climbing session and its routes
    """
    uid = current_user_id()
    if not uid:
        return jsonify({"error": "User not authenticated"}), 401

    payload = request.get_json(silent=True) or {}
    body, status = commit_session_service(uid, payload)
    return jsonify(body), status
