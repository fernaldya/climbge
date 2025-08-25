from psycopg.rows import dict_row
from utils.connect_db import pool
from flask import jsonify


def fetch_grades():
    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT grade_id, grade_system, grades
                FROM grade_systems
                ORDER BY grade_id
                """
            )
            rows = cur.fetchall()

        out = []
        for r in rows:
            grades = r["grades"]
            if isinstance(grades, str):
                raw = grades.strip().strip("{}")
                grades_list = [] if not raw else [x.strip() for x in raw.split(",")]
            else:
                grades_list = grades

            out.append({
                "grade_id": r["grade_id"],
                "label": r["grade_system"],
                "grades": grades_list
            })

        return jsonify(out), 200
    except Exception:
        return {"error": {"code": "db_error", "message": "Could not fetch grades!"}}, 500
