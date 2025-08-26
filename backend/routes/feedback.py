from flask import Blueprint, request, jsonify, session
from utils.auth import login_required
from services.feedback_service import submit_feedback
from utils.security import current_user_id

feedback_bp = Blueprint("feedback", __name__)

@feedback_bp.post("/feedback")
@login_required
def feedback():
    uid = current_user_id()
    body = request.get_json(silent=True) or {}
    payload, status = submit_feedback(uid, (body.get("feedback") or "").strip())
    return jsonify(payload), status
