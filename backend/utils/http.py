from flask import jsonify

def ok(payload=None, status=200):
    return jsonify(payload or {}), status

def err(code: str, message: str, status=400):
    return jsonify(error={"code": code, "message": message}), status
