from datetime import date, datetime, timezone
from typing import Optional


def parse_ts(value: Optional[str]) -> Optional[datetime]:
    """
    Parse an ISO8601 timestamp from the FE into a timezone-aware datetime.
    Handles trailing 'Z' and offsets. If naive, assume UTC.
    """
    if not value:
        raise ValueError("empty timestamp")
    s = value.strip()
    if not s:
        return None
    if s.endswith("Z"):
        dt = datetime.fromisoformat(s[:-1])
        return dt.replace(tzinfo=timezone.utc)
    # Normal ISO with offset or naive
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        # If the FE ever sent naive time, treat as UTC to be safe
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def parse_date(value) -> Optional[date]:
    """
    Parse a calendar date from the FE. Accepts 'YYYY-MM-DD' (what the <input type="date">
    fields send), a full ISO timestamp, or an already-parsed date/datetime. Empty input
    yields None so callers can treat "cleared" and "omitted" alike.
    """
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    s = str(value).strip()
    if not s:
        return None
    try:
        return date.fromisoformat(s[:10])
    except ValueError:
        raise ValueError("Invalid date format, expected YYYY-MM-DD") from None
