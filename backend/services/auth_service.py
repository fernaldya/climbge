from datetime import date, datetime
from psycopg.rows import dict_row
from psycopg.errors import UniqueViolation
from flask import session
from utils.http import err
from utils.security import hash_password, verify_password, login_user, current_user_id
from services.user_profile_service import fetch_user_profile
from utils.connect_db import pool


def signup_user(data: dict):
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    if not username or not password:
        return err("invalid_input", "Username and password are required.", 422)

    started_str = (data.get("startedClimbing") or "").strip()
    try:
        started_date = datetime.strptime(started_str, "%Y-%m-%d").date()
    except ValueError:
        return err("invalid_started_climbing", "startedClimbing must be 'YYYY-MM-DD'.", 422)

    email = (data.get("email") or "").strip() or None
    name = (data.get("name") or "").strip() or None
    age_val = data.get("age")
    age = None
    if age_val not in (None, ""):
        try:
            age = int(age_val)
            if age < 0 or age > 120:
                return err("invalid_age", "Age must be between 0 and 120.", 422)
        except Exception:
            return err("invalid_age", "Age must be an integer.", 422)

    home_city  = (data.get("home_city") or "").strip() or None
    home_gym   = (data.get("primary_gym") or data.get("home_gym") or "").strip() or None
    sex        = (data.get("sex") or "").strip() or None

    pwd_hash = hash_password(password)

    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO public.users (username, password)
                VALUES (%s, %s)
                RETURNING user_id, username
                """,
                (username, pwd_hash),
            )
            user_id, uname = cur.fetchone()

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
        return err("server_error", f"Could not create user. {e}", 500)

    # login session
    login_user(str(user_id))

    # build response (same behavior as before)
    months_climbing = None
    if started_date:
        start_norm = date(started_date.year, started_date.month, 1)
        today = date.today()
        today_norm = date(today.year, today.month, 1)
        months_climbing = (today_norm.year - start_norm.year) * 12 + (today_norm.month - start_norm.month)

    profile = {
        "user_id": str(user_id),
        "username": uname,
        "demography": {
            "name": name,
            "email": email,
            "started_climbing": started_date.isoformat() if started_date else None,
            "months_climbing": f"{months_climbing} months" if months_climbing is not None else None,
            "age": age,
            "home_city": home_city,
            "home_gym": home_gym,
            "sex": sex,
        },
    }
    return {"authenticated": True, "profile": profile}, 201

def login_with_password(username: str, password: str):
    if not username or not password:
        return err("invalid_request", "Username and password are required."), 400

    try:
        with pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT user_id, password
                FROM public.users
                WHERE username = %s
                LIMIT 1
                """,
                (username,),
            )
            row = cur.fetchone()
            if not row or not verify_password(password, row["password"]):
                return err("invalid_credentials", "Invalid credentials.", 401)

            profile = fetch_user_profile(row["user_id"])
    except Exception:
        return err("db_error", "Database error.", 500)

    session.clear()
    session["user_id"] = str(row["user_id"])
    session.permanent = True
    return {"ok": True, "profile": profile}, 200

def logout_user():
    session.clear()
    return {"ok": True}, 200

def me_profile():
    try:
        uid = current_user_id()
        if not uid:
            return {"authenticated": False}, 200
        row = fetch_user_profile(uid)
    except Exception:
        return {"authenticated": False}, 200

    if not row:
        session.clear()
        return {"authenticated": False}, 200
    return {"authenticated": True, "profile": row}, 200
