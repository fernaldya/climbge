from __future__ import annotations
from flask import Blueprint, jsonify, session
from utils.auth import login_required
from services.history_service import fetch_climb_history
from utils.security import SESSION_KEY

history_bp = Blueprint("history", __name__)

@history_bp.get("/history",)
@login_required
def get_history():
    uid = session[SESSION_KEY]
    payload, status = fetch_climb_history(uid)
    return jsonify(payload), status


@history_bp.get("/last-climb")
@login_required
def get_last_climb():
    return jsonify({"error": {"code": "not_implemented", "message": "This endpoint is not implemented yet."}}), 501


@history_bp.get("/weekly-summary")
@login_required
def get_weekly_summary():
    return jsonify({"error": {"code": "not_implemented", "message": "This endpoint is not implemented yet."}}), 501
