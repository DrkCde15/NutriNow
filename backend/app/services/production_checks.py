import os
from urllib.parse import urlparse
from app.security import app_environment, env_flag, is_development, normalize_origin


class ProductionConfigError(RuntimeError):
    pass


REQUIRED_PRODUCTION_ENV = [
    "FLASK_SECRET_KEY",
    "JWT_SECRET_KEY",
    "MYSQL_HOST",
    "MYSQL_USER",
    "MYSQL_PASSWORD",
    "MYSQL_DATABASE",
    "GROQ_API_KEY",
    "GROQ_BASE_URL",
    "GROQ_PRIMARY_MODEL",
    "GROQ_VISION_MODEL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "GOOGLE_LOGIN_REDIRECT_URI",
    "EMAIL_SENDER",
    "EMAIL_PASSWORD",
]

SECRET_ENV = ["FLASK_SECRET_KEY", "JWT_SECRET_KEY", "GOOGLE_CLIENT_SECRET", "EMAIL_PASSWORD"]
FRONTEND_ENV = ["FRONTEND_URL_PROD", "CORS_ORIGIN_PROD", "CORS_ORIGINS_PROD", "FRONTEND_URL", "CORS_ORIGIN", "CORS_ORIGINS"]
HTTPS_ENV = ["FRONTEND_URL_PROD", "FRONTEND_URL", "GOOGLE_LOGIN_REDIRECT_URI"]


def _value(name):
    return (os.getenv(name) or "").strip()


def _is_https_url(value):
    parsed = urlparse(value)
    return parsed.scheme == "https" and bool(parsed.netloc)


def _configured_origins():
    origins = []
    for name in FRONTEND_ENV:
        for item in _value(name).split(","):
            origin = normalize_origin(item)
            if origin and origin not in origins:
                origins.append(origin)
    return origins


def validate_production_environment(force=False):
    if not force and is_development():
        return []
    if env_flag("DISABLE_PRODUCTION_VALIDATION", False):
        return []

    issues = []
    env = app_environment()
    if env not in {"production", "prod"}:
        issues.append("APP_ENV deve ser 'production' em deploy comercial.")

    for name in REQUIRED_PRODUCTION_ENV:
        if not _value(name):
            issues.append(f"{name} precisa estar configurado.")

    for name in SECRET_ENV:
        value = _value(name)
        if value and len(value) < 32:
            issues.append(f"{name} deve ter pelo menos 32 caracteres.")
        if value.lower().startswith(("troque_", "change_me", "dev-only", "sua_senha")):
            issues.append(f"{name} parece ser valor de exemplo/desenvolvimento.")

    origins = _configured_origins()
    if not origins:
        issues.append("Configure FRONTEND_URL_PROD ou CORS_ORIGINS_PROD.")
    for origin in origins:
        if not origin.startswith("https://"):
            issues.append(f"Origem de frontend em produção deve usar HTTPS: {origin}")

    for name in HTTPS_ENV:
        value = _value(name)
        if value and not _is_https_url(value):
            issues.append(f"{name} deve ser uma URL HTTPS válida.")

    if not env_flag("JWT_COOKIE_SECURE", True):
        issues.append("JWT_COOKIE_SECURE deve ser true em produção.")

    if _value("JWT_COOKIE_SAMESITE").lower() == "none" and not env_flag("JWT_COOKIE_SECURE", True):
        issues.append("JWT_COOKIE_SAMESITE=None exige JWT_COOKIE_SECURE=true.")

    max_upload_mb = _value("MAX_UPLOAD_MB")
    if max_upload_mb:
        try:
            upload_limit = int(max_upload_mb)
            if upload_limit < 1 or upload_limit > 20:
                issues.append("MAX_UPLOAD_MB deve ficar entre 1 e 20 para produção.")
        except ValueError:
            issues.append("MAX_UPLOAD_MB deve ser numérico.")

    if issues:
        raise ProductionConfigError("Configuração de produção incompleta: " + " ".join(issues))
    return []


if __name__ == "__main__":
    validate_production_environment(force=True)
    print("Configuração de produção validada com sucesso.")
