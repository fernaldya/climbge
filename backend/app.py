import os
from dotenv import load_dotenv
env_file = os.environ.get('ENV_DIR', '.env')
if os.path.exists(env_file):
    load_dotenv(f'{os.environ.get('ENV_DIR')}')

import traceback
from flask import Flask, jsonify, request, abort
from werkzeug.exceptions import HTTPException
from flasgger import Swagger
from routes import api_bp
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_cors import CORS
from utils.logger import setup_logging, install_api_request_logging

def parse_origins(envval: str) -> list[str]:
    return [o.strip() for o in (envval or "").split(",") if o.strip()]

api_logger = setup_logging('climbge-api', os.path.join(os.getenv("LOG_FILE_PATH"), 'climbge.log'))

def create_app():
    app = Flask(__name__)

    # Cookies
    app.config.update(
        SECRET_KEY=os.environ.get("SECRET_KEY"),
        SESSION_COOKIE_NAME=os.environ.get("SESSION_COOKIE_NAME"),
        SESSION_COOKIE_HTTPONLY=os.environ.get("SESSION_COOKIE_HTTPONLY"),
        SESSION_COOKIE_SECURE=os.environ.get("SESSION_COOKIE_SECURE"),
        SESSION_COOKIE_SAMESITE=os.environ.get("SESSION_COOKIE_SAMESITE"),
        JSON_SORT_KEYS=False,
    )

    # Trust proxy
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1)

    # CORS
    allowed_origins = parse_origins(os.environ.get("ALLOWED_ORIGINS"))
    CORS(
        app,
        resources={r"/api/*": {"origins": allowed_origins}},
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Content-Type"],
        max_age=3600,
    )

    @app.before_request
    def _enforce_origin_on_write():
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            # Browsers send Origin for CORS/XHR; allow empty Origin for curl/internal
            origin = request.headers.get("Origin", "")
            if origin and origin not in allowed_origins:
                abort(403)
    app.register_blueprint(api_bp)

    install_api_request_logging(app, api_logger)

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
    app.run(host="0.0.0.0", port=int(os.getenv("APP_PORT", "9001")), debug=os.getenv("FLASK_ENV") != "production")
