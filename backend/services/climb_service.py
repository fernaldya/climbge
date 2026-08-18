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
            "Jakarta": ["Alpine Outpost Indonesia", "Indoclimb Kemang"],
            "Alam Sutera": ["Dreamstone Alam Sutera"]
        }
      }
    ]
    """
    with pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            select country, location, array_agg(gym_name order by gym_chain asc, gym_name asc) as gyms
            from climbing_locations
            where status = 'active'
            group by country, location
            """
        )
        rows = cur.fetchall()

    grouped = defaultdict(dict)

    for row in rows:
        grouped[row["country"]][row["location"]] = list(row["gyms"])

    result = [{k: v} for k, v in grouped.items()]

    return result

# ------------ Outdoor ------------------
def fetch_outdoor_climbs(user_id: str):
    """
    Fetches the outdoor climbs for a user.
    Returns a list of all outdoor climbs (both sent and projecting).
    """
    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT user_id, route_id, grade_system, grade_label, route_name, description,
                       location, attempts, sent, sent_at, first_climb_date
                FROM vw_outdoor_climb
                WHERE user_id = %s
                    AND is_deleted IS FALSE
                ORDER BY first_climb_date DESC, route_seq DESC
                """,
                (user_id,)
            )
            rows = cur.fetchall()

        outdoor_climbs = [
            {
                "user_id": r["user_id"],
                "route_id": r["route_id"],
                "grade_system": r["grade_system"],
                "grade_label": r["grade_label"],
                "route_name": r["route_name"],
                "description": r["description"],
                "location": r["location"],
                "attempts": r["attempts"],
                "is_sent": r["sent"],
                "sent_at": r["sent_at"].strftime("%Y-%m-%d") if r["sent_at"] else None,
                "first_climb_date": r["first_climb_date"].strftime("%Y-%m-%d"),
                "route_seq": r["route_seq"]
            } for r in rows
        ]
        return outdoor_climbs, 200

    except Exception:
        logger.exception("outdoor_climbs fetch failed user_id=%s", user_id)
        return {"error": {"code": "db_error", "message": "Could not fetch outdoor climbs!"}}, 500


def edit_outdoor_climb(user_id: str, route_id: str, is_sent: bool, attempts: int = None,
                       first_climb_date: str = None, sent_at: str = None):
    """
    Edits an outdoor climb route.
    For active projects (is_sent=False): can edit attempts and first_climb_date
    For sent routes (is_sent=True): can edit first_climb_date and sent_at only
    Commits changes immediately to the database.

    Args:
        user_id: The user's UUID
        route_id: The route's UUID
        is_sent: Current sent status of the route
        attempts: New attempt count (only for active projects)
        first_climb_date: New start date
        sent_at: New send date (only for sent routes)
    """
    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            # Build update query based on what's being edited
            updates = []
            params = []
            param_idx = 1

            if first_climb_date is not None:
                updates.append("first_climb_date = %s")
                params.append(first_climb_date)
                param_idx += 1

            if is_sent:
                # Sent routes: can only edit first_climb_date and sent_at
                if sent_at is not None:
                    updates.append("sent_at = %s")
                    params.append(sent_at)
                    param_idx += 1
            else:
                # Active projects: can edit attempts and first_climb_date
                if attempts is not None:
                    updates.append("attempts = %s")
                    params.append(attempts)
                    param_idx += 1

            if not updates:
                return {"ok": True, "message": "No changes to apply"}, 200

            params.extend([user_id, route_id])

            query = f"""
                UPDATE outdoor_climbs
                SET {', '.join(updates)}
                WHERE user_id = %s AND route_id = %s
                AND is_deleted IS FALSE
                RETURNING *
            """

            cur.execute(query, params)
            updated_row = cur.fetchone()

            if not updated_row:
                return {"ok": False, "error": "Route not found or already deleted"}, 404

            conn.commit()

            return {
                "ok": True,
                "route": {
                    "user_id": updated_row["user_id"],
                    "route_id": updated_row["route_id"],
                    "grade_system": updated_row["grade_system"],
                    "grade_label": updated_row["grade_label"],
                    "route_name": updated_row["route_name"],
                    "description": updated_row["description"],
                    "location": updated_row["location"],
                    "attempts": updated_row["attempts"],
                    "is_sent": updated_row["sent"],
                    "sent_at": updated_row["sent_at"].strftime("%Y-%m-%d") if updated_row["sent_at"] else None,
                    "first_climb_date": updated_row["first_climb_date"].strftime("%Y-%m-%d")
                }
            }, 200

    except Exception as e:
        logger.exception("edit_outdoor_climb failed user_id=%s route_id=%s: %s", user_id, route_id, str(e))
        return {"ok": False, "error": "Failed to edit outdoor climb"}, 500


def delete_outdoor_climb(user_id: str, route_id: str):
    """
    Soft deletes an outdoor climb route by setting is_deleted to True.
    Uses the primary key (user_id, route_id) to identify the route.
    Does NOT actually delete from the database.

    Args:
        user_id: The user's UUID
        route_id: The route's UUID
    """
    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                UPDATE outdoor_climbs
                SET is_deleted = TRUE, deleted_at = NOW()
                WHERE user_id = %s AND route_id = %s
                AND is_deleted IS FALSE
                RETURNING *
                """,
                (user_id, route_id)
            )

            deleted_row = cur.fetchone()

            if not deleted_row:
                return {"ok": False, "error": "Route not found or already deleted"}, 404

            conn.commit()

            return {
                "ok": True,
                "message": "Route marked as deleted",
                "route_id": route_id
            }, 200

    except Exception as e:
        logger.exception("delete_outdoor_climb failed user_id=%s route_id=%s: %s", user_id, route_id, str(e))
        return {"ok": False, "error": "Failed to delete outdoor climb"}, 500


def create_outdoor_climb(user_id: str, route_name: str, location: str, grade_system: int,
                         grade_label: str, description: str = None, attempts: int = 0,
                         sent: bool = False, sent_at: str = None, first_climb_date: str = None):
    """
    Creates a new outdoor climb route in the database.

    Args:
        user_id: The user's UUID
        route_name: Name of the route
        location: Location of the route
        grade_system: Grade system ID
        grade_label: Grade label (e.g., "5.12d")
        description: Optional description
        attempts: Number of attempts (default 0)
        sent: Whether the route has been sent (default False)
        sent_at: Date when route was sent (YYYY-MM-DD format)
        first_climb_date: First climb date (YYYY-MM-DD format)
    """
    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO outdoor_climbs (user_id, route_id, grade_system, grade_label, route_name, description, location, attempts, sent, sent_at, first_climb_date)
                VALUES (%s, gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (user_id, grade_system, grade_label, route_name, description, location, attempts, sent, sent_at, first_climb_date)
            )

            new_row = cur.fetchone()

            if not new_row:
                return {"ok": False, "error": "Failed to create route"}, 500

            conn.commit()

            return {
                "ok": True,
                "route": {
                    "user_id": new_row["user_id"],
                    "route_id": new_row["route_id"],
                    "grade_system": new_row["grade_system"],
                    "grade_label": new_row["grade_label"],
                    "route_name": new_row["route_name"],
                    "description": new_row["description"],
                    "location": new_row["location"],
                    "attempts": new_row["attempts"],
                    "is_sent": new_row["sent"],
                    "sent_at": new_row["sent_at"].strftime("%Y-%m-%d") if new_row["sent_at"] else None,
                    "first_climb_date": new_row["first_climb_date"].strftime("%Y-%m-%d")
                }
            }, 201

    except Exception as e:
        logger.exception("create_outdoor_climb failed user_id=%s: %s", user_id, str(e))
        return {"ok": False, "error": "Failed to create outdoor climb"}, 500
