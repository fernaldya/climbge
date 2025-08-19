from psycopg.rows import dict_row
from utils.connect_db import pool
from utils.conversions import ft_in_to_total_in

def update_user_stats(user_id: str, data: dict) -> dict:
    unit = data.get('unitOfMeasurement')
    if unit.lower() == 'metric':
        height = data.get('height')
    else:
        height = ft_in_to_total_in(data.get('heightFeet'), data.get('heightInches'))

    weight = data.get('weight')
    ape_index = data.get('apeIndex')
    grip_strength = data.get('gripStrength')

    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO public.user_measurements
                    (user_id, height, weight, ape_index, grip_strength, unit_of_measurement)
                VALUES
                    (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (user_id) DO UPDATE
                SET height              = COALESCE(EXCLUDED.height,              user_measurements.height),
                    weight              = COALESCE(EXCLUDED.weight,              user_measurements.weight),
                    ape_index           = COALESCE(EXCLUDED.ape_index,           user_measurements.ape_index),
                    grip_strength       = COALESCE(EXCLUDED.grip_strength,       user_measurements.grip_strength),
                    unit_of_measurement = COALESCE(EXCLUDED.unit_of_measurement, user_measurements.unit_of_measurement)
                RETURNING user_id, height, weight, ape_index, grip_strength, unit_of_measurement;
                """,
                (user_id, height, weight, ape_index, grip_strength, unit)
            )
    except Exception:
        return {"error": {"code": "db_error", "message": "Unable to update physical stats"}}, 500
