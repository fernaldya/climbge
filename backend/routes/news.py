from flask import Blueprint
from utils.auth import login_required
from services.news_service import fetch_news

news_bp = Blueprint("news", __name__)

@news_bp.get("/news")
@login_required
def get_news():
    payload, status = fetch_news()
    return payload, status
