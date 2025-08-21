from datetime import datetime, timezone
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
