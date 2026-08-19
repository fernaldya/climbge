from typing import Any, Dict, List, Optional
import logging
from datetime import date
from uuid import UUID
from psycopg.errors import IntegrityError
from psycopg.rows import dict_row
from utils.connect_db import pool
from utils.parse_timestamp import parse_ts, parse_date
from collections import defaultdict

logger = logging.getLogger("climbge-api")


# ---------- Grade Systems ----------
UNKNOWN_GRADE_SYSTEM_ID = 999

def fetch_grades(outdoor: bool=False) -> List[Dict[str, Any]]:
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
        cur.execute(f"""
            SELECT grade_id, grade_system, grades
            FROM grade_systems
            WHERE grade_id != 999 AND status = 'active' {'AND is_also_outdoor IS TRUE' if outdoor else ''}
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
# The API is the trust boundary, not the Add Project dialog: every field below is
# re-validated here so a hand-rolled request can't store oversized or malformed data.
OUTDOOR_TEXT_LIMITS = {
    "route_name": 100,
    "location": 100,
    "grade_label": 16,
    "grade_system_label": 32,
    "description": 500,
}
MAX_OUTDOOR_ATTEMPTS = 10_000
# Rows per multi-row INSERT. Postgres caps a statement at 65535 bound parameters, so
# oversized batches are split across several statements inside one transaction rather
# than being rejected -- the caller still gets all-or-nothing semantics.
OUTDOOR_INSERT_CHUNK = 100


def _clean_text(value: Any, field: str, *, required: bool = False) -> Optional[str]:
    """Trim a user-supplied string and enforce this field's length cap."""
    if value is None:
        if required:
            raise ValueError(f"{field} is required")
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field} must be text")
    cleaned = value.strip()
    if not cleaned:
        if required:
            raise ValueError(f"{field} is required")
        return None
    limit = OUTDOOR_TEXT_LIMITS[field]
    if len(cleaned) > limit:
        raise ValueError(f"{field} must be {limit} characters or fewer")
    return cleaned


def _coerce_int(value: Any, field: str, *, minimum: int, maximum: int) -> int:
    """Accept only real integers (bool is not an int here) within [minimum, maximum]."""
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{field} must be a whole number")
    if value < minimum or value > maximum:
        raise ValueError(f"{field} must be between {minimum} and {maximum}")
    return value


def _coerce_uuid(value: Any, field: str) -> UUID:
    """Reject malformed ids up front so they surface as 400s, not driver errors."""
    try:
        return UUID(str(value))
    except (AttributeError, TypeError, ValueError):
        raise ValueError(f"{field} is not a valid id") from None


def _check_batch(items: Any, label: str) -> Optional[tuple]:
    """
    Shared shape check for the batch endpoints. Returns an error response or None.
    There is deliberately no size limit: an oversized list is chunked, not rejected.
    """
    if not isinstance(items, list) or not items:
        return {"ok": False, "error": f"No {label} to save"}, 400
    if not all(isinstance(i, dict) for i in items):
        return {"ok": False, "error": f"Each entry in {label} must be an object"}, 400
    return None


def _chunks(items: List[Any], size: int):
    """Yield successive slices of `items`, at most `size` long."""
    for start in range(0, len(items), size):
        yield items[start:start + size]


def _serialize_outdoor_row(r: Dict[str, Any]) -> Dict[str, Any]:
    """Shape an outdoor_climbs / vw_outdoor_climb row into the JSON the FE expects."""
    return {
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
        "first_climb_date": r["first_climb_date"].strftime("%Y-%m-%d") if r["first_climb_date"] else None,
        "route_seq": r.get("route_seq"),
    }


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
                       location, attempts, sent, sent_at, first_climb_date, route_seq
                FROM vw_outdoor_climb
                WHERE user_id = %s
                ORDER BY first_climb_date DESC, route_seq DESC
                """,
                (user_id,)
            )
            rows = cur.fetchall()

        return [_serialize_outdoor_row(r) for r in rows], 200

    except Exception:
        logger.exception("outdoor_climbs fetch failed user_id=%s", user_id)
        return {"ok": False, "error": "Could not fetch outdoor climbs"}, 500


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
        route_id = _coerce_uuid(route_id, "route_id")

        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            # user_id in the predicate keeps a guessed route_id from deleting someone else's row.
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

            return {
                "ok": True,
                "message": "Route marked as deleted",
                "route_id": route_id
            }, 200

    except ValueError as e:
        return {"ok": False, "error": str(e)}, 400

    except Exception as e:
        logger.exception("delete_outdoor_climb failed user_id=%s route_id=%s: %s", user_id, route_id, str(e))
        return {"ok": False, "error": "Failed to delete outdoor climb"}, 500


def _prepare_new_route(raw: Dict[str, Any], index: int) -> Dict[str, Any]:
    """
    Validate and normalise one incoming route. Raises ValueError naming the offending
    entry so the client can tell which of a batch was rejected.
    """
    try:
        route = {
            "route_name": _clean_text(raw.get("route_name"), "route_name", required=True),
            "location": _clean_text(raw.get("location"), "location", required=True),
            "grade_label": _clean_text(raw.get("grade_label"), "grade_label", required=True),
            "grade_system_label": _clean_text(raw.get("grade_system_label"), "grade_system_label"),
            "description": _clean_text(raw.get("description"), "description"),
            "grade_system": _coerce_int(
                raw.get("grade_system"), "grade_system", minimum=1, maximum=UNKNOWN_GRADE_SYSTEM_ID
            ),
            "attempts": _coerce_int(
                raw.get("attempts") or 0, "attempts", minimum=0, maximum=MAX_OUTDOOR_ATTEMPTS
            ),
        }

        started = parse_date(raw.get("first_climb_date")) or date.today()
        sent = bool(raw.get("sent"))
        sent_at = parse_date(raw.get("sent_at"))

        if sent:
            # A sent route always has a send date and at least one attempt.
            sent_at = sent_at or started
            route["attempts"] = max(route["attempts"], 1)
        else:
            sent_at = None

        if sent_at and sent_at < started:
            raise ValueError("sent date cannot be earlier than the start date")

        route.update(sent=sent, sent_at=sent_at, first_climb_date=started)
        return route

    except ValueError as e:
        raise ValueError(f"route {index + 1}: {e}") from None


def create_outdoor_climbs(user_id: str, routes: List[Dict[str, Any]]):
    """
    Creates outdoor climb routes in a single transaction: either every route in the
    batch is stored or none is, so a partial save can never leave the client guessing.

    Every route is validated before any SQL runs, and the insert is issued as multi-row
    statements of OUTDOOR_INSERT_CHUNK rows so an arbitrarily long batch stays within
    Postgres' per-statement parameter limit.

    Args:
        user_id: The user's UUID
        routes: List of route dicts (route_name, location, grade_system, grade_label,
                and optionally description, attempts, sent, sent_at, first_climb_date,
                grade_system_label)
    """
    invalid = _check_batch(routes, "routes")
    if invalid:
        return invalid

    try:
        prepared = [_prepare_new_route(raw, i) for i, raw in enumerate(routes)]
    except ValueError as e:
        return {"ok": False, "error": str(e)}, 400

    # Only the number of placeholder groups is interpolated -- every value is bound.
    row_placeholder = "(%s, gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, %s)"

    try:
        created: List[Dict[str, Any]] = []

        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            for chunk in _chunks(prepared, OUTDOOR_INSERT_CHUNK):
                params: List[Any] = []
                for r in chunk:
                    params.extend([
                        user_id, r["grade_system"], r["grade_label"], r["route_name"],
                        r["description"], r["location"], r["attempts"], r["sent"],
                        r["sent_at"], r["first_climb_date"],
                    ])

                cur.execute(
                    f"""
                    INSERT INTO outdoor_climbs (
                        user_id, route_id, grade_system, grade_label, route_name,
                        description, location, attempts, sent, sent_at, first_climb_date
                    )
                    VALUES {", ".join([row_placeholder] * len(chunk))}
                    RETURNING *
                    """,
                    params,
                )
                created.extend(cur.fetchall())

            # Same convention as insert_session_routes: record user-supplied systems so
            # they can be reviewed and promoted into grade_systems later.
            unknown = {
                (r["grade_system_label"] or "Other", r["grade_label"])
                for r in prepared
                if r["grade_system"] == UNKNOWN_GRADE_SYSTEM_ID
            }
            if unknown:
                cur.executemany(
                    """
                    INSERT INTO unknown_grade_systems (grade_id, grade_system, grades)
                    VALUES (%s, %s, %s)
                    """,
                    [(UNKNOWN_GRADE_SYSTEM_ID, label, grade) for label, grade in unknown],
                )

        logger.info("outdoor_climbs created user_id=%s count=%s", user_id, len(created))
        return {"ok": True, "routes": [_serialize_outdoor_row(r) for r in created]}, 201

    except IntegrityError:
        # Most likely an unknown grade_system id -- a bad request, not a server fault.
        logger.warning("create_outdoor_climbs rejected user_id=%s count=%s", user_id, len(prepared))
        return {"ok": False, "error": "One of the routes has an invalid grade system"}, 400

    except Exception:
        logger.exception("create_outdoor_climbs failed user_id=%s count=%s", user_id, len(prepared))
        return {"ok": False, "error": "Failed to save outdoor climbs"}, 500


def edit_outdoor_climbs(user_id: str, updates: List[Dict[str, Any]]):
    """
    Applies edits to existing outdoor routes in a single transaction.

    Each entry needs a route_id; attempts / sent / sent_at / first_climb_date are all
    optional and an omitted key leaves that column untouched. Attempts can be changed
    whether or not the route is sent -- the user is allowed to correct the count on
    routes they have already sent.

    Rows are locked in a stable id order so two concurrent batches cannot deadlock.
    """
    invalid = _check_batch(updates, "updates")
    if invalid:
        return invalid

    try:
        parsed = []
        for i, raw in enumerate(updates):
            try:
                parsed.append({
                    "route_id": _coerce_uuid(raw.get("route_id"), "route_id"),
                    "attempts": (
                        None if raw.get("attempts") is None
                        else _coerce_int(raw["attempts"], "attempts", minimum=0, maximum=MAX_OUTDOOR_ATTEMPTS)
                    ),
                    "sent": None if raw.get("sent") is None else bool(raw["sent"]),
                    "sent_at": parse_date(raw.get("sent_at")),
                    "first_climb_date": parse_date(raw.get("first_climb_date")),
                })
            except ValueError as e:
                raise ValueError(f"update {i + 1}: {e}") from None

        route_ids = [p["route_id"] for p in parsed]
        if len(set(route_ids)) != len(route_ids):
            return {"ok": False, "error": "The same route appears more than once"}, 400

    except ValueError as e:
        return {"ok": False, "error": str(e)}, 400

    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            # user_id in the predicate means a guessed route_id can never touch another
            # user's row; ORDER BY gives every batch the same locking order.
            cur.execute(
                """
                SELECT route_id, attempts, sent, sent_at, first_climb_date
                FROM outdoor_climbs
                WHERE user_id = %s AND route_id = ANY(%s) AND is_deleted IS FALSE
                ORDER BY route_id
                FOR UPDATE
                """,
                (user_id, route_ids),
            )
            current = {r["route_id"]: r for r in cur.fetchall()}

            missing = [str(rid) for rid in route_ids if rid not in current]
            if missing:
                return {
                    "ok": False,
                    "error": "Some routes no longer exist",
                    "missing": missing,
                }, 404

            params = []
            for p in parsed:
                row = current[p["route_id"]]
                attempts = row["attempts"] if p["attempts"] is None else p["attempts"]
                sent = row["sent"] if p["sent"] is None else p["sent"]
                first_climb_date = p["first_climb_date"] or row["first_climb_date"]
                sent_at = p["sent_at"] or row["sent_at"]

                if sent:
                    sent_at = sent_at or first_climb_date or date.today()
                    attempts = max(attempts, 1)
                else:
                    sent_at = None

                if sent_at and first_climb_date and sent_at < first_climb_date:
                    return {
                        "ok": False,
                        "error": "Sent date cannot be earlier than the start date",
                    }, 400

                params.append((attempts, sent, sent_at, first_climb_date, user_id, p["route_id"]))

            cur.executemany(
                """
                UPDATE outdoor_climbs
                SET attempts = %s, sent = %s, sent_at = %s, first_climb_date = %s
                WHERE user_id = %s AND route_id = %s AND is_deleted IS FALSE
                """,
                params,
            )

            cur.execute(
                """
                SELECT user_id, route_id, grade_system, grade_label, route_name, description,
                       location, attempts, sent, sent_at, first_climb_date
                FROM outdoor_climbs
                WHERE user_id = %s AND route_id = ANY(%s)
                """,
                (user_id, route_ids),
            )
            rows = cur.fetchall()

        logger.info("outdoor_climbs updated user_id=%s count=%s", user_id, len(params))
        return {"ok": True, "routes": [_serialize_outdoor_row(r) for r in rows]}, 200

    except Exception:
        logger.exception("edit_outdoor_climbs failed user_id=%s count=%s", user_id, len(parsed))
        return {"ok": False, "error": "Failed to save changes"}, 500
