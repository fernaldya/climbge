import os
from psycopg_pool import ConnectionPool
import logging

DB_USER = os.getenv("db_user")
DB_PASS = os.getenv("db_pass")
DB_HOST = os.getenv("db_host")
DB_PORT = os.getenv("db_port", "5432")
DB_NAME = os.getenv("db_name", "postgres")

dsn = f"postgresql://{DB_USER}:{DB_PASS}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

pool = ConnectionPool(
    conninfo=dsn,
    min_size=1,
    max_size=10,
    kwargs={"autocommit": True},
)
