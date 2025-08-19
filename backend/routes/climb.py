from __future__ import annotations
from flask import Blueprint, jsonify, session
from utils.auth import login_required
from utils.security import SESSION_KEY
