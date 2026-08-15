import logging
from psycopg.rows import dict_row
from utils.connect_db import pool
from utils.relative_day import get_relative_day

logger = logging.getLogger("climbge-api")


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
                       climb_date, location
                FROM climber_session_history
                WHERE user_id = %s
                ORDER BY climb_date desc, session_seq desc
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
                "climbDay": get_relative_day(r["climb_date"], week_cap=3),
                "location": r["location"]
            } for r in row
        ]
        return {'history': history}, 200

    except Exception:
        logger.exception("history fetch failed user_id=%s", user_id)
        return {"error": {"code": "db_error", "message": "Could not fetch history!"}}, 500


def fetch_last_climb(user_id: str):
    """
    Fetches the last climbing session for a user.

    Returns the stats of the last climb session.
    """
    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select location, climb_date, best, sent, attempted
                from last_climb_session
                where user_id = %s
                limit 1
                """,
                (user_id,)
            )
            row = cur.fetchone()
        if not row:
            last_climb = {
                "location": None,
                "climbDate": None,
                "highestGrade": None,
                "totalSent": None,
                "totalAttempted": None,
            }
            return last_climb, 200

        last_climb = {
            "location": row["location"],
            "climbDate": row["climb_date"].strftime("%Y-%m-%d"),
            "highestGrade": row["best"],
            "totalSent": row["sent"],
            "totalAttempted": row["attempted"]
        }
        return last_climb, 200

    except Exception:
        logger.exception("last_climb fetch failed user_id=%s", user_id)
        return {"error": {"code": "db_error", "message": "Could not fetch last climb data!"}}, 500

def fetch_weekly_stats(user_id: str):
    """
    Fetches the weekly stats for a user.

    Returns the weekly total of sends, attempts, and highest grade for the running week.
    """
    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                select total_session, sent, attempted
                from weekly_stats
                where user_id = %s
                limit 1
                """,
                (user_id,)
            )
            row = cur.fetchone()
        if not row:
            weekly_stats = {
                "totalSession": None,
                "totalSent": None,
                "totalAttempted": None,
            }
            return weekly_stats, 200

        weekly_stats = {
            "totalSession": row["total_session"],
            "totalSent": row["sent"],
            "totalAttempted": row["attempted"]
        }
        return weekly_stats, 200

    except Exception:
        logger.exception("weekly_stats fetch failed user_id=%s", user_id)
        return {"error": {"code": "db_error", "message": "Could not fetch weekly climb statistics!"}}, 500


def fetch_outdoor_climbs(user_id: str):
    """
    Fetches the outdoor climbs for a user.
    Returns two lists of dictionaries of sent and projected climbs.
    """
    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT user_id, grade_system, grade_label, route_name, description, location, attempts, sent, sent_at::date, climb_date
                FROM outdoor_climb_history
                WHERE user_id = %s
                """,
                (user_id,)
            )
            row = cur.fetchall()
        if not row:
            sent_climbs = []
            projected_climbs = []
            outdoor_climbs = {'sent': sent_climbs, 'project': projected_climbs}
            return outdoor_climbs, 200

        outdoor_climbs = {}
        sent_climbs = [
            {
                "user_id": r["user_id"],
                "gradeSystem": r["grade_system"],
                "gradeLabel": r["grade_label"],
                "routeName": r["route_name"],
                "description": r["description"],
                "location": r["location"],
                "attempts": r["attempts"],
                "sent": r["sent"],
                "sentAt": r["sent_at"].strftime("%Y-%m-%d"),
                "climbDate": r["first_climb_date"].strftime("%Y-%m-%d")
            } for r in row if r["sent"] is not None
        ]
        projected_climbs = [
            {
                "user_id": r["user_id"],
                "gradeSystem": r["grade_system"],
                "gradeLabel": r["grade_label"],
                "routeName": r["route_name"],
                "description": r["description"],
                "location": r["location"],
                "attempts": r["attempts"],
                "firstClimbDate": r["first_climb_date"].strftime("%Y-%m-%d")
            } for r in row if r["sent"] is None
        ]
        outdoor_climbs = {'sent': sent_climbs, 'totalSent': len(sent_climbs), 'project': projected_climbs, 'totalProject': len(projected_climbs)}
        return outdoor_climbs, 200

    except Exception:
        logger.exception("outdoor_climbs fetch failed user_id=%s", user_id)
        return {"error": {"code": "db_error", "message": "Could not fetch outdoor climbs!"}}, 500
