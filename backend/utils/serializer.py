def to_user_profile(row: dict) -> dict:
    return {
        "userId": str(row["user_id"]),
        "username": row["username"],
        "demography": {
            "startedClimbing": row["started_climbing"].isoformat(),
            "age": row["age"],
            "homeCity": row["home_city"],
            "homeGym": row["home_gym"],
            "name": row["name"],
        },
        "measurements": {
            "height": row["height"],
            "weight": row["weight"],
            "apeIndex": row["ape_index"],
            "gripStrength": row["grip_strength"],
        },
    }
