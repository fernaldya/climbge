from flask import Blueprint, request, jsonify, session
from utils.auth import login_required
from services.feedback_service import submit_feedback

feedback_bp = Blueprint("feedback", __name__)

@feedback_bp.post("/feedback")
@login_required
def feedback():
    uid = session.get['user_id']
    body = request.get_json(silent=True) or {}
    payload, status = submit_feedback(uid, (body.get("feedback") or "").strip())
    return jsonify(payload), status
