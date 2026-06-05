from datetime import datetime
from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity

from app.database import get_db
from app.services.account_cache import get_cached_account
from app.services.schema_cache import ensure_usuario_access_columns

PREMIUM_REQUIRED_RESPONSE = {
    "error": "Recurso exclusivo para contas premium",
    "code": "premium_required",
    "plan": "free",
}


def _to_datetime(value):
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


def _truthy(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value > 0
    return str(value or "").strip().lower() in {"1", "true", "yes", "on", "premium"}


def account_is_premium(account):
    if not account:
        return False

    is_premium = _truthy(account.get("is_premium") or account.get("premium") or account.get("plan") == "premium")
    if not is_premium:
        return False

    expires_at = _to_datetime(account.get("premium_expires_at") or account.get("premiumExpiresAt"))
    return not expires_at or expires_at > datetime.utcnow()


def account_plan(account):
    return "premium" if account_is_premium(account) else "free"


def _load_account_access(user_id):
    with get_db() as (cursor, conn):
        ensure_usuario_access_columns(cursor)
        cursor.execute(
            """
            SELECT id, is_premium, premium_expires_at
            FROM usuarios
            WHERE id=%s
            LIMIT 1
            """,
            (user_id,),
        )
        return cursor.fetchone()


def user_has_premium(user_id):
    cached_account = get_cached_account(user_id)
    if cached_account and any(key in cached_account for key in ("is_premium", "premium", "plan")):
        return account_is_premium(cached_account)

    return account_is_premium(_load_account_access(user_id))


def premium_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        if not user_id or not user_has_premium(user_id):
            return jsonify(PREMIUM_REQUIRED_RESPONSE), 402
        return view_func(*args, **kwargs)

    return wrapper
