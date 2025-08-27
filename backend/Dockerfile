FROM python:3.12.0-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_PYTHON_PREFERENCE=system

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates libpq5 build-essential gcc libpq-dev \
 && rm -rf /var/lib/apt/lists/*


RUN curl -LsSf https://astral.sh/uv/install.sh | sh

WORKDIR /app

COPY pyproject.toml uv.lock* ./

RUN /root/.local/bin/uv sync --frozen --no-dev

RUN apt-get purge -y build-essential gcc libpq-dev \
 && apt-get autoremove -y \
 && rm -rf /var/lib/apt/lists/*

RUN useradd -m appuser

COPY --chown=appuser:appuser backend/ /app/climbge

ENV PATH="/app/.venv/bin:${PATH}"

USER appuser

EXPOSE 9001

WORKDIR /app/climbge