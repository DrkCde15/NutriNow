from datetime import datetime
from functools import wraps

from flask import jsonify
from flask_jwt_extended import get_jwt_identity

from app.database import get_db
from app.services.account_cache import get_cached_account
from app.services.schema_cache import ensure_usuario_access_columns

USER_ROLE = "user"
NUTRITIONIST_ROLE = "nutritionist"
PERSONAL_TRAINER_ROLE = "personal_trainer"
ROLE_VALUES = (USER_ROLE, NUTRITIONIST_ROLE, PERSONAL_TRAINER_ROLE)
PROFESSIONAL_ROLES = (NUTRITIONIST_ROLE, PERSONAL_TRAINER_ROLE)
ROLE_LABELS = {
    USER_ROLE: "Usuario comum",
    NUTRITIONIST_ROLE: "Nutricionista",
    PERSONAL_TRAINER_ROLE: "Personal Trainer",
}
ROLE_CAPABILITIES = {
    USER_ROLE: frozenset(),
    NUTRITIONIST_ROLE: frozenset({"patients", "notes", "diet"}),
    PERSONAL_TRAINER_ROLE: frozenset({"patients", "notes", "workout"}),
}

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


def normalize_role(value):
    role = str(value or USER_ROLE).strip()
    return role if role in ROLE_VALUES else USER_ROLE


def is_professional_role(role):
    return normalize_role(role) in PROFESSIONAL_ROLES


def role_has_capability(role, capability):
    return capability in ROLE_CAPABILITIES.get(normalize_role(role), frozenset())


def _load_account_access(user_id):
    with get_db() as (cursor, conn):
        ensure_usuario_access_columns(cursor)
        cursor.execute(
            """
            SELECT id, is_premium, premium_expires_at, role
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


def user_role(user_id):
    cached_account = get_cached_account(user_id)
    if cached_account and "role" in cached_account:
        return normalize_role(cached_account["role"])

    user = _load_account_access(user_id)
    if not user:
        return USER_ROLE
    return normalize_role(user.get("role"))


def premium_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        if not user_id or not user_has_premium(user_id):
            return jsonify(PREMIUM_REQUIRED_RESPONSE), 402
        return view_func(*args, **kwargs)

    return wrapper


def professional_required(view_func):
    @wraps(view_func)
    def wrapper(*args, **kwargs):
        user_id = get_jwt_identity()
        if not user_id:
            return jsonify({"error": "Nao autenticado"}), 401
        role = user_role(user_id)
        if not is_professional_role(role):
            return jsonify({"error": "Recurso exclusivo para profissionais da saude"}), 403
        return view_func(*args, **kwargs)

    return wrapper


def role_capability_required(capability, error_message=None):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(*args, **kwargs):
            user_id = get_jwt_identity()
            if not user_id:
                return jsonify({"error": "Nao autenticado"}), 401
            if not role_has_capability(user_role(user_id), capability):
                return jsonify({"error": error_message or "Perfil profissional sem permissao para este recurso"}), 403
            return view_func(*args, **kwargs)

        return wrapper

    return decorator
