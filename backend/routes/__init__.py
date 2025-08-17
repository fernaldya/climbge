from flask import Blueprint
from .auth import auth_bp
from .history import history_bp
from .feedback import feedback_bp

api_bp = Blueprint("api", __name__, url_prefix="/api")
api_bp.register_blueprint(auth_bp)
api_bp.register_blueprint(history_bp)
api_bp.register_blueprint(feedback_bp)
