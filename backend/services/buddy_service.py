import logging
from psycopg.rows import dict_row
from psycopg.errors import UniqueViolation
from utils.connect_db import pool
from utils.http import err

logger = logging.getLogger("climbge-api")

# Max number of buddy groups a single user may *own*. You can be a viewer in
# unlimited groups.
MAX_BUDDY_GROUPS_PER_USER = 5

# In the buddy feed, show at most this many of each buddy's upcoming planned
# climbs (the earliest ones). A user can still create as many plans as they like.
MAX_FEED_PLANS_PER_BUDDY = 2


# ---------- Authorization helpers ----------
def _require_member(cur, buddy_id, uid):
    """Return the caller's role in the group, or None if they're not a member."""
    cur.execute(
        "SELECT user_role FROM public.buddy_members WHERE buddy_id = %s AND user_id = %s",
        (buddy_id, uid),
    )
    row = cur.fetchone()
    return row["user_role"] if row else None


def _remove_member(cur, buddy_id, target_uid):
    """
    Remove a member from a group, handling owner transfer / disband.

    - Non-owner: unshare their planned climbs from this group, drop their row.
    - Owner: promote the earliest-joined remaining member to owner, unshare the
      departing owner's plans from this group, drop their row. If no one remains,
      delete the group (cascades clean up members, invites and plan links).
    """
    cur.execute(
        "SELECT user_role FROM public.buddy_members WHERE buddy_id = %s AND user_id = %s",
        (buddy_id, target_uid),
    )
    row = cur.fetchone()
    if not row:
        return
    is_owner = row["user_role"] == "owner"

    if is_owner:
        cur.execute(
            """
            SELECT user_id
            FROM public.buddy_members
            WHERE buddy_id = %s AND user_id <> %s
            ORDER BY joined_at ASC
            LIMIT 1
            """,
            (buddy_id, target_uid),
        )
        heir = cur.fetchone()
        if not heir:
            # Last member leaving -> disband the whole group.
            logger.info("buddy_group disbanded buddy_id=%s owner_id=%s", buddy_id, target_uid)
            cur.execute("DELETE FROM public.buddies WHERE id = %s", (buddy_id,))
            return
        logger.info(
            "buddy_group owner_transferred buddy_id=%s old_owner_id=%s new_owner_id=%s",
            buddy_id,
            target_uid,
            heir["user_id"],
        )
        cur.execute(
            "UPDATE public.buddy_members SET user_role = 'owner' WHERE buddy_id = %s AND user_id = %s",
            (buddy_id, heir["user_id"]),
        )

    # Unshare the departing member's planned climbs from this group.
    cur.execute(
        """
        DELETE FROM public.planned_climb_groups pcg
        USING public.planned_climbs pc
        WHERE pcg.planned_climb_id = pc.id
          AND pcg.buddy_id = %s
          AND pc.user_id = %s
        """,
        (buddy_id, target_uid),
    )
    cur.execute(
        "DELETE FROM public.buddy_members WHERE buddy_id = %s AND user_id = %s",
        (buddy_id, target_uid),
    )


# ---------- Groups ----------
def list_buddies(uid):
    """List groups the caller belongs to, with member counts and their role."""
    try:
        with pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT b.id,
                       b.name,
                       b.created_at,
                       me.user_role AS your_role,
                       (SELECT count(*) FROM public.buddy_members m WHERE m.buddy_id = b.id) AS member_count
                FROM public.buddies b
                JOIN public.buddy_members me ON me.buddy_id = b.id AND me.user_id = %s
                ORDER BY b.created_at DESC
                """,
                (uid,),
            )
            rows = cur.fetchall()
        return {
            "buddies": [
                {
                    "id": str(r["id"]),
                    "name": r["name"],
                    "created_at": r["created_at"].isoformat(),
                    "member_count": r["member_count"],
                    "your_role": r["your_role"],
                }
                for r in rows
            ]
        }, 200
    except Exception:
        logger.exception("buddies list failed user_id=%s", uid)
        return err("db_error", "Could not fetch buddy groups.", 500)


def create_buddy(uid, name):
    name = (name or "").strip()
    if not name:
        return err("invalid_input", "Group name is required.", 422)
    if len(name) > 100:
        return err("invalid_input", "Group name must be at most 100 characters.", 422)

    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "SELECT count(*) AS n FROM public.buddy_members WHERE user_id = %s AND user_role = 'owner'",
                (uid,),
            )
            if cur.fetchone()["n"] >= MAX_BUDDY_GROUPS_PER_USER:
                return err(
                    "group_limit_reached",
                    f"You can own at most {MAX_BUDDY_GROUPS_PER_USER} buddy groups.",
                    409,
                )

            cur.execute(
                """
                INSERT INTO public.buddies (name, created_by)
                VALUES (%s, %s)
                RETURNING id, name, created_at
                """,
                (name, uid),
            )
            grp = cur.fetchone()
            cur.execute(
                "INSERT INTO public.buddy_members (buddy_id, user_id, user_role) VALUES (%s, %s, 'owner')",
                (grp["id"], uid),
            )
        logger.info("buddy_created user_id=%s buddy_id=%s", uid, grp["id"])
        return {
            "id": str(grp["id"]),
            "name": grp["name"],
            "created_at": grp["created_at"].isoformat(),
            "member_count": 1,
            "your_role": "owner",
        }, 201
    except Exception:
        logger.exception("buddy_create failed user_id=%s", uid)
        return err("db_error", "Could not create buddy group.", 500)


def get_buddy(uid, buddy_id):
    try:
        with pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            role = _require_member(cur, buddy_id, uid)
            if role is None:
                return err("forbidden", "You are not a member of this group.", 403)

            cur.execute("SELECT id, name, created_at FROM public.buddies WHERE id = %s", (buddy_id,))
            grp = cur.fetchone()
            if not grp:
                return err("not_found", "Group not found.", 404)

            cur.execute(
                """
                SELECT m.user_id,
                       p.username,
                       p.name,
                       m.user_role,
                       m.joined_at
                FROM public.buddy_members m
                JOIN public.user_profile p ON p.user_id = m.user_id
                WHERE m.buddy_id = %s
                ORDER BY m.joined_at ASC
                """,
                (buddy_id,),
            )
            members = cur.fetchall()
        return {
            "id": str(grp["id"]),
            "name": grp["name"],
            "created_at": grp["created_at"].isoformat(),
            "your_role": role,
            "members": [
                {
                    "user_id": str(m["user_id"]),
                    "username": m["username"],
                    "name": m["name"],
                    "role": m["user_role"],
                    "joined_at": m["joined_at"].isoformat(),
                }
                for m in members
            ],
        }, 200
    except Exception:
        logger.exception("buddy_get failed user_id=%s buddy_id=%s", uid, buddy_id)
        return err("db_error", "Could not fetch buddy group.", 500)


def rename_buddy(uid, buddy_id, name):
    name = (name or "").strip()
    if not name:
        return err("invalid_input", "Group name is required.", 422)
    if len(name) > 100:
        return err("invalid_input", "Group name must be at most 100 characters.", 422)

    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            role = _require_member(cur, buddy_id, uid)
            if role is None:
                return err("forbidden", "You are not a member of this group.", 403)
            if role != "owner":
                return err("forbidden", "Only the group owner can rename it.", 403)
            cur.execute("UPDATE public.buddies SET name = %s WHERE id = %s", (name, buddy_id))
        logger.info("buddy_renamed user_id=%s buddy_id=%s", uid, buddy_id)
        return {"ok": True, "name": name}, 200
    except Exception:
        logger.exception("buddy_rename failed user_id=%s buddy_id=%s", uid, buddy_id)
        return err("db_error", "Could not rename buddy group.", 500)


def leave_buddy(uid, buddy_id):
    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            role = _require_member(cur, buddy_id, uid)
            if role is None:
                return err("forbidden", "You are not a member of this group.", 403)
            _remove_member(cur, buddy_id, uid)
        logger.info("buddy_left user_id=%s buddy_id=%s", uid, buddy_id)
        return {"ok": True}, 200
    except Exception:
        logger.exception("buddy_leave failed user_id=%s buddy_id=%s", uid, buddy_id)
        return err("db_error", "Could not leave buddy group.", 500)


def remove_buddy_member(uid, buddy_id, target_uid):
    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            role = _require_member(cur, buddy_id, uid)
            if role is None:
                return err("forbidden", "You are not a member of this group.", 403)
            if role != "owner":
                return err("forbidden", "Only the group owner can remove members.", 403)
            if str(target_uid) == str(uid):
                return err("invalid_input", "Use leave to remove yourself.", 400)
            if _require_member(cur, buddy_id, target_uid) is None:
                return err("not_found", "That user is not a member of this group.", 404)
            _remove_member(cur, buddy_id, target_uid)
        logger.info("buddy_member_removed user_id=%s buddy_id=%s target_user_id=%s", uid, buddy_id, target_uid)
        return {"ok": True}, 200
    except Exception:
        logger.exception("buddy_member_remove failed user_id=%s buddy_id=%s target_user_id=%s", uid, buddy_id, target_uid)
        return err("db_error", "Could not remove member.", 500)


# ---------- Invites ----------
def list_my_invites(uid):
    """Pending invites addressed to the caller's username."""
    try:
        with pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT i.id,
                       i.buddy_id,
                       b.name AS group_name,
                       inviter.username AS invited_by_username,
                       inviter.name AS invited_by_name,
                       i.created_at
                FROM public.buddy_invites i
                JOIN public.buddies b ON b.id = i.buddy_id
                JOIN public.user_profile inviter ON inviter.user_id = i.invited_by
                WHERE i.invited_username = (SELECT username FROM public.users WHERE user_id = %s)
                  AND i.status = 'pending'
                ORDER BY i.created_at DESC
                """,
                (uid,),
            )
            rows = cur.fetchall()
        return {
            "invites": [
                {
                    "id": str(r["id"]),
                    "buddy_id": str(r["buddy_id"]),
                    "group_name": r["group_name"],
                    "invited_by_username": r["invited_by_username"],
                    "invited_by_name": r["invited_by_name"],
                    "created_at": r["created_at"].isoformat(),
                }
                for r in rows
            ]
        }, 200
    except Exception:
        logger.exception("buddy_invites list failed user_id=%s", uid)
        return err("db_error", "Could not fetch invites.", 500)


def invite_to_buddy(uid, buddy_id, username):
    username = (username or "").strip()
    if not username:
        return err("invalid_input", "A username is required.", 422)

    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            role = _require_member(cur, buddy_id, uid)
            if role is None:
                return err("forbidden", "You are not a member of this group.", 403)
            if role != "owner":
                return err("forbidden", "Only the group owner can invite people.", 403)

            cur.execute("SELECT user_id, username FROM public.users WHERE username = %s", (username,))
            target = cur.fetchone()
            if not target:
                return err("user_not_found", "No user with that username.", 404)
            if str(target["user_id"]) == str(uid):
                return err("invalid_input", "You cannot invite yourself.", 400)
            if _require_member(cur, buddy_id, target["user_id"]) is not None:
                return err("already_member", "That user is already in this group.", 409)

            try:
                cur.execute(
                    """
                    INSERT INTO public.buddy_invites (buddy_id, invited_by, invited_username)
                    VALUES (%s, %s, %s)
                    RETURNING id, created_at
                    """,
                    (buddy_id, uid, target["username"]),
                )
            except UniqueViolation:
                return err("invite_exists", "That user already has a pending invite.", 409)
            inv = cur.fetchone()
        logger.info(
            "buddy_invite_created user_id=%s buddy_id=%s target_user_id=%s invite_id=%s",
            uid,
            buddy_id,
            target["user_id"],
            inv["id"],
        )
        return {
            "id": str(inv["id"]),
            "buddy_id": str(buddy_id),
            "invited_username": target["username"],
            "status": "pending",
            "created_at": inv["created_at"].isoformat(),
        }, 201
    except Exception:
        logger.exception("buddy_invite failed user_id=%s buddy_id=%s", uid, buddy_id)
        return err("db_error", "Could not send invite.", 500)


def accept_invite(uid, invite_id):
    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT i.buddy_id, i.invited_username, u.username AS my_username
                FROM public.buddy_invites i
                JOIN public.users u ON u.user_id = %s
                WHERE i.id = %s AND i.status = 'pending'
                """,
                (uid, invite_id),
            )
            inv = cur.fetchone()
            if not inv or inv["invited_username"] != inv["my_username"]:
                return err("not_found", "Invite not found.", 404)

            cur.execute(
                """
                INSERT INTO public.buddy_members (buddy_id, user_id, user_role)
                VALUES (%s, %s, 'viewer')
                ON CONFLICT (buddy_id, user_id) DO NOTHING
                """,
                (inv["buddy_id"], uid),
            )
            cur.execute(
                "UPDATE public.buddy_invites SET status = 'accepted' WHERE id = %s",
                (invite_id,),
            )
        logger.info("buddy_invite_accepted user_id=%s invite_id=%s buddy_id=%s", uid, invite_id, inv["buddy_id"])
        return {"ok": True, "buddy_id": str(inv["buddy_id"])}, 200
    except Exception:
        logger.exception("buddy_invite_accept failed user_id=%s invite_id=%s", uid, invite_id)
        return err("db_error", "Could not accept invite.", 500)


def decline_invite(uid, invite_id):
    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                DELETE FROM public.buddy_invites
                WHERE id = %s
                  AND invited_username = (SELECT username FROM public.users WHERE user_id = %s)
                  AND status = 'pending'
                RETURNING id
                """,
                (invite_id, uid),
            )
            if not cur.fetchone():
                return err("not_found", "Invite not found.", 404)
        logger.info("buddy_invite_declined user_id=%s invite_id=%s", uid, invite_id)
        return {"ok": True}, 200
    except Exception:
        logger.exception("buddy_invite_decline failed user_id=%s invite_id=%s", uid, invite_id)
        return err("db_error", "Could not decline invite.", 500)


# ---------- Planned climbs & feed ----------
def list_planned_climbs(uid):
    """The caller's own planned climbs with the groups each is shared into."""
    try:
        with pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT pc.id, pc.gym, pc.city, pc.country, pc.planned_date, pc.planned_time,
                       COALESCE(
                           array_agg(pcg.buddy_id) FILTER (WHERE pcg.buddy_id IS NOT NULL),
                           '{}'
                       ) AS buddy_ids
                FROM public.planned_climbs pc
                LEFT JOIN public.planned_climb_groups pcg ON pcg.planned_climb_id = pc.id
                WHERE pc.user_id = %s
                GROUP BY pc.id
                ORDER BY pc.planned_date ASC, pc.planned_time ASC NULLS LAST
                """,
                (uid,),
            )
            rows = cur.fetchall()
        return {"plans": [_plan_dict(r) for r in rows]}, 200
    except Exception:
        logger.exception("planned_climbs list failed user_id=%s", uid)
        return err("db_error", "Could not fetch planned climbs.", 500)


def create_planned_climb(uid, payload):
    gym = (payload.get("gym") or "").strip()
    planned_date = (payload.get("planned_date") or "").strip()
    planned_time = (payload.get("planned_time") or "").strip() or None
    city = (payload.get("city") or "").strip() or None
    country = (payload.get("country") or "").strip() or None
    share_all = bool(payload.get("share_all"))
    buddy_ids = payload.get("buddy_ids") or []

    if not gym:
        return err("invalid_input", "A gym is required.", 422)
    if not planned_date:
        return err("invalid_input", "A date is required.", 422)

    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            if share_all:
                cur.execute(
                    "SELECT buddy_id FROM public.buddy_members WHERE user_id = %s",
                    (uid,),
                )
                buddy_ids = [str(r["buddy_id"]) for r in cur.fetchall()]
            else:
                buddy_ids = [str(b) for b in buddy_ids]
                for bid in buddy_ids:
                    if _require_member(cur, bid, uid) is None:
                        return err("forbidden", "You can only share into groups you belong to.", 403)

            cur.execute(
                """
                INSERT INTO public.planned_climbs (user_id, gym, city, country, planned_date, planned_time)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, gym, city, country, planned_date, planned_time
                """,
                (uid, gym, city, country, planned_date, planned_time),
            )
            plan = cur.fetchone()
            for bid in buddy_ids:
                cur.execute(
                    "INSERT INTO public.planned_climb_groups (planned_climb_id, buddy_id) VALUES (%s, %s)",
                    (plan["id"], bid),
                )
        logger.info(
            "planned_climb_created user_id=%s plan_id=%s shared_groups=%s",
            uid,
            plan["id"],
            len(buddy_ids),
        )
        plan["buddy_ids"] = buddy_ids
        return _plan_dict(plan), 201
    except Exception:
        logger.exception("planned_climb_create failed user_id=%s", uid)
        return err("db_error", "Could not save planned climb.", 500)


def cancel_planned_climb(uid, plan_id):
    try:
        with pool.connection() as conn, conn.transaction(), conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                "DELETE FROM public.planned_climbs WHERE id = %s AND user_id = %s RETURNING id",
                (plan_id, uid),
            )
            if not cur.fetchone():
                return err("not_found", "Planned climb not found.", 404)
        logger.info("planned_climb_cancelled user_id=%s plan_id=%s", uid, plan_id)
        return {"ok": True}, 200
    except Exception:
        logger.exception("planned_climb_cancel failed user_id=%s plan_id=%s", uid, plan_id)
        return err("db_error", "Could not cancel planned climb.", 500)


def buddy_feed(uid):
    """
    For each buddy (a user sharing at least one group with the caller), return
    their last climb (auto-visible) and any upcoming planned climbs shared into
    a group the caller also belongs to.
    """
    try:
        with pool.connection() as conn, conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT DISTINCT p.user_id, p.username, p.name
                FROM public.buddy_members me
                JOIN public.buddy_members other ON other.buddy_id = me.buddy_id
                JOIN public.user_profile p ON p.user_id = other.user_id
                WHERE me.user_id = %s AND other.user_id <> %s
                ORDER BY p.name
                """,
                (uid, uid),
            )
            buddies = cur.fetchall()

            cur.execute(
                """
                SELECT lcs.user_id, lcs.location, lcs.climb_date
                FROM public.last_climb_session lcs
                WHERE lcs.user_id IN (
                    SELECT other.user_id
                    FROM public.buddy_members me
                    JOIN public.buddy_members other ON other.buddy_id = me.buddy_id
                    WHERE me.user_id = %s AND other.user_id <> %s
                )
                """,
                (uid, uid),
            )
            last_by_user = {str(r["user_id"]): r for r in cur.fetchall()}

            cur.execute(
                """
                SELECT DISTINCT pc.id, pc.user_id, pc.gym, pc.city, pc.country,
                       pc.planned_date, pc.planned_time
                FROM public.planned_climbs pc
                JOIN public.planned_climb_groups pcg ON pcg.planned_climb_id = pc.id
                JOIN public.buddy_members me ON me.buddy_id = pcg.buddy_id AND me.user_id = %s
                WHERE pc.user_id <> %s AND pc.planned_date >= CURRENT_DATE
                ORDER BY pc.planned_date ASC, pc.planned_time ASC NULLS LAST
                """,
                (uid, uid),
            )
            # Rows arrive ordered earliest-first, so keeping the first few per
            # user yields each buddy's soonest upcoming plans.
            plans_by_user = {}
            for r in cur.fetchall():
                bucket = plans_by_user.setdefault(str(r["user_id"]), [])
                if len(bucket) < MAX_FEED_PLANS_PER_BUDDY:
                    bucket.append(r)

        feed = []
        for b in buddies:
            buid = str(b["user_id"])
            last = last_by_user.get(buid)
            feed.append(
                {
                    "user_id": buid,
                    "username": b["username"],
                    "name": b["name"],
                    "last_climb": (
                        {
                            "location": last["location"],
                            "climb_date": last["climb_date"].isoformat(),
                        }
                        if last
                        else None
                    ),
                    "planned_climbs": [_plan_dict(p, include_groups=False) for p in plans_by_user.get(buid, [])],
                }
            )
        return {"buddies": feed}, 200
    except Exception:
        logger.exception("buddy_feed failed user_id=%s", uid)
        return err("db_error", "Could not fetch buddy feed.", 500)


def _plan_dict(r, include_groups=True):
    out = {
        "id": str(r["id"]),
        "gym": r["gym"],
        "city": r.get("city"),
        "country": r.get("country"),
        "planned_date": r["planned_date"].isoformat() if hasattr(r["planned_date"], "isoformat") else r["planned_date"],
        "planned_time": r["planned_time"].strftime("%H:%M") if r.get("planned_time") else None,
    }
    if include_groups:
        out["buddy_ids"] = [str(b) for b in (r.get("buddy_ids") or [])]
    return out
