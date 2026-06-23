import hmac
import logging
import os

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_db
from app.security import validate_email
from app.services import cakto_service
from app.services.access_control import account_is_premium
from app.services.account_cache import invalidate_cached_account
from app.services.schema_cache import ensure_usuario_access_columns

logger = logging.getLogger(__name__)
billing_bp = Blueprint("billing", __name__)

ACTIVATE_EVENTS = {"purchase_approved", "subscription_created", "subscription_renewed"}
DEACTIVATE_EVENTS = {"refund", "chargeback", "subscription_canceled", "subscription_renewal_refused"}


def _webhook_secret():
    return (os.getenv("CAKTO_WEBHOOK_SECRET") or os.getenv("WEBHOOK_KEY") or "").strip()


def _provided_secret(payload):
    return (
        request.headers.get("X-Cakto-Secret")
        or request.headers.get("X-Cakto-Webhook-Secret")
        or request.headers.get("X-Webhook-Secret")
        or payload.get("secret")
        or ""
    )


def _webhook_secret_is_valid(payload):
    configured = _webhook_secret()
    if not configured:
        logger.error("CAKTO_WEBHOOK_SECRET nao configurado — webhook rejeitado por seguranca")
        return False
    return hmac.compare_digest(str(_provided_secret(payload)), configured)


def _find_user(cursor, ref_id, email):
    ref_user_id = cakto_service.user_id_from_ref(ref_id)
    if ref_user_id:
        cursor.execute(
            """
            SELECT id, email, is_premium, premium_expires_at
            FROM usuarios
            WHERE id=%s
            LIMIT 1
            """,
            (ref_user_id,),
        )
        user = cursor.fetchone()
        if user:
            return user

    normalized_email = validate_email(email)
    if normalized_email:
        cursor.execute(
            """
            SELECT id, email, is_premium, premium_expires_at
            FROM usuarios
            WHERE email=%s
            LIMIT 1
            """,
            (normalized_email,),
        )
        return cursor.fetchone()

    return None


def _set_user_premium(cursor, user_id, enabled, expires_at=None):
    cursor.execute(
        """
        UPDATE usuarios
        SET is_premium=%s, premium_expires_at=%s
        WHERE id=%s
        """,
        (1 if enabled else 0, expires_at if enabled else None, user_id),
    )


def _confirm_paid_order(payload):
    order_id = cakto_service.extract_order_id(payload)
    if not order_id:
        return False, "missing_order_id", None

    order = cakto_service.get_order(order_id)
    if not cakto_service.is_paid_order(order):
        return False, "order_not_paid", order

    return True, "order_paid", order


def _confirm_inactive_order(payload):
    if _webhook_secret():
        return True, "webhook_secret_valid", None

    order_id = cakto_service.extract_order_id(payload)
    if not order_id:
        return False, "missing_order_id", None

    order = cakto_service.get_order(order_id)
    if not cakto_service.is_inactive_order(order):
        return False, "order_not_inactive", order

    return True, "order_inactive", order


@billing_bp.route("/billing/checkout", methods=["POST"])
@jwt_required()
def create_checkout():
    user_id = get_jwt_identity()
    try:
        with get_db() as (cursor, conn):
            ensure_usuario_access_columns(cursor)
            cursor.execute(
                """
                SELECT id, email, is_premium, premium_expires_at
                FROM usuarios
                WHERE id=%s
                LIMIT 1
                """,
                (user_id,),
            )
            user = cursor.fetchone()

        if not user:
            return jsonify({"error": "Usuario nao encontrado"}), 404

        checkout_url = cakto_service.build_checkout_url(user["id"])
        return jsonify(
            {
                "checkout_url": checkout_url,
                "alreadyPremium": account_is_premium(user),
            }
        ), 200
    except cakto_service.CaktoConfigError as exc:
        logger.warning("Checkout Cakto nao configurado: %s", exc)
        return jsonify({"error": "Pagamento nao configurado"}), 503
    except Exception as exc:
        logger.error("Erro ao criar checkout Cakto: %s", exc)
        return jsonify({"error": "Falha ao iniciar pagamento"}), 500


@billing_bp.route("/billing/webhook/cakto", methods=["POST"])
def cakto_webhook():
    payload = request.get_json(silent=True) or {}
    if not isinstance(payload, dict) or not payload:
        return jsonify({"error": "Payload invalido"}), 400

    if not _webhook_secret_is_valid(payload):
        return jsonify({"error": "Webhook nao autorizado"}), 401

    event = cakto_service.extract_event(payload)
    if not event:
        return jsonify({"error": "Evento ausente"}), 400

    if event not in ACTIVATE_EVENTS and event not in DEACTIVATE_EVENTS:
        return jsonify({"processed": False, "event": event, "reason": "event_ignored"}), 200

    ref_id = cakto_service.extract_ref_id(payload)
    email = cakto_service.extract_customer_email(payload)

    try:
        with get_db() as (cursor, conn):
            ensure_usuario_access_columns(cursor)
            user = _find_user(cursor, ref_id, email)
            if not user:
                logger.warning("Webhook Cakto sem usuario correspondente: event=%s ref_id=%s", event, ref_id)
                return jsonify({"processed": False, "event": event, "reason": "user_not_found"}), 202

            if event in ACTIVATE_EVENTS:
                confirmed, reason, order = _confirm_paid_order(payload)
                if not confirmed:
                    return jsonify({"processed": False, "event": event, "reason": reason}), 202

                expires_at = cakto_service.extract_expires_at(payload) or cakto_service.extract_expires_at(order or {})
                _set_user_premium(cursor, user["id"], True, expires_at)
                conn.commit()
                invalidate_cached_account(user["id"])
                return jsonify(
                    {
                        "processed": True,
                        "event": event,
                        "action": "activated",
                        "user_id": user["id"],
                    }
                ), 200

            confirmed, reason, _order = _confirm_inactive_order(payload)
            if not confirmed:
                return jsonify({"processed": False, "event": event, "reason": reason}), 202

            _set_user_premium(cursor, user["id"], False)
            conn.commit()
            invalidate_cached_account(user["id"])
            return jsonify(
                {
                    "processed": True,
                    "event": event,
                    "action": "deactivated",
                    "user_id": user["id"],
                }
            ), 200
    except cakto_service.CaktoConfigError as exc:
        logger.warning("Webhook Cakto sem configuracao para validacao ativa: %s", exc)
        return jsonify({"processed": False, "event": event, "reason": "cakto_not_configured"}), 202
    except cakto_service.CaktoApiError as exc:
        logger.error("Falha na validacao ativa da Cakto: %s", exc)
        return jsonify({"error": "Falha ao validar pagamento"}), 502
    except Exception as exc:
        logger.error("Erro ao processar webhook Cakto: %s", exc)
        return jsonify({"error": "Falha ao processar webhook"}), 500
