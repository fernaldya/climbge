from __future__ import annotations
from datetime import date, datetime
from utils.connect_db import pool
from utils.security import hash_password, login_user, verify_password
from flask import Blueprint, request, jsonify, session
from psycopg.rows import dict_row

auth_bp = Blueprint("auth", __name__)


# --- helpers ------------------------------------------------------------------
def ok(payload=None, status=200): return jsonify(payload or {}), status
def err(code: str, message: str, status=400): return jsonify(error={"code": code, "message": message}), status

# --- serializer --------------------------------------------------------------
def to_user_profile(row: dict) -> dict:
    started = row.get("started_climbing")
    return {
        "userId": str(row["user_id"]),
        "username": row["username"],
        "startedClimbing": row.get("started_climbing").isoformat() if isinstance(started, date) else None,
        "age": row.get("age"),
        "homeCity": row.get("home_city"),
        "homeGym": row.get("home_gym"),
        "name": row.get("name")
    }

# --- routes ------------------------------------------------------------------
@auth_bp.post("/signup")
def signup():
    data = request.get_json(silent=True) or {}

    # required
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return err("invalid_input", "Username and password are required.", 422)

    # optional fields
    started_date = (data.get("startedClimbing") or "").strip()
    if started_date:
        try:
            # Expecting full date already, e.g. "2023-03-01"
            started_date = datetime.strptime(started_date, "%Y-%m-%d").date()
        except ValueError:
            return err("invalid_started_climbing", "startedClimbing must be 'YYYY-MM-DD'.", 422)

    email = (data.get("email") or "").strip() or None
    name = (data.get("name") or "").strip() or None
    age_val = data.get("age")
    age = None
    if age_val not in (None, ""):
        try:
            age = int(age_val)
            if age < 0 or age > 100:
                return err("invalid_age", "Age must be between 0 and 120.", 422)
        except Exception:
            return err("invalid_age", "Age must be an integer.", 422)

    home_city  = (data.get("home_city") or "").strip() or None
    home_gym   = (data.get("primary_gym") or data.get("home_gym") or "").strip() or None
    sex        = (data.get("sex") or "").strip() or None

    pwd_hash = hash_password(password)

    # Insert users + optional demography in one transaction
    try:
        with pool.connection() as conn:
            with conn.transaction():
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO public.users (username, password)
                        VALUES (%s, %s)
                        RETURNING user_id, username
                        """,
                        (username, pwd_hash),
                    )
                    user_id, uname = cur.fetchone()

                    # only insert demography row if at least one optional field present
                    if any([started_date, email, name, age, home_city, home_gym, sex]):
                        cur.execute(
                            """
                            INSERT INTO public.user_demography
                              (user_id, started_climbing, age, home_city, home_gym, sex, email, name)
                            VALUES
                              (%s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (user_id) DO UPDATE SET
                              started_climbing = COALESCE(EXCLUDED.started_climbing, user_demography.started_climbing),
                              age              = COALESCE(EXCLUDED.age,              user_demography.age),
                              home_city        = COALESCE(EXCLUDED.home_city,        user_demography.home_city),
                              home_gym         = COALESCE(EXCLUDED.home_gym,         user_demography.home_gym),
                              sex              = COALESCE(EXCLUDED.sex,              user_demography.sex),
                              email            = COALESCE(EXCLUDED.email,            user_demography.email),
                              name             = COALESCE(EXCLUDED.name,             user_demography.name)
                            """,
                            (user_id, started_date, age, home_city, home_gym, sex, email, name),
                        )
    except UniqueViolation:
        return err("username_taken", "That username is already taken.", 409)
    except Exception as e:
        # log exception internally
        return err("server_error", f"Could not create user. {e}", 500)

    # log the new user in
    login_user(str(user_id))

    # Build response
    months_climbing = None
    if started_date:
        start_norm = date(started_date.year, started_date.month, 1)
        today = date.today()
        today_norm = date(today.year, today.month, 1)
        months_climbing = (today_norm.year - start_norm.year) * 12 + (today_norm.month - start_norm.month)

    profile = {
        "user_id": str(user_id),
        "username": uname
        }
    profile["demography"] = {
        "name": name,
        "email": email,
        "started_climbing": started_date.isoformat() if started_date else None,
        "months_climbing": f'{months_climbing} months' if months_climbing is not None else None,
        "age": age,
        "home_city": home_city,
        "home_gym": home_gym,
        "sex": sex,
    }

    return ok({"authenticated": True, "profile": profile}, 201)


@auth_bp.post("/login")
def login():
    """
    Body: { username, password }
    On success: sets session and returns { ok: true, profile }
    """
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify(error={"code": "invalid_request", "message": "Username and password are required."}), 400

    try:
        with pool.connection() as conn:
            with conn.cursor(row_factory=dict_row) as cur:
                # Authenticate user
                cur.execute(
                    """
                    SELECT user_id, password
                    FROM public.users
                    WHERE username = %s
                    limit 1
                    """,
                    (username,),
                )
                user_verify = cur.fetchone()
                if not user_verify or not verify_password(password, user_verify['password']):
                    return jsonify(error={"code": "invalid_credentials", "message": "Invalid credentials."}), 401

                # Get user profile
                cur.execute(
                    """
                    SELECT user_id, username, started_climbing, age, home_city, home_gym, sex, name, email
                    FROM public.user_profile
                    WHERE user_id = %s
                    limit 1
                    """,
                    (user_verify['user_id'],)
                )
                row = cur.fetchone()
    except Exception as e:
        print("LOGIN ERROR:", e)
        return jsonify(error={"code": "db_error", "message": "Database error."}), 500

    # OK → set server session
    session.clear()
    session["user_id"] = user_verify['user_id']
    session.permanent = True  # lifetime set in app config

    return jsonify(ok=True, profile=to_user_profile(row)), 200

@auth_bp.post("/logout")
def logout():
    session.clear()
    return jsonify(ok=True), 200


@auth_bp.get("/me")
def me():
    uid = session.get("user_id")
    if not uid:
        return jsonify(authenticated=False), 200

    try:
        with pool.connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT user_id, username, password
                FROM users
                WHERE user_id = %s
                """,
                (uid,),
            )
            row = cur.fetchone()
    except Exception:
        # degrade to logged-out if DB is down
        return jsonify(authenticated=False), 200

    if not row:
        session.clear()
        return jsonify(authenticated=False), 200

    return jsonify(authenticated=True, profile=to_user_profile(row)), 200
