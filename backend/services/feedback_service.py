from psycopg.rows import dict_row
from utils.http import err
from utils.connect_db import pool

def submit_feedback(user_id: str, text: str):
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
