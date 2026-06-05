import logging
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.database import get_db
from app.routes.calendar import delete_google_calendar_item, sync_google_calendar_item
from app.services.access_control import premium_required
from app.services.runtime_cache import TTLCache
from app.services.schema_cache import ensure_dieta_treino_schedule_columns

logger = logging.getLogger(__name__)
fitness_bp = Blueprint("fitness", __name__)

WEEKDAY_ORDER = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]
ITEMS_CACHE_SECONDS = 20
BLOCKING_CALENDAR_DELETE_REASONS = {"google_error", "not_connected", "server_error"}

_items_cache = TTLCache(ttl_seconds=ITEMS_CACHE_SECONDS, max_items=512)


def _ensure_dieta_treino_schedule_columns(cursor):
    ensure_dieta_treino_schedule_columns(cursor)


def _items_cache_key(user_id, tipo):
    return (str(user_id), tipo)


def _invalidate_items_cache(user_id):
    _items_cache.invalidate_prefix((str(user_id),))


def _parse_recurrence_days(value):
    if isinstance(value, list):
        parts = value
    else:
        parts = str(value or "").split(",")

    days = []
    for part in parts:
        day = str(part).strip().upper()
        if day in WEEKDAY_ORDER and day not in days:
            days.append(day)
    return days


def _parse_duration_minutes(value):
    try:
        minutes = int(value)
    except (TypeError, ValueError):
        return 60
    return min(max(minutes, 15), 12 * 60)


def _parse_scheduled_at(data):
    date_value = str(data.get("date") or data.get("created_at") or data.get("startsAt") or "").strip()
    if not date_value:
        return None

    try:
        scheduled_at = datetime.strptime(date_value[:10], "%Y-%m-%d")
    except ValueError as exc:
        raise ValueError("Informe uma data valida") from exc

    time_value = str(data.get("time") or "").strip()
    if len(time_value) == 5 and time_value[2] == ":":
        try:
            hours, minutes = [int(part) for part in time_value.split(":")]
        except ValueError as exc:
            raise ValueError("Informe um horario valido") from exc
        scheduled_at = scheduled_at.replace(hour=hours, minute=minutes)

    return scheduled_at


def _parse_schedule_payload(data):
    scheduled_at = _parse_scheduled_at(data)
    duration_minutes = _parse_duration_minutes(data.get("durationMinutes") or data.get("duration_minutes"))
    recurrence_type = str(data.get("recurrenceType") or data.get("recurrence_type") or "none").lower()
    recurrence_days = _parse_recurrence_days(data.get("recurrenceDays") or data.get("recurrence_days"))
    recurrence_until = str(data.get("recurrenceUntil") or data.get("recurrence_until") or "").strip()[:10]

    if recurrence_type != "weekly":
        return scheduled_at, duration_minutes, "none", None, None

    if not scheduled_at:
        raise ValueError("Informe a data inicial da recorrencia")
    if not recurrence_days:
        raise ValueError("Selecione pelo menos um dia da semana")

    if recurrence_until:
        until_date = datetime.strptime(recurrence_until, "%Y-%m-%d").date()
        if until_date < scheduled_at.date():
            raise ValueError("A data final deve ser depois da data inicial")
    else:
        recurrence_until = None

    selected_weekdays = [WEEKDAY_ORDER.index(day) for day in recurrence_days]
    for offset in range(7):
        candidate = scheduled_at + timedelta(days=offset)
        if candidate.weekday() in selected_weekdays:
            scheduled_at = candidate
            break

    return scheduled_at, duration_minutes, "weekly", ",".join(recurrence_days), recurrence_until


@fitness_bp.route("/dieta-treino", methods=["GET"])
@jwt_required()
@premium_required
def get_items():
    user_id = get_jwt_identity()
    aba = request.args.get("tipo", "treinos")
    tipo = "treino" if "treino" in str(aba).lower() else "dieta"
    cache_key = _items_cache_key(user_id, tipo)
    cached_items = _items_cache.get(cache_key)
    if cached_items is not None:
        return jsonify({"success": True, "items": cached_items}), 200

    try:
        with get_db() as (cursor, conn):
            _ensure_dieta_treino_schedule_columns(cursor)
            cursor.execute(
                """
                SELECT
                    id,
                    title,
                    description,
                    time,
                    tipo,
                    created_at,
                    updated_at,
                    duration_minutes,
                    recurrence_type,
                    recurrence_days,
                    DATE_FORMAT(recurrence_until, '%Y-%m-%d') AS recurrence_until
                FROM dieta_treino
                WHERE user_id=%s AND tipo=%s
                ORDER BY created_at ASC
                """,
                (user_id, tipo),
            )
            items = cursor.fetchall()
            _items_cache.set(cache_key, items)
            return jsonify({"success": True, "items": items}), 200
    except Exception as e:
        logger.error(f"Erro ao buscar itens: {e}")
        return jsonify({"error": "Falha ao buscar itens"}), 500


@fitness_bp.route("/dieta-treino", methods=["POST"])
@jwt_required()
@premium_required
def add_item():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    title = data.get("title")
    description = data.get("description")
    time = data.get("time")
    aba = str(data.get("tipo", "")).lower()

    if not all([title, description, aba]):
        return jsonify({"error": "Campos obrigatorios ausentes"}), 400

    try:
        scheduled_at, duration_minutes, recurrence_type, recurrence_days, recurrence_until = _parse_schedule_payload(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    tipo = "treino" if "treino" in aba else "dieta"
    try:
        with get_db() as (cursor, conn):
            _ensure_dieta_treino_schedule_columns(cursor)

            if scheduled_at:
                cursor.execute(
                    """
                    INSERT INTO dieta_treino (
                        user_id,
                        tipo,
                        title,
                        description,
                        time,
                        created_at,
                        updated_at,
                        duration_minutes,
                        recurrence_type,
                        recurrence_days,
                        recurrence_until
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        user_id,
                        tipo,
                        title,
                        description,
                        time,
                        scheduled_at,
                        scheduled_at,
                        duration_minutes,
                        recurrence_type,
                        recurrence_days,
                        recurrence_until,
                    ),
                )
            else:
                cursor.execute(
                    """
                    INSERT INTO dieta_treino (
                        user_id,
                        tipo,
                        title,
                        description,
                        time,
                        duration_minutes,
                        recurrence_type,
                        recurrence_days,
                        recurrence_until
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        user_id,
                        tipo,
                        title,
                        description,
                        time,
                        duration_minutes,
                        recurrence_type,
                        recurrence_days,
                        recurrence_until,
                    ),
                )

            item_id = cursor.lastrowid
            conn.commit()

        _invalidate_items_cache(user_id)
        calendar_sync = sync_google_calendar_item(user_id, item_id)
        return (
            jsonify(
                {
                    "success": True,
                    "message": "Item adicionado com sucesso!",
                    "googleCalendar": calendar_sync,
                }
            ),
            201,
        )
    except Exception as e:
        logger.error(f"Erro ao adicionar item: {e}")
        return jsonify({"error": "Falha ao adicionar item"}), 500


@fitness_bp.route("/dieta-treino/<int:item_id>", methods=["PUT"])
@jwt_required()
@premium_required
def update_item(item_id):
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    title = data.get("title")
    description = data.get("description")
    time = data.get("time")
    aba = str(data.get("tipo", "")).lower()

    if not all([title, description, aba]):
        return jsonify({"error": "Campos obrigatorios ausentes"}), 400

    try:
        scheduled_at, duration_minutes, recurrence_type, recurrence_days, recurrence_until = _parse_schedule_payload(data)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    tipo = "treino" if "treino" in aba else "dieta"
    try:
        with get_db() as (cursor, conn):
            _ensure_dieta_treino_schedule_columns(cursor)

            if scheduled_at:
                cursor.execute(
                    """
                    UPDATE dieta_treino
                    SET
                        title=%s,
                        description=%s,
                        time=%s,
                        tipo=%s,
                        created_at=%s,
                        updated_at=%s,
                        duration_minutes=%s,
                        recurrence_type=%s,
                        recurrence_days=%s,
                        recurrence_until=%s
                    WHERE id=%s AND user_id=%s
                    """,
                    (
                        title,
                        description,
                        time,
                        tipo,
                        scheduled_at,
                        datetime.now(),
                        duration_minutes,
                        recurrence_type,
                        recurrence_days,
                        recurrence_until,
                        item_id,
                        user_id,
                    ),
                )
            else:
                cursor.execute(
                    """
                    UPDATE dieta_treino
                    SET
                        title=%s,
                        description=%s,
                        time=%s,
                        tipo=%s,
                        updated_at=%s,
                        duration_minutes=%s,
                        recurrence_type=%s,
                        recurrence_days=%s,
                        recurrence_until=%s
                    WHERE id=%s AND user_id=%s
                    """,
                    (
                        title,
                        description,
                        time,
                        tipo,
                        datetime.now(),
                        duration_minutes,
                        recurrence_type,
                        recurrence_days,
                        recurrence_until,
                        item_id,
                        user_id,
                    ),
                )

            updated = cursor.rowcount
            conn.commit()

        _invalidate_items_cache(user_id)
        if updated == 0:
            return jsonify({"error": "Item nao encontrado"}), 404

        calendar_sync = sync_google_calendar_item(user_id, item_id)
        return (
            jsonify(
                {
                    "success": True,
                    "message": "Item atualizado com sucesso!",
                    "googleCalendar": calendar_sync,
                }
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Erro ao atualizar item: {e}")
        return jsonify({"error": "Falha ao atualizar item"}), 500


@fitness_bp.route("/dieta-treino/<int:item_id>", methods=["DELETE"])
@jwt_required()
@premium_required
def delete_item(item_id):
    user_id = get_jwt_identity()
    try:
        with get_db() as (cursor, conn):
            cursor.execute(
                "SELECT id, tipo FROM dieta_treino WHERE id = %s AND user_id = %s",
                (item_id, user_id),
            )
            item = cursor.fetchone()

        if not item:
            return jsonify({"error": "Item nao encontrado"}), 404

        calendar_delete = delete_google_calendar_item(user_id, item_id, item.get("tipo"))
        if calendar_delete.get("reason") in BLOCKING_CALENDAR_DELETE_REASONS:
            status_code = 409 if calendar_delete.get("reason") == "not_connected" else 502
            return (
                jsonify(
                    {
                        "error": "Falha ao excluir evento sincronizado no Google Calendar",
                        "googleCalendar": calendar_delete,
                    }
                ),
                status_code,
            )

        with get_db() as (cursor, conn):
            cursor.execute("DELETE FROM dieta_treino WHERE id = %s AND user_id = %s", (item_id, user_id))
            deleted = cursor.rowcount
            conn.commit()

        _invalidate_items_cache(user_id)
        if deleted == 0:
            return jsonify({"error": "Item nao encontrado"}), 404

        return (
            jsonify(
                {
                    "success": True,
                    "message": "Item excluido com sucesso!",
                    "googleCalendar": calendar_delete,
                }
            ),
            200,
        )
    except Exception as e:
        logger.error(f"Erro ao excluir item: {e}")
        return jsonify({"error": "Falha ao excluir item"}), 500
