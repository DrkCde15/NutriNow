import logging
import os
import time
from datetime import datetime
from threading import Lock
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import requests

logger = logging.getLogger(__name__)

PAID_STATUSES = {"paid", "approved"}
INACTIVE_STATUSES = {
    "canceled",
    "cancelled",
    "chargeback",
    "refunded",
    "refund",
    "subscription_canceled",
    "subscription_renewal_refused",
}

_token_cache = {"access_token": None, "expires_at": 0}
_token_lock = Lock()


class CaktoConfigError(RuntimeError):
    pass


class CaktoApiError(RuntimeError):
    pass


def _env(*names):
    for name in names:
        value = os.getenv(name)
        if value:
            return value.strip()
    return ""


def _timeout_seconds():
    try:
        return int(_env("CAKTO_TIMEOUT_SECONDS") or "12")
    except ValueError:
        return 12


def _base_url():
    value = _env("BASE_URL_CAKTO", "CAKTO_BASE_URL") or "https://api.cakto.com.br/"
    return value.rstrip("/") + "/"


def _api_url(path):
    return f"{_base_url()}{path.lstrip('/')}"


def _checkout_link():
    link = _env("CHECKOUT_LINK", "CAKTO_CHECKOUT_URL")
    if not link:
        raise CaktoConfigError("CHECKOUT_LINK precisa estar configurado")

    parsed = urlsplit(link)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise CaktoConfigError("CHECKOUT_LINK deve ser uma URL http/https valida")
    return link


def checkout_ref_id(user_id):
    return f"nutrinow_user_{user_id}"


def user_id_from_ref(ref_id):
    value = str(ref_id or "").strip()
    prefix = "nutrinow_user_"
    if value.startswith(prefix):
        candidate = value[len(prefix) :]
        return candidate if candidate.isdigit() else None
    return value if value.isdigit() else None


def build_checkout_url(user_id):
    parsed = urlsplit(_checkout_link())
    params = dict(parse_qsl(parsed.query, keep_blank_values=True))
    params["refId"] = checkout_ref_id(user_id)
    params.setdefault("utm_source", "nutrinow")
    return urlunsplit(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            urlencode(params),
            parsed.fragment,
        )
    )


def get_access_token():
    now = time.monotonic()
    with _token_lock:
        if _token_cache["access_token"] and _token_cache["expires_at"] > now:
            return _token_cache["access_token"]

    client_id = _env("CAKTO_CLIENT_ID")
    client_secret = _env("CAKTO_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise CaktoConfigError("Credenciais OAuth da Cakto nao configuradas")

    try:
        response = requests.post(
            _api_url("/public_api/token/"),
            data={"client_id": client_id, "client_secret": client_secret},
            headers={"Accept": "application/json"},
            timeout=_timeout_seconds(),
        )
    except requests.RequestException as exc:
        raise CaktoApiError("Falha ao autenticar na Cakto") from exc

    if not response.ok:
        logger.warning("Cakto recusou token OAuth: HTTP %s", response.status_code)
        raise CaktoApiError("Cakto recusou a autenticacao")

    try:
        data = response.json()
    except ValueError as exc:
        raise CaktoApiError("Resposta de token da Cakto nao e JSON valido") from exc

    access_token = data.get("access_token")
    if not access_token:
        raise CaktoApiError("Resposta da Cakto sem access_token")

    try:
        expires_in = int(data.get("expires_in") or 3600)
    except (TypeError, ValueError):
        expires_in = 3600

    with _token_lock:
        _token_cache["access_token"] = access_token
        _token_cache["expires_at"] = time.monotonic() + max(60, expires_in - 60)

    return access_token


def get_order(order_id):
    if not order_id:
        return None

    token = get_access_token()
    try:
        response = requests.get(
            _api_url(f"/public_api/orders/{order_id}/"),
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            timeout=_timeout_seconds(),
        )
    except requests.RequestException as exc:
        raise CaktoApiError("Falha ao consultar pedido na Cakto") from exc

    if not response.ok:
        logger.warning("Cakto recusou consulta do pedido %s: HTTP %s", order_id, response.status_code)
        raise CaktoApiError("Cakto recusou a consulta do pedido")

    try:
        return response.json()
    except ValueError as exc:
        raise CaktoApiError("Resposta de pedido da Cakto nao e JSON valido") from exc


def _get_path(payload, *path):
    current = payload
    for key in path:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
    return current


def extract_event(payload):
    return str(
        payload.get("event")
        or payload.get("event_name")
        or payload.get("type")
        or _get_path(payload, "data", "event")
        or ""
    ).strip().lower()


def extract_order_id(payload):
    paths = (
        ("data", "id"),
        ("data", "order_id"),
        ("data", "orderId"),
        ("data", "order", "id"),
        ("data", "order", "order_id"),
        ("id",),
        ("order_id",),
        ("orderId",),
        ("order", "id"),
    )
    for path in paths:
        value = _get_path(payload, *path)
        if value:
            return str(value).strip()
    return ""


def extract_ref_id(payload):
    paths = (
        ("data", "refId"),
        ("data", "ref_id"),
        ("data", "reference"),
        ("data", "external_reference"),
        ("data", "externalReference"),
        ("data", "checkout", "refId"),
        ("data", "subscription", "refId"),
        ("refId",),
        ("ref_id",),
        ("reference",),
        ("external_reference",),
        ("externalReference",),
    )
    for path in paths:
        value = _get_path(payload, *path)
        if value:
            return str(value).strip()
    return ""


def extract_customer_email(payload):
    paths = (
        ("data", "customer", "email"),
        ("data", "email"),
        ("customer", "email"),
        ("email",),
    )
    for path in paths:
        value = _get_path(payload, *path)
        if value:
            return str(value).strip().lower()
    return ""


def _extract_status(payload):
    paths = (
        ("status",),
        ("payment_status",),
        ("paymentStatus",),
        ("data", "status"),
        ("data", "payment_status"),
        ("data", "paymentStatus"),
        ("order", "status"),
        ("data", "order", "status"),
    )
    for path in paths:
        value = _get_path(payload, *path)
        if value:
            return str(value).strip().lower()
    return ""


def is_paid_order(order):
    return _extract_status(order or {}) in PAID_STATUSES


def is_inactive_order(order):
    return _extract_status(order or {}) in INACTIVE_STATUSES


def _parse_datetime(value):
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        normalized = value.replace("Z", "+00:00")
        try:
            return datetime.fromisoformat(normalized).replace(tzinfo=None)
        except ValueError:
            pass
        for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
            try:
                return datetime.strptime(value, fmt)
            except ValueError:
                continue
    return None


def extract_expires_at(payload):
    paths = (
        ("data", "subscription", "currentPeriodEnd"),
        ("data", "subscription", "current_period_end"),
        ("data", "subscription", "nextBillingAt"),
        ("data", "subscription", "next_billing_at"),
        ("data", "subscription", "nextPaymentAt"),
        ("data", "subscription", "next_payment_at"),
        ("data", "expiresAt"),
        ("data", "expires_at"),
        ("subscription", "currentPeriodEnd"),
        ("subscription", "current_period_end"),
        ("expiresAt",),
        ("expires_at",),
    )
    for path in paths:
        parsed = _parse_datetime(_get_path(payload, *path))
        if parsed:
            return parsed
    return None
