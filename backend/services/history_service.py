from psycopg.rows import dict_row
from utils.connect_db import pool
from utils.relative_day import get_relative_day


def fetch_climb_history(user_id: str):
    """
    Fetches the climbing history for a user.
    Returns a list of dictionaries with session details.
    """
    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT sent, attempted, flashes, best,
                       TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM
                       TO_CHAR((sent / NULLIF(attempted, 0)::float) * 100, 'FM999D99'))) AS sent_pct,
                       climb_date
                FROM climber_session_history
                WHERE user_id = %s
                ORDER BY id
                """,
                (user_id,)
            )
            row = cur.fetchall()

        history = [
            {
                "sent": r["sent"] if r["sent"] is not None else 0,
                "attempted": r["attempted"] if r["attempted"] is not None else '-',
                "flashes": r["flashes"] if r["flashes"] is not None else 0,
                "best": r["best"] if r["best"] is not None else '-',
                "sentPct": f'{r["sent_pct"]}%' if r["sent_pct"] else '0%',
                "climbDay": get_relative_day(r["climb_date"], week_cap=3)
            } for r in row
        ]
        return {'history': history}, 200

    except Exception as e:
        return {"error": {"code": "db_error", "message": f"Could not fetch history, error: {e}"}}, 500
