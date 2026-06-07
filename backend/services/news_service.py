from psycopg.rows import dict_row
from utils.connect_db import pool
from utils.http import err


def fetch_news():
    """Fetch the latest news posts (newest first, capped at 3)."""
    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT title, body, publish_date
                FROM vw_news
                """
            )
            rows = cur.fetchall()

        return {"news": rows}, 200

    except Exception:
        return err("db_error", "Could not fetch news post!", 500)
