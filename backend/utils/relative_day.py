from datetime import date

def get_relative_day(input_date: date, *, week_cap: int | None=None) -> str:
    """
    Returns a string representing the relative day
    """
    today = date.today()
    delta_days = (today - input_date).days

    if delta_days == 0:
        return "Today"
    if delta_days == 1:
        return "Yesterday"
    if delta_days < 7:
        return f"{delta_days} days ago"
    weeks = delta_days // 7
    if week_cap is not None and weeks > week_cap:
        return f"{week_cap} weeks ago"
    return '1 week ago' if weeks == 1 else f'{weeks} weeks ago'
