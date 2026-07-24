import os
from psycopg.conninfo import make_conninfo
from psycopg_pool import ConnectionPool


def required_env(name: str) -> str:
    value = os.getenv(name)
    if value is None or value == "":
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


DB_USER = required_env("DB_USER")
DB_PASS = required_env("DB_PASS")
DB_HOST = required_env("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "postgres")

dsn = make_conninfo(
    "",
    user=DB_USER,
    password=DB_PASS,
    host=DB_HOST,
    port=DB_PORT,
    dbname=DB_NAME,
)

pool = ConnectionPool(
    conninfo=dsn,
    min_size=1,
    max_size=10,
    kwargs={"autocommit": True},
)
