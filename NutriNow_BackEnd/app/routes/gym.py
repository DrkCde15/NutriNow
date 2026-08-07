import logging
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.security import check_rate_limit, rate_limit_response
from app.services.gym_service import DEFAULT_RADIUS_KM, MAX_RADIUS_KM, buscar_academias_proximas

logger = logging.getLogger(__name__)
gym_bp = Blueprint("gym", __name__)


def _parse_coord(value):
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if not (-90 <= parsed <= 90):
        return None
    return parsed


@gym_bp.route("/academias/nearby", methods=["GET"])
@jwt_required()
def academias_nearby():
    user_id = get_jwt_identity()
    allowed, retry_after = check_rate_limit("academias", 60, 3600, user_id)
    if not allowed:
        return rate_limit_response(retry_after)

    lat = _parse_coord(request.args.get("lat"))
    lng = _parse_coord(request.args.get("lng"))
    if lat is None or lng is None:
        return jsonify({"error": "Informe latitude e longitude validas"}), 400

    try:
        radius = float(request.args.get("radius", DEFAULT_RADIUS_KM))
    except (TypeError, ValueError):
        radius = DEFAULT_RADIUS_KM
    radius = max(1, min(MAX_RADIUS_KM, radius))

    try:
        academias = buscar_academias_proximas(lat, lng, radius)
    except RuntimeError:
        return jsonify({"error": "Servico de academias indisponivel no momento"}), 502

    return jsonify({"success": True, "count": len(academias), "academias": academias}), 200
