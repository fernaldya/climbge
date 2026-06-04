from psycopg.rows import dict_row
from psycopg.errors import UniqueViolation
from utils.http import err
from utils.connect_db import pool
from string import capwords

def submit_feedback(user_id: str, text: str):
    """Inserts user feedback"""
    if not text:
        return err("invalid_request", "Feedback is required.", 400)
    if len(text) > 4000:
        return err("too_long", "Max 4000 characters.", 400)

    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT username FROM public.users WHERE user_id = %s LIMIT 1", (user_id,))
            row = cur.fetchone()
            if not row:
                return err("not_found", "User not found.", 404)

            cur.execute(
                "INSERT INTO public.user_feedback (user_id, username, feedback) VALUES (%s, %s, %s)",
                (user_id, row["username"], text),
            )
        return {"ok": True}, 200
    except Exception:
        return err("db_error", "Database error.", 500)


def submit_new_climb_location(user_id: str, payload: dict):
    """Inserts new climbing location to the pending list"""
    if not payload:
        return err("invalid_request", "No payload", 400)

    new_location = payload.get('newLocation')
    if not isinstance(new_location, dict):
        return err("invalid_request", "Invalid new location", 400)

    gym_name = new_location.get('gymName')
    gym_chain = new_location.get('gymChain')
    gym_location = new_location.get('gymLocation')
    country = new_location.get('country')

    # Reject non-string inputs rather than coercing objects/lists into the DB.
    gym_name = gym_name.strip() if isinstance(gym_name, str) else None
    gym_chain = gym_chain.strip() if isinstance(gym_chain, str) else None
    gym_location = gym_location.strip() if isinstance(gym_location, str) else None
    country = country.strip() if isinstance(country, str) else None

    if not gym_name or not gym_location or not country:
        return err("invalid_request", "Gym name, location, and country are required", 400)

    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "INSERT INTO climbing_locations (gym_name, gym_chain, location, country, submitted_by) VALUES (%s, %s, %s, %s, %s)",
                (capwords(gym_name), capwords(gym_chain) if gym_chain else None, gym_location.upper(), capwords(country), user_id),
            )

        return {"ok": True}, 200
        
    except UniqueViolation:
        return err("already_exists", "This gym location has already been submitted.", 409)
    except Exception:
        return err("db_error", "Database error.", 500)


def submit_new_grade_system(user_id: str, payload: dict):
    """Inserts new grade system to the pending list"""
    if not payload:
        return err("invalid_request", "No payload", 400)

    grade_system = payload.get('newGradeSystem')
    if not isinstance(grade_system, dict):
        return err("invalid_request", "Bad format for new grade system", 400)

    grade_name = grade_system.get('gradeSystemName')
    grades = grade_system.get('grades')
    climb_type = grade_system.get('climbType')

    # Reject non-string inputs rather than coercing objects/lists into the DB.
    grade_name = capwords(grade_name.strip()) if isinstance(grade_name, str) else None
    climb_type = capwords(climb_type.strip()) if isinstance(climb_type, str) else None

    # FE sends grades as a JSON array; still sanitize since the endpoint is public.
    if isinstance(grades, list):
        cleaned = [g.strip() for g in grades if isinstance(g, str) and g.strip()]
    elif isinstance(grades, str):
        cleaned = [g.strip() for g in grades.split(',') if g.strip()]
    else:
        cleaned = []

    # Drop duplicates while preserving order (first occurrence wins).
    grade_list = list(dict.fromkeys(cleaned))

    if not grade_name or not climb_type or not grade_list:
        return err("invalid_request", "Grade system name, climb type, and grades are required", 400)

    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "INSERT INTO grade_systems (grade_system, grades, climb_type, submitted_by) VALUES (%s, %s, %s, %s)",
                (grade_name, grade_list, climb_type, user_id),
            )

        return {"ok": True}, 200
        
    except UniqueViolation:
        return err("already_exists", "This grade system has already been submitted.", 409)
    except Exception:
        return err("db_error", "Database error.", 500)