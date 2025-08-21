from typing import Any, Dict, List, Optional
from psycopg.rows import dict_row
from utils.connect_db import pool
from utils.parse_timestamp import parse_ts


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
        INSERT INTO climb_sessions (user_id, started_at, ended_at, notes)
        VALUES (%s, %s, %s, %s)
        RETURNING session_id
        """,
        (user_id, started_dt, ended_dt, notes),
    )
    row = cur.fetchone()
    return str(row["session_id"])


def insert_session_routes(cur, *, session_id: str, routes: List[Dict[str, Any]]) -> None:
    """
    Insert route rows for a session.

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

    sql_session_routes = """
        INSERT INTO session_routes (
            session_id, grade_system, grade_label, attempts, sent, sent_at
        )
        VALUES (%s, %s, %s, %s, %s, %s)
    """

    sql_unknown = """
        INSERT INTO unknown_grade_systems (grade_id, grade_system, grades)
        VALUES (%s, %s, %s)
    """

    for r in routes:
        gs_id = r.get("grade_system", 999)

        grade_label = (r.get("grade_label") or "").strip()
        if not grade_label:
            continue

        attempts = max(r.get("attempts"), 1)

        sent = bool(r.get("sent"))
        sent_raw = r.get('sent_at')
        sent_dt = parse_ts(sent_raw) if sent_raw else None

        # (1) Always insert into session_routes
        cur.execute(
            sql_session_routes,
            (session_id, gs_id, grade_label, attempts, sent, sent_dt),
        )

        # (2) If “Other”, also log to unknown_grade_systems
        if gs_id == UNKNOWN_GRADE_SYSTEM_ID:
            unknown_label = (r.get("grade_system_label") or "Other").strip()
            cur.execute(
                sql_unknown,
                (UNKNOWN_GRADE_SYSTEM_ID, unknown_label, grade_label),
            )


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

    if not started_at or not ended_at:
        return {"error": "Missing session start or end time"}, 400

    try:
        with pool.connection() as conn, conn.transaction():
            with conn.cursor(row_factory=dict_row) as cur:
                session_id = insert_session(
                    cur,
                    user_id=user_id,
                    started_at=started_at,
                    ended_at=ended_at,
                    notes=sess_notes,
                )
                insert_session_routes(cur, session_id=session_id, routes=routes)

        return {"ok": True, "session_id": session_id}, 200

    except ValueError as e:
        return {"error": str(e)}, 400

    except Exception:
        # TODO: add logging here for visibility
        return {"error": "Something happened while trying to save the session."}, 500
