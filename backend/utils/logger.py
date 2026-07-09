# backend/app/logging_config.py
import logging
import os
import sys
import time
from typing import Optional
from flask import Flask, g, request, session

def setup_logging(
    name: str,
    level: int = logging.INFO,
) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(level)

    fmt = logging.Formatter(
        "%(asctime)s [%(name)s] [%(levelname)s]: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    if not logger.handlers:
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

        user_id = getattr(g, "user_id", None) or session.get("user_id", "-")

        # Prefer CF-Connecting-IP/X-Forwarded-For behind proxies
        ip = (
            request.headers.get("CF-Connecting-IP")
            or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
            or request.remote_addr
        )

        log = logger.error if resp.status_code >= 500 else logger.info

        log(
            "%s %s user=%s status=%s duration=%.1fms ip=%s",
            request.method,
            request.path,
            user_id,
            resp.status_code,
            dur_ms if dur_ms is not None else -1,
            ip,
        )
        return resp
