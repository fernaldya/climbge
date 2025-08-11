import os
import traceback
from flask import Flask, jsonify, Blueprint, request
from werkzeug.exceptions import HTTPException
from flasgger import Swagger
from psycopg.errors import UniqueViolation
from datetime import datetime
from dotenv import load_dotenv
load_dotenv()

from utils.auth import auth_bp
from utils.security import hash_password, login_user
from utils.connect_db import pool


def create_app():
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=os.environ.get("secret_key"),
        SESSION_COOKIE_NAME="climbge_session",
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SECURE=False,     # keep True in prod (HTTPS via Cloudflare)
        SESSION_COOKIE_SAMESITE="Lax",
        JSON_SORT_KEYS=False,
    )

    app.register_blueprint(auth_bp, url_prefix="/api")

    @app.get("/healthz")
    def healthz():
        """
        Health check endpoint
        ---
        responses:
            200:
                description: Returns a simple status message"""
        return jsonify(status="ok")

    @app.errorhandler(Exception)
    def handle_unexpected(e):
        if isinstance(e, HTTPException):
            return e  # Let Flask handle HTTP errors normally
        # Log the full traceback for debugging
        print(traceback.format_exc())
        return jsonify(error={"code": "server_error", "message": "Something went wrong."}), 500


    return app


app = create_app()
if os.getenv("FLASK_ENV") == "development":
    Swagger(app)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("app_port", "8080")), debug=True)
