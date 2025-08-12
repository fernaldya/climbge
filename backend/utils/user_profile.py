from utils.connect_db import pool
from psycopg.rows import dict_row


def fetch_user_profile(user_id):
    with pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute("""
            SELECT
              user_id,
              username,
              started_climbing,
              age,
              home_city,
              home_gym,
              sex,
              name,
              email,
              height,
              weight,
              ape_index,
              grip_strength,
              unit_of_measurement
            FROM public.user_profile
            WHERE user_id = %s
            LIMIT 1
        """, (user_id,))
        row = cur.fetchone()

        if not row:
            return None

    unit = (row.get("unit_of_measurement"))

    def normalize_unit(value, unit):
        if value is None:
            return '-'
        return f'{value} {unit}'

    ape_index = str(row.get('ape_index') or '?')
    if unit == 'imperial':
        height = normalize_unit(row.get('height'), "in")
        weight = normalize_unit(row.get('weight'), "lbs")
        grip_strength = normalize_unit(row.get('grip_strength'), "lbs")
    else:
        height = normalize_unit(row.get('height'), "cm")
        weight = normalize_unit(row.get('weight'), "kg")
        grip_strength = normalize_unit(row.get('grip_strength'), "kg")

    return {
        'user_id': str(row['user_id']),
        'username': row['username'],
        'demography': {
            'started_climbing': row['started_climbing'],
            'age': row.get('age') or '-',
            'homeCity': row.get('home_city') or '-',
            'homeGym': row.get('home_gym') or '-',
            'sex': row.get('sex') or '-',
            'name': row.get('name') or '-',
            'email': row.get('email') or '-'
        },
        'measurements': {
            'height': height,
            'weight': weight,
            'apeIndex': ape_index,
            'gripStrength': grip_strength
        }
    }
