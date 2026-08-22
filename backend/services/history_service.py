import logging
from uuid import UUID
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
                SELECT h.session_id, h.grade_id, g.grade_system AS grade_system_label,
                       h.sent, h.attempted, h.flashes, h.best,
                       TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM
                       TO_CHAR((h.sent / NULLIF(h.attempted, 0)::float) * 100, 'FM999D99'))) AS sent_pct,
                       h.climb_date, h.location
                FROM climber_session_history h
                LEFT JOIN grade_systems g ON g.grade_id = h.grade_id
                WHERE h.user_id = %s
                ORDER BY h.climb_date desc, h.session_seq desc
                """,
                (user_id,)
            )
            row = cur.fetchall()

        history = [
            {
                "sessionId": str(r["session_id"]),
                "gradeSystem": r["grade_id"],
                "gradeSystemLabel": r["grade_system_label"],
                "sent": r["sent"] if r["sent"] is not None else 0,
                "attempted": r["attempted"] if r["attempted"] is not None else '-',
                "flashes": r["flashes"] if r["flashes"] is not None else 0,
                "best": r["best"] if r["best"] is not None else '-',
                "sentPct": f'{r["sent_pct"]}%' if r["sent_pct"] else '0%',
                "climbDate": r["climb_date"].strftime("%Y-%m-%d"),
                "climbDay": get_relative_day(r["climb_date"], week_cap=3),
                "location": r["location"]
            } for r in row
        ]
        return {'history': history}, 200

    except Exception:
        logger.exception("history fetch failed user_id=%s", user_id)
        return {"error": {"code": "db_error", "message": "Could not fetch history!"}}, 500


def fetch_session_detail(user_id: str, session_id: str, grade_system):
    """
    Fetches the routes behind a single history card.

    A card is a (session, grade system) pair, so routes are filtered to that
    system and the totals here match the card that was tapped.

    Ownership is enforced in the WHERE clause: somebody else's session is
    indistinguishable from one that does not exist. Sessions logged against the
    unknown grade system are excluded by the view, so they 404 here.
    """
    try:
        session_uuid = UUID(str(session_id))
        grade_system_id = int(grade_system)
    except (ValueError, AttributeError, TypeError):
        return {"error": {"code": "not_found", "message": "Session not found!"}}, 404

    params = {
        "user_id": user_id,
        "session_id": session_uuid,
        "grade_system": grade_system_id,
    }

    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            # The card itself is the existence check: no summary row means either
            # the session isn't this user's, or it never made it into the view.
            cur.execute(
                """
                SELECT climb_date, location, session_notes,
                       sent, attempted, flashes, best,
                       TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM
                       TO_CHAR((sent / NULLIF(attempted, 0)::float) * 100, 'FM999D99'))) AS sent_pct
                FROM climber_session_history
                WHERE user_id    = %(user_id)s
                  AND session_id = %(session_id)s
                  AND grade_id   = %(grade_system)s
                """,
                params
            )
            head = cur.fetchone()

            if not head:
                return {"error": {"code": "not_found", "message": "Session not found!"}}, 404

            cur.execute(
                """
                SELECT route_id, grade_label, description, attempts, sent, flash
                FROM vw_climber_detail_session_history
                WHERE user_id      = %(user_id)s
                  AND session_id   = %(session_id)s
                  AND grade_system = %(grade_system)s
                ORDER BY difficulty_order DESC NULLS LAST, attempts DESC, grade_label ASC
                """,
                params
            )
            rows = cur.fetchall()

        routes = [
            {
                "routeId": str(r["route_id"]),
                "gradeLabel": r["grade_label"],
                "attempts": r["attempts"] or 0,
                "sent": bool(r["sent"]),
                "flash": bool(r["flash"]),
                "description": r["description"],
            } for r in rows
        ]

        # Totals come from the same row the card was rendered from, so the two
        # can never disagree — they aren't recounted from the routes.
        sent_count = head["sent"] or 0
        attempted = head["attempted"] or 0
        climb_date = head["climb_date"]

        detail = {
            "sessionId": str(session_uuid),
            "gradeSystem": grade_system_id,
            "climbDate": climb_date.strftime("%Y-%m-%d") if climb_date else None,
            "climbDay": get_relative_day(climb_date, week_cap=3) if climb_date else None,
            "location": head["location"],
            "notes": head["session_notes"],
            "sent": sent_count,
            "attempted": attempted,
            "flashes": head["flashes"] or 0,
            "best": head["best"],
            "sentPct": f'{head["sent_pct"]}%' if head["sent_pct"] else '0%',
            "routes": routes,
        }
        return detail, 200

    except Exception:
        logger.exception(
            "session_detail fetch failed user_id=%s session_id=%s grade_system=%s",
            user_id, session_id, grade_system
        )
        return {"error": {"code": "db_error", "message": "Could not fetch session details!"}}, 500


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
