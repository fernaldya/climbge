from flask import Blueprint, request, jsonify, session
from utils.auth import login_required
from services.feedback_service import submit_feedback, submit_new_climb_location, submit_new_grade_system
from utils.security import current_user_id

feedback_bp = Blueprint("feedback", __name__)

@feedback_bp.post("/feedback")
@login_required
def feedback():
    uid = current_user_id()
    body = request.get_json(silent=True) or {}
    payload, status = submit_feedback(uid, (body.get("feedback") or "").strip())
    return payload, status


@feedback_bp.post("/climb-location")
@login_required
def add_climb_location():
    uid = current_user_id()
    body = request.get_json(silent=True) or {}
    payload, status = submit_new_climb_location(uid, body)
    return payload, status


@feedback_bp.post("/grade-system") 
@login_required
def add_grade_system():
    uid = current_user_id()
    body = request.get_json(silent=True) or {}
    payload, status = submit_new_grade_system(uid, body)
    return payload, status