import json
import logging
import re
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.database import get_db
from app.security import check_rate_limit, rate_limit_response

logger = logging.getLogger(__name__)
analytics_bp = Blueprint("analytics", __name__)

EVENT_RE = re.compile(r"^[a-z][a-z0-9_]{1,39}$")
SAFE_STRING_MAX = 255
MAX_EVENTS_PER_REQUEST = 20
MAX_METADATA_BYTES = 2048

CREATE_ANALYTICS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    anonymous_id VARCHAR(120) NULL,
    event_type VARCHAR(40) NOT NULL,
    path VARCHAR(255) NULL,
    metadata JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_analytics_created (created_at),
    INDEX idx_analytics_event_created (event_type, created_at),
    INDEX idx_analytics_user_created (user_id, created_at),
    CONSTRAINT fk_analytics_user
        FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
"""

_analytics_table_ready = False


def _ensure_analytics_table(cursor):
    global _analytics_table_ready
    if _analytics_table_ready:
        return
    cursor.execute(CREATE_ANALYTICS_TABLE_SQL)
    _analytics_table_ready = True


def _safe_string(value, limit=SAFE_STRING_MAX):
    text = " ".join(str(value or "").strip().split())
    return text[:limit] or None


def _safe_metadata(value):
    if not isinstance(value, dict):
        return None

    allowed = {}
    blocked_keys = {"password", "senha", "token", "authorization", "message", "content", "photo", "image"}
    for key, raw_value in list(value.items())[:12]:
        clean_key = re.sub(r"[^\w.-]", "", str(key))[:40]
        if not clean_key or clean_key.lower() in blocked_keys:
            continue
        if isinstance(raw_value, bool) or isinstance(raw_value, (int, float)):
            allowed[clean_key] = raw_value
        elif isinstance(raw_value, str):
            allowed[clean_key] = raw_value[:160]

    if not allowed:
        return None

    encoded = json.dumps(allowed, ensure_ascii=False, separators=(",", ":"))
    if len(encoded.encode("utf8")) > MAX_METADATA_BYTES:
        return None
    return encoded


def _get_optional_user_id():
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        return int(identity) if identity is not None else None
    except Exception as exc:
        logger.debug("Token ignorado no analytics: %s", exc)
    return None


def _normalize_event(raw):
    event_type = _safe_string(raw.get("eventType") or raw.get("event_type"), 40)
    if not event_type or not EVENT_RE.match(event_type):
        return None

    return {
        "event_type": event_type,
        "anonymous_id": _safe_string(raw.get("anonymousId") or raw.get("anonymous_id"), 120),
        "path": _safe_string(raw.get("path"), 255),
        "metadata": _safe_metadata(raw.get("metadata")),
    }


@analytics_bp.route("/analytics/events", methods=["POST", "OPTIONS"])
def create_analytics_events():
    if request.method == "OPTIONS":
        return jsonify({"message": "OK"}), 200

    allowed, retry_after = check_rate_limit("analytics", 120, 60)
    if not allowed:
        return rate_limit_response(retry_after)

    payload = request.get_json(silent=True) or {}
    raw_events = payload.get("events")
    if not isinstance(raw_events, list):
        raw_events = [payload]

    events = [
        event
        for event in (_normalize_event(raw) for raw in raw_events[:MAX_EVENTS_PER_REQUEST] if isinstance(raw, dict))
        if event
    ]
    if not events:
        return jsonify({"error": "Nenhum evento valido informado"}), 400

    user_id = _get_optional_user_id()
    try:
        with get_db() as (cursor, conn):
            _ensure_analytics_table(cursor)
            cursor.executemany(
                """
                INSERT INTO analytics_events (user_id, anonymous_id, event_type, path, metadata)
                VALUES (%s, %s, %s, %s, %s)
                """,
                [
                    (
                        user_id,
                        event["anonymous_id"],
                        event["event_type"],
                        event["path"],
                        event["metadata"],
                    )
                    for event in events
                ],
            )
            conn.commit()
    except Exception as exc:
        logger.error("Erro ao salvar analytics: %s", exc)
        return jsonify({"error": "Falha ao registrar analytics"}), 500

    return jsonify({"success": True, "accepted": len(events)}), 202
