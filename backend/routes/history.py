from __future__ import annotations
from flask import Blueprint, jsonify, session
from utils.auth import login_required
from services.history_service import fetch_climb_history, fetch_last_climb, fetch_weekly_stats
from utils.security import SESSION_KEY

history_bp = Blueprint("history", __name__)

@history_bp.get("/history")
@login_required
def get_history():
    uid = session[SESSION_KEY]
    payload, status = fetch_climb_history(uid)
    return jsonify(payload), status


@history_bp.get("/last-climb")
@login_required
def get_last_climb():
    uid = session[SESSION_KEY]
    payload, status = fetch_last_climb(uid)
    return jsonify(payload), status


@history_bp.get("/weekly-summary")
@login_required
def get_weekly_summary():
    uid = session[SESSION_KEY]
    payload, status = fetch_weekly_stats(uid)
    return jsonify(payload), status
