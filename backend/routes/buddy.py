# routes/buddy.py
from flask import Blueprint, request
from utils.auth import login_required
from utils.security import current_user_id
from services.buddy_service import (
    list_buddies, create_buddy, get_buddy, rename_buddy, leave_buddy, remove_buddy_member,
    list_my_invites, invite_to_buddy, accept_invite, decline_invite,
    list_planned_climbs, create_planned_climb, cancel_planned_climb, buddy_feed,
)

buddy_bp = Blueprint("buddy", __name__)


# ---------- Groups ----------
@buddy_bp.get("/buddies")
@login_required
def api_list_buddies():
    payload, status = list_buddies(current_user_id())
    return payload, status


@buddy_bp.post("/buddies")
@login_required
def api_create_buddy():
    body = request.get_json(silent=True) or {}
    payload, status = create_buddy(current_user_id(), body.get("name"))
    return payload, status


@buddy_bp.get("/buddies/feed")
@login_required
def api_buddy_feed():
    payload, status = buddy_feed(current_user_id())
    return payload, status


@buddy_bp.get("/buddies/<buddy_id>")
@login_required
def api_get_buddy(buddy_id):
    payload, status = get_buddy(current_user_id(), buddy_id)
    return payload, status


@buddy_bp.put("/buddies/<buddy_id>")
@login_required
def api_rename_buddy(buddy_id):
    body = request.get_json(silent=True) or {}
    payload, status = rename_buddy(current_user_id(), buddy_id, body.get("name"))
    return payload, status


@buddy_bp.post("/buddies/<buddy_id>/leave")
@login_required
def api_leave_buddy(buddy_id):
    payload, status = leave_buddy(current_user_id(), buddy_id)
    return payload, status


@buddy_bp.delete("/buddies/<buddy_id>/members/<target_user_id>")
@login_required
def api_remove_buddy_member(buddy_id, target_user_id):
    payload, status = remove_buddy_member(current_user_id(), buddy_id, target_user_id)
    return payload, status


# ---------- Invites ----------
@buddy_bp.get("/buddy-invites")
@login_required
def api_list_invites():
    payload, status = list_my_invites(current_user_id())
    return payload, status


@buddy_bp.post("/buddies/<buddy_id>/invites")
@login_required
def api_invite_to_buddy(buddy_id):
    body = request.get_json(silent=True) or {}
    payload, status = invite_to_buddy(current_user_id(), buddy_id, body.get("username"))
    return payload, status


@buddy_bp.post("/buddy-invites/<invite_id>/accept")
@login_required
def api_accept_invite(invite_id):
    payload, status = accept_invite(current_user_id(), invite_id)
    return payload, status


@buddy_bp.post("/buddy-invites/<invite_id>/decline")
@login_required
def api_decline_invite(invite_id):
    payload, status = decline_invite(current_user_id(), invite_id)
    return payload, status


# ---------- Planned climbs ----------
@buddy_bp.get("/planned-climbs")
@login_required
def api_list_planned_climbs():
    payload, status = list_planned_climbs(current_user_id())
    return payload, status


@buddy_bp.post("/planned-climbs")
@login_required
def api_create_planned_climb():
    body = request.get_json(silent=True) or {}
    payload, status = create_planned_climb(current_user_id(), body)
    return payload, status


@buddy_bp.delete("/planned-climbs/<plan_id>")
@login_required
def api_cancel_planned_climb(plan_id):
    payload, status = cancel_planned_climb(current_user_id(), plan_id)
    return payload, status
