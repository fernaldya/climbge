def ft_in_to_total_in(feet, inches) -> float | None:
    if feet in (None, "",) and inches in (None, "",):
        return None
    try:
        f = int(feet or 0)
        i = int(inches or 0)
    except (TypeError, ValueError):
        raise ValueError("Feet/Inches must be integers")
    if i < 0 or i > 11:
        raise ValueError("Inches must be between 0 and 11")
    if f < 0:
        raise ValueError("Feet must be ≥ 0")
    return float(f * 12 + i)

def inches_to_feet_inches(total_in):
    if total_in is None:
        return (None, None, None)
    ti = int(round(float(total_in)))
    ft = ti // 12
    inch = ti % 12
    return (ft, inch, f"{ft}'{inch}\"")

def fmt_num(v, suffix: str) -> str | None:
    if v is None:
        return None
    s = f"{float(v):.2f}".rstrip("0").rstrip(".")
    return f"{s} {suffix}"

def _format_measurements_for_fe(row: dict) -> dict:
    unit = (row["unit_of_measurement"] or "metric").lower()
    h    = row["height"]

    if unit == "imperial":
        ft, inch, h_disp = inches_to_feet_inches(h)  # stored as total inches
        return {
            "unitOfMeasurement": "imperial",
            "height": h,
            "heightFeet": ft,
            "heightInches": inch,
            "heightDisplay": h_disp,
            "weight": row["weight"],
            "weightDisplay": fmt_num(row["weight"], "lb"),
            "apeIndex": row["ape_index"],
            "apeIndexDisplay": fmt_num(row["ape_index"], "in"),
            "gripStrength": row["grip_strength"],
            "gripStrengthDisplay": fmt_num(row["grip_strength"], "lbf"),
        }
    else:
        return {
            "unitOfMeasurement": "metric",
            "height": h,  # cm as entered
            "heightFeet": None,
            "heightInches": None,
            "heightDisplay": fmt_num(h, "cm"),
            "weight": row["weight"],
            "weightDisplay": fmt_num(row["weight"], "kg"),
            "apeIndex": row["ape_index"],
            "apeIndexDisplay": fmt_num(row["ape_index"], "cm"),
            "gripStrength": row["grip_strength"],
            "gripStrengthDisplay": fmt_num(row["grip_strength"], "kgf"),
        }
