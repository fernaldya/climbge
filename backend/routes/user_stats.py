from __future__ import annotations
import logging
from flask import Blueprint, request, session, jsonify
from utils.auth import login_required
from services.user_stats_service import update_user_stats
from utils.security import SESSION_KEY

stats_bp = Blueprint('stats', __name__)
logger = logging.getLogger("climbge-api")

@stats_bp.post('/user-measurements')
@login_required
def upd_user_stats():
    uid = session[SESSION_KEY]
    body = request.get_json(silent=True) or {}
    try:
        saved = update_user_stats(uid, body)
        return jsonify({"measurements": saved}), 200
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception:
        logger.exception("user_measurements failed user_id=%s", uid)
        return jsonify({"error": "Error editing physical stats"}), 500
