# routes/climb.py
from __future__ import annotations
from flask import Blueprint, jsonify, request
from utils.auth import login_required
from utils.security import current_user_id
from services.climb_service import fetch_grades, commit_session_service, fetch_climb_locations, fetch_outdoor_climbs, edit_outdoor_climbs, delete_outdoor_climb, create_outdoor_climbs

climb_bp = Blueprint("climb", __name__)

# ---------- Grade systems ----------
@climb_bp.get("/grades")
def api_get_grade_systems():
    """
    Fetch available grade systems
    """
    outdoor = request.args.get('outdoor', 'false').lower() == 'true'
    items = fetch_grades(outdoor=outdoor)   # returns list
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
    uid = current_user_id()
    payload, status = fetch_outdoor_climbs(uid)
    return jsonify(payload), status


@climb_bp.post("/outdoor-climbs")
@login_required
def create_outdoor_climb_routes():
    """
    Save a batch of new outdoor routes. Body: {"routes": [ {...}, ... ]}.
    All or nothing -- see create_outdoor_climbs. Field validation lives in the service
    so it applies to every caller.
    """
    uid = current_user_id()
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"ok": False, "error": "Missing or malformed request body"}), 400

    payload, status = create_outdoor_climbs(user_id=uid, routes=data.get("routes"))
    return jsonify(payload), status


@climb_bp.put("/outdoor-climbs")
@login_required
def update_outdoor_climb_routes():
    """
    Apply a batch of edits. Body: {"updates": [ {"route_id": ..., ...}, ... ]}.
    Absent keys leave that column untouched.
    """
    uid = current_user_id()
    data = request.get_json(silent=True)

    if not isinstance(data, dict):
        return jsonify({"ok": False, "error": "Missing or malformed request body"}), 400

    payload, status = edit_outdoor_climbs(user_id=uid, updates=data.get("updates"))
    return jsonify(payload), status


@climb_bp.delete("/outdoor-climbs/<route_id>")
@login_required
def remove_outdoor_climb(route_id):
    uid = current_user_id()
    payload, status = delete_outdoor_climb(
        user_id=uid,
        route_id=route_id
    )
    return jsonify(payload), status
