import os
from psycopg_pool import ConnectionPool
from urllib.parse import quote_plus

DB_USER = os.getenv("DB_USER")
DB_PASS = quote_plus(os.getenv("DB_PASS"))
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "postgres")

dsn = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

pool = ConnectionPool(
    conninfo=dsn,
    min_size=1,
    max_size=10,
    kwargs={"autocommit": True},
)
