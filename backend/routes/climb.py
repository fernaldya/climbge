# routes/climb.py
from __future__ import annotations
from flask import Blueprint, jsonify, request, session
from utils.auth import login_required
from utils.security import current_user_id
from services.climb_service import fetch_grades, commit_session_service, fetch_climb_locations, fetch_outdoor_climbs, edit_outdoor_climb, delete_outdoor_climb, create_outdoor_climb
from utils.security import SESSION_KEY

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

# --------- Climb locations ---------
@climb_bp.get("/climb-locations")
@login_required
def api_get_climb_locations():
    """
    Fetch active climb locations
    """
    items = fetch_climb_locations()
    return jsonify(items), 200

# ---------- Outdoor --------------
@climb_bp.get("/outdoor-climbs")
@login_required
def get_outdoor_climbs():
    uid = session[SESSION_KEY]
    payload, status = fetch_outdoor_climbs(uid)
    return jsonify(payload), status


@climb_bp.post("/outdoor-climbs")
@login_required
def create_outdoor_climb_route():
    uid = session[SESSION_KEY]
    data = request.get_json()

    # Extract required fields
    route_name = data.get("route_name")
    location = data.get("location")
    grade_system = data.get("grade_system")
    grade_label = data.get("grade_label")

    # Extract optional fields
    description = data.get("description")
    attempts = data.get("attempts", 0)
    sent = data.get("sent", False)
    sent_at = data.get("sent_at")
    first_climb_date = data.get("first_climb_date")

    payload, status = create_outdoor_climb(
        user_id=uid,
        route_name=route_name,
        location=location,
        grade_system=grade_system,
        grade_label=grade_label,
        description=description,
        attempts=attempts,
        sent=sent,
        sent_at=sent_at,
        first_climb_date=first_climb_date
    )
    return jsonify(payload), status


@climb_bp.put("/outdoor-climbs/<route_id>")
@login_required
def update_outdoor_climb(route_id):
    uid = session[SESSION_KEY]
    data = request.get_json()

    # Extract fields from request
    is_sent = data.get("is_sent", False)
    attempts = data.get("attempts")
    first_climb_date = data.get("first_climb_date")
    sent_at = data.get("sent_at")

    payload, status = edit_outdoor_climb(
        user_id=uid,
        route_id=route_id,
        is_sent=is_sent,
        attempts=attempts,
        first_climb_date=first_climb_date,
        sent_at=sent_at
    )
    return jsonify(payload), status


@climb_bp.delete("/outdoor-climbs/<route_id>")
@login_required
def remove_outdoor_climb(route_id):
    uid = session[SESSION_KEY]
    payload, status = delete_outdoor_climb(
        user_id=uid,
        route_id=route_id
    )
    return jsonify(payload), status
