LABEL authors="fernaldya"
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 \
    UV_LINK_MODE=copy UV_PROJECT_ENVIRONMENT=/app/.venv \
    PATH="/app/.venv/bin:/root/.local/bin:${PATH}"

RUN apt-get update -y && apt-get install -y --no-install-recommends \
      curl ca-certificates libpq5 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# copy ONLY lockfiles first (best cache)
COPY pyproject.toml uv.lock* ./
RUN curl -LsSf https://astral.sh/uv/install.sh | sh -s -- -y \
 && uv sync --frozen --no-dev

# now copy backend code
COPY backend/ /app/backend/

RUN useradd --create-home --uid 10001 appuser && chown -R appuser:appuser /app
USER appuser

WORKDIR /app/backend
EXPOSE 9001
HEALTHCHECK --interval=30s --timeout=3s --retries=5 CMD \
  curl -fsS "http://127.0.0.1:${APP_PORT:-9001}/api/healthz" || exit 1

