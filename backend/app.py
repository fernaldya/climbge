import logging
import os
from dotenv import load_dotenv
env_file = os.environ.get('ENV_DIR', '.env')
if os.path.exists(env_file):
    load_dotenv(env_file)

from flask import Flask, jsonify, request, abort  # noqa: E402
from werkzeug.exceptions import HTTPException  # noqa: E402
from flasgger import Swagger  # noqa: E402
from routes import api_bp  # noqa: E402
from werkzeug.middleware.proxy_fix import ProxyFix  # noqa: E402
from flask_cors import CORS  # noqa: E402
from utils.logger import setup_logging, install_api_request_logging  # noqa: E402


def parse_origins(envval: str) -> list[str]:
    return [o.strip() for o in (envval or "").split(",") if o.strip()]


def env_flag(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in ("1", "true", "yes", "on")


api_logger = setup_logging('climbge-api')

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
                api_logger.warning(
                    "blocked_origin method=%s path=%s origin=%s",
                    request.method,
                    request.path,
                    origin,
                )
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
        api_logger.exception("unhandled_exception path=%s method=%s", request.path, request.method)
        return jsonify(error={"code": "server_error", "message": "Something went wrong."}), 500

    return app

if os.getenv("FLASK_ENV") == "production":
    import sentry_sdk
    from sentry_sdk.integrations.logging import LoggingIntegration

    sentry_sdk.init(
        dsn=os.getenv("SENTRY_DSN"),
        integrations=[
            LoggingIntegration(
                level=logging.INFO,       # attach info+ logs as breadcrumbs
                event_level=logging.ERROR, # send error+ logs as Sentry events
            ),
        ],
        send_default_pii=env_flag("SENTRY_SEND_DEFAULT_PII", True),
        enable_logs=env_flag("SENTRY_ENABLE_LOGS", False),
    )


app = create_app()
if os.getenv("FLASK_ENV") == "development":
    Swagger(app)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("APP_PORT", "9001")), debug=os.getenv("FLASK_ENV") != "production")
