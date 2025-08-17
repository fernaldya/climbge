from dotenv import load_dotenv
load_dotenv()

import os
import traceback
from flask import Flask, jsonify
from werkzeug.exceptions import HTTPException
from flasgger import Swagger
from routes import api_bp

def create_app():
    app = Flask(__name__)
    app.config.update(
        SECRET_KEY=os.environ.get("secret_key"),
        SESSION_COOKIE_NAME="climbge_session",
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SECURE=False,      # set True in prod (behind Cloudflare)
        SESSION_COOKIE_SAMESITE="Lax",
        JSON_SORT_KEYS=False,
    )

    app.register_blueprint(api_bp)

    @app.get("/healthz")
    def healthz():
        return jsonify(status="ok")

    @app.errorhandler(Exception)
    def handle_unexpected(e):
        if isinstance(e, HTTPException):
            return e
        print(traceback.format_exc())
        return jsonify(error={"code": "server_error", "message": "Something went wrong."}), 500

    return app

app = create_app()
if os.getenv("FLASK_ENV") == "development":
    Swagger(app)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("app_port", "8080")), debug=True)
