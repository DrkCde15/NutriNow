import logging
from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_db
from app.services.access_control import premium_required
from app.services.runtime_cache import TTLCache
from app.services.schema_cache import ensure_calendario_eventos_table

logger = logging.getLogger(__name__)
calendario_bp = Blueprint("calendario", __name__)

EVENTOS_CACHE_SECONDS = 15
EVENTOS_CACHE = TTLCache(ttl_seconds=EVENTOS_CACHE_SECONDS, max_items=512)

CATEGORIAS = {"evento", "lembrete", "dieta", "treino"}


def _events_cache_key(user_id):
    return (str(user_id),)


def _invalidate_events_cache(user_id):
    EVENTOS_CACHE.invalidate_prefix((str(user_id),))


def _parse_category(value):
    categoria = (value or "evento").strip().lower()
    return categoria if categoria in CATEGORIAS else "evento"


def _parse_duration_minutes(value):
    try:
        minutes = int(value)
    except (TypeError, ValueError):
        return None
    if minutes <= 0:
        return None
    return min(minutes, 24 * 60)


def _normalize_event(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row.get("description") or "",
        "categoria": row.get("categoria") or "evento",
        "created_at": row["created_at"],
        "event_date": row["event_date"],
        "time": row.get("time") or "",
        "duration_minutes": row.get("duration_minutes"),
    }


def _parse_event_payload(data):
    title = str(data.get("title") or "").strip()
    if not title:
        raise ValueError("Informe o titulo do evento")

    event_date = str(data.get("event_date") or "").strip()[:10]
    if not event_date:
        raise ValueError("Informe a data do evento")
    try:
        datetime.strptime(event_date, "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError("Informe uma data valida (AAAA-MM-DD)") from exc

    time_value = str(data.get("time") or "").strip()
    if time_value and len(time_value) == 5 and time_value[2] == ":":
        try:
            datetime.strptime(time_value, "%H:%M")
        except ValueError as exc:
            raise ValueError("Informe um horario valido (HH:MM)") from exc

    return {
        "title": title,
        "description": str(data.get("description") or "").strip(),
        "categoria": _parse_category(data.get("categoria")),
        "event_date": event_date,
        "time": time_value or None,
        "duration_minutes": _parse_duration_minutes(data.get("duration_minutes")),
    }


@calendario_bp.route("/calendario/eventos", methods=["GET"])
@jwt_required()
@premium_required
def listar_eventos():
    user_id = get_jwt_identity()
    cache_key = _events_cache_key(user_id)
    cached = EVENTOS_CACHE.get(cache_key)
    if cached is not None:
        return jsonify({"success": True, "count": len(cached), "eventos": cached}), 200

    try:
        with get_db() as (cursor, conn):
            ensure_calendario_eventos_table(cursor)
            from_date = str(request.args.get("desde") or "").strip()[:10]
            to_date = str(request.args.get("ate") or "").strip()[:10]
            params = [user_id]
            where = "WHERE user_id=%s"
            if from_date:
                where += " AND event_date >= %s"
                params.append(from_date)
            if to_date:
                where += " AND event_date <= %s"
                params.append(to_date)

            cursor.execute(
                f"""
                SELECT
                    id,
                    title,
                    description,
                    categoria,
                    DATE_FORMAT(event_date, '%%Y-%%m-%%d') AS event_date,
                    time,
                    duration_minutes,
                    created_at
                FROM calendario_eventos
                {where}
                ORDER BY event_date ASC, time ASC, id ASC
                """,
                params,
            )
            rows = cursor.fetchall()
    except Exception as e:
        logger.error(f"Erro ao listar eventos do calendario: {e}")
        return jsonify({"error": "Falha ao listar eventos do calendario"}), 500

    eventos = [_normalize_event(row) for row in rows]
    EVENTOS_CACHE.set(cache_key, eventos)
    return jsonify({"success": True, "count": len(eventos), "eventos": eventos}), 200


@calendario_bp.route("/calendario/eventos", methods=["POST"])
@jwt_required()
@premium_required
def criar_evento():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    try:
        evento = _parse_event_payload(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    try:
        with get_db() as (cursor, conn):
            ensure_calendario_eventos_table(cursor)
            cursor.execute(
                """
                INSERT INTO calendario_eventos (
                    user_id, title, description, categoria, event_date, time, duration_minutes
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    user_id,
                    evento["title"],
                    evento["description"],
                    evento["categoria"],
                    evento["event_date"],
                    evento["time"],
                    evento["duration_minutes"],
                ),
            )
            event_id = cursor.lastrowid
            conn.commit()
    except Exception as e:
        logger.error(f"Erro ao criar evento do calendario: {e}")
        return jsonify({"error": "Falha ao criar evento do calendario"}), 500

    _invalidate_events_cache(user_id)
    new_event = {
        "id": event_id,
        **evento,
    }
    return jsonify({"success": True, "message": "Evento criado com sucesso!", "evento": new_event}), 201


@calendario_bp.route("/calendario/eventos/<int:event_id>", methods=["PUT"])
@jwt_required()
@premium_required
def atualizar_evento(event_id):
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    try:
        evento = _parse_event_payload(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    try:
        with get_db() as (cursor, conn):
            ensure_calendario_eventos_table(cursor)
            cursor.execute(
                """
                UPDATE calendario_eventos
                SET title=%s, description=%s, categoria=%s,
                    event_date=%s, time=%s, duration_minutes=%s
                WHERE id=%s AND user_id=%s
                """,
                (
                    evento["title"],
                    evento["description"],
                    evento["categoria"],
                    evento["event_date"],
                    evento["time"],
                    evento["duration_minutes"],
                    event_id,
                    user_id,
                ),
            )
            updated = cursor.rowcount
            conn.commit()
    except Exception as e:
        logger.error(f"Erro ao atualizar evento do calendario {event_id}: {e}")
        return jsonify({"error": "Falha ao atualizar evento do calendario"}), 500

    _invalidate_events_cache(user_id)
    if updated == 0:
        return jsonify({"error": "Evento nao encontrado"}), 404

    updated_event = {"id": event_id, **evento}
    return jsonify({"success": True, "message": "Evento atualizado com sucesso!", "evento": updated_event}), 200


@calendario_bp.route("/calendario/eventos/<int:event_id>", methods=["DELETE"])
@jwt_required()
@premium_required
def excluir_evento(event_id):
    user_id = get_jwt_identity()
    try:
        with get_db() as (cursor, conn):
            ensure_calendario_eventos_table(cursor)
            cursor.execute(
                "DELETE FROM calendario_eventos WHERE id=%s AND user_id=%s",
                (event_id, user_id),
            )
            deleted = cursor.rowcount
            conn.commit()
    except Exception as e:
        logger.error(f"Erro ao excluir evento do calendario {event_id}: {e}")
        return jsonify({"error": "Falha ao excluir evento do calendario"}), 500

    _invalidate_events_cache(user_id)
    if deleted == 0:
        return jsonify({"error": "Evento nao encontrado"}), 404

    return jsonify({"success": True, "message": "Evento excluido com sucesso!"}), 200