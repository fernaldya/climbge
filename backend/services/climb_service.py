from typing import Any, Dict, List, Optional
import logging
from psycopg.rows import dict_row
from utils.connect_db import pool
from utils.parse_timestamp import parse_ts
from collections import defaultdict

logger = logging.getLogger("climbge-api")


# ---------- Grade Systems ----------
UNKNOWN_GRADE_SYSTEM_ID = 999

def fetch_grades() -> List[Dict[str, Any]]:
    """
    Fetch grade systems.

    Returns JSON-friendly list:
    [
      {
        "gradeId": 1,
        "gradeSystem": "Boulder Planet",
        "grades": ["WILD", "1", "2", ...]
      }
    ]
    """
    with pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            SELECT grade_id, grade_system, grades
            FROM grade_systems
            WHERE grade_id != 999 AND status = 'active'
            ORDER BY grade_id
            """
        )
        rows = cur.fetchall()

    return [
        {
            "gradeId": r["grade_id"],
            "gradeSystem": r["grade_system"],
            "grades": r["grades"],
        }
        for r in rows
    ]


# ---------- Sessions ----------

def insert_session(
    cur,
    *,
    user_id: str,
    started_at: str,
    ended_at: str,
    notes: Optional[str],
    location: Optional[str]
) -> str:
    """
    Insert a climb_sessions row and return session_id (uuid as string).
    started_at and ended_at are FE-provided ISO strings and are parsed here.
    """
    started_dt = parse_ts(started_at)
    ended_dt = parse_ts(ended_at)

    if ended_dt < started_dt:
        raise ValueError("ended_at is before started_at")

    cur.execute(
        """
        INSERT INTO climb_sessions (user_id, started_at, ended_at, notes, location)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING session_id
        """,
        (user_id, started_dt, ended_dt, notes, location),
    )
    row = cur.fetchone()
    return str(row["session_id"])


def insert_session_routes(cur, *, session_id: str, routes: List[Dict[str, Any]]) -> None:
    """
    Insert route rows for a session using batch inserts.

    Each route dict must contain:
      - grade_system: int
      - grade_system_label (For "Other" grade system) [Optional]
      - grade_label: str
      - attempts: int
      - sent: bool
      - sent_at: datetime (ISO string)
    """
    if not routes:
        return

    # (1) Prepare session_routes
    sql_session_routes = """
        INSERT INTO session_routes (
            session_id, grade_system, grade_label, attempts, sent, sent_at, description
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """

    session_routes_data = []
    unknown_grade_entries = set()

    for r in routes:
        gs_id = r.get("grade_system", 999)

        grade_label = (r.get("grade_label") or "").strip()
        if not grade_label:
            continue

        try:
            attempts = max(int(r.get("attempts", 0)), 0)
        except (TypeError, ValueError):
            attempts = 0
        if attempts == 0:
            continue

        sent = bool(r.get("sent"))
        sent_raw = r.get('sent_at')
        sent_dt = parse_ts(sent_raw) if sent_raw else None
        description = r.get('description')

        session_routes_data.append((
            session_id, gs_id, grade_label, attempts, sent, sent_dt, description
        ))

        # (2) Collect unknown grade systems
        if gs_id == UNKNOWN_GRADE_SYSTEM_ID:
            unknown_label = (r.get("grade_system_label") or "Other").strip()
            unknown_grade_entries.add((unknown_label, grade_label))

    # Insert session_routes
    if session_routes_data:
        cur.executemany(sql_session_routes, session_routes_data)

    # (3) Insert unknown grade systems
    if unknown_grade_entries:
        sql_unknown = """
            INSERT INTO unknown_grade_systems (grade_id, grade_system, grades)
            VALUES (%s, %s, %s)
        """
        unknown_data = [
            (UNKNOWN_GRADE_SYSTEM_ID, label, grade)
            for label, grade in unknown_grade_entries
        ]
        cur.executemany(sql_unknown, unknown_data)



def commit_session_service(user_id: str, payload: dict):
    """
    Persist a session and its routes.

    Expects payload:
    {
      "session": {
        "started_at": ISO,
        "ended_at": ISO,
        "notes": str?
      },
      "routes": [
        {
          "grade_system": int | "custom" | "" | null,  # FE should send int; 999 for Other
          "grade_system_label"?: str,                  # required if grade_system == 999
          "grade_label": str,
          "description"?: str,
          "attempts": int,
          "sent": bool,
          "sent_at"?: ISO
        },
        ...
      ]
    }
    """
    sess = payload.get("session") or {}
    routes = payload.get("routes") or []

    started_at = sess.get("started_at")
    ended_at = sess.get("ended_at")
    sess_notes = sess.get("notes")
    sess_location = sess.get("location")

    if not started_at or not ended_at:
        return {"error": "Missing session start or end time"}, 400

    if sess_notes is not None and not isinstance(sess_notes, str):
        return {"error": "Session notes must be text"}, 400

    # A blank textarea sends "" rather than omitting the key; store NULL for it
    # so "no notes" is one value in the column instead of two.
    sess_notes = (sess_notes or "").strip() or None

    try:
        with pool.connection() as conn, conn.transaction():
            with conn.cursor(row_factory=dict_row) as cur:
                session_id = insert_session(
                    cur,
                    user_id=user_id,
                    started_at=started_at,
                    ended_at=ended_at,
                    notes=sess_notes,
                    location=sess_location,
                )
                insert_session_routes(cur, session_id=session_id, routes=routes)

        logger.info(
            "climb_session committed user_id=%s session_id=%s routes=%s location=%s",
            user_id,
            session_id,
            len(routes),
            sess_location or "-",
        )
        return {"ok": True, "session_id": session_id}, 200

    except ValueError as e:
        return {"error": str(e)}, 400

    except Exception:
        logger.exception("climb_session failed user_id=%s routes=%s", user_id, len(routes))
        return {"error": "Something happened while trying to save the session."}, 500


# --------- Climb Locations ---------
def fetch_climb_locations() -> List[Dict[str, Any]]:
    """
    Fetch climb locations.

    Returns JSON-friendly list:
    [
      {
        "Indonesia": {
            "Jakarta": [
                {"gymName": "Alpine Outpost Indonesia", "gymGradeSystem": 3},
                {"gymName": "Indoclimb Kemang", "gymGradeSystem": None}
            ],
            "Alam Sutera": [
                {"gymName": "Dreamstone Alam Sutera", "gymGradeSystem": None}
            ]
        }
      }
    ]
    """
    with pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            select country, location, gym_name, gym_grade_system
            from climbing_locations
            where status = 'active'
            order by country, location, gym_chain asc, gym_name asc
            """
        )
        rows = cur.fetchall()

    grouped = defaultdict(lambda: defaultdict(list))

    for row in rows:
        grouped[row["country"]][row["location"]].append({
            "gymName": row["gym_name"],
            "gymGradeSystem": row["gym_grade_system"],
        })

    result = [{k: v} for k, v in grouped.items()]

    return result
