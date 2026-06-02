from psycopg.rows import dict_row
from utils.http import err
from utils.connect_db import pool

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
        return {"error": "No payload"}, 400

    new_location = payload.get('newLocation')
    if not isinstance(new_location, dict):
        return err("invalid_request", "Invalid new location", 400)

    gym_name = new_location.get('gymName')
    gym_chain = new_location.get('gymChain')
    gym_location = new_location.get('gymLocation')
    country_code = new_location.get('countryCode')

    if not gym_name or not gym_location:
        return err("invalid_request", "Gym name and location not provided", 400)

    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "INSERT INTO climbing_locations (gym_name, gym_chain, location, country_code, submitted_by) VALUES (%s, %s, %s, %s, %s)",
                (gym_name, gym_chain, gym_location, country_code, user_id),
            )

        return {"ok": True}, 200
    except Exception:
        return err("db_error", "Database error.", 500)
