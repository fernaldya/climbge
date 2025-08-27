# backend/app/logging_config.py
import logging, os, sys, time
from logging.handlers import TimedRotatingFileHandler
from typing import Optional
from flask import Flask, g, request

def setup_logging(
    name: str,
    log_file_path: str,
    level: int = logging.INFO,
    when: str = "midnight",
    backup_count: int = 7,
) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(level)

    fmt = logging.Formatter(
        "%(asctime)s [%(name)s] [%(levelname)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    if log_file_path:
        os.makedirs(os.path.dirname(log_file_path), exist_ok=True)

    if not logger.handlers:
        # File (daily rotation)
        fh = TimedRotatingFileHandler(
            log_file_path, when=when, interval=1,
            backupCount=backup_count, encoding="utf-8"
        )
        fh.setFormatter(fmt)
        logger.addHandler(fh)

        # Stdout
        sh = logging.StreamHandler(sys.stdout)
        sh.setFormatter(fmt)
        logger.addHandler(sh)

    # quiet some noisy libs if needed
    logging.getLogger("werkzeug").setLevel(os.getenv("NOISY_LOG_LEVEL", "WARNING"))
    logging.getLogger("urllib3").setLevel(os.getenv("NOISY_LOG_LEVEL", "WARNING"))
    return logger

def install_api_request_logging(app: Flask, logger: logging.Logger) -> None:
    """Attach before/after request hooks to log each API call."""
    @app.before_request
    def _start_timer():
        # skip static or health if you want:
        # if request.path.startswith("/static"): return
        g._req_start = time.perf_counter()

    @app.after_request
    def _log_request(resp):
        start: Optional[float] = getattr(g, "_req_start", None)
        dur_ms = (time.perf_counter() - start) * 1000 if start else None

        # If you attach user info during auth, set g.user_id there.
        user_id = getattr(g, "user_id", "-")

        # Prefer CF-Connecting-IP/X-Forwarded-For behind proxies
        ip = (
            request.headers.get("CF-Connecting-IP")
            or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or request.remote_addr
        )

        logger.info(
            "%s %s user=%s status=%s duration=%.1fms ip=%s",
            request.method,
            request.path,
            user_id,
            resp.status_code,
            dur_ms if dur_ms is not None else -1,
            ip,
        )
        return resp

    @app.errorhandler(Exception)
    def _on_error(e):
        # Avoid logging sensitive payloads; keep stack trace.
        logger.exception("unhandled_exception path=%s method=%s", request.path, request.method)
        return {"error": "internal_server_error"}, 500
