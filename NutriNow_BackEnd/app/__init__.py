import os
import logging
from datetime import timedelta
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.middleware.proxy_fix import ProxyFix
from app.routes.auth import auth_bp
from app.routes.chatbot import chatbot_bp
from app.routes.profile import profile_bp
from app.routes.fitness import fitness_bp
from app.routes.feedbacks import feedback_bp
from app.routes.calendar import google_calendar_bp
from app.routes.analytics import analytics_bp
from app.routes.billing import billing_bp
from app.database import get_db
from app.security import build_allowed_origins, env_flag, is_development
from app.services.production_checks import validate_production_environment

logger = logging.getLogger(__name__)


def _secret_or_dev_fallback(name, fallback=None):
    value = os.getenv(name) or fallback
    if value:
        if not is_development() and len(value) < 32:
            raise RuntimeError(f"{name} deve ter pelo menos 32 caracteres em producao")
        return value

    if not is_development():
        raise RuntimeError(f"{name} precisa estar configurado em producao")

    logger.warning("%s nao configurado; usando segredo temporario somente para desenvolvimento", name)
    return f"dev-only-{name.lower()}-change-me-32-chars"


def create_app():
    load_dotenv()
    validate_production_environment()
    app = Flask(__name__)

    if env_flag("TRUST_PROXY_HEADERS", not is_development()):
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_port=1, x_prefix=1)

    app.secret_key = _secret_or_dev_fallback("FLASK_SECRET_KEY")

    if is_development():
        os.environ.setdefault("OAUTHLIB_INSECURE_TRANSPORT", "1")
    else:
        os.environ.pop("OAUTHLIB_INSECURE_TRANSPORT", None)

    jwt_secret = _secret_or_dev_fallback("JWT_SECRET_KEY", app.secret_key)
    jwt_minutes = int(os.getenv("JWT_ACCESS_TOKEN_MINUTES", "9999"))
    jwt_refresh_days = int(os.getenv("JWT_REFRESH_TOKEN_DAYS", "9999"))
    jwt_cookie_samesite = os.getenv("JWT_COOKIE_SAMESITE") or ("Lax" if is_development() else "None")
    max_upload_mb = int(os.getenv("MAX_UPLOAD_MB", "5"))
    upload_folder = os.getenv("UPLOAD_FOLDER", os.path.join(os.getcwd(), "uploads"))
    chat_message_max_chars = int(os.getenv("CHAT_MESSAGE_MAX_CHARS", "8000"))

    app.config.update(
        JWT_SECRET_KEY=jwt_secret,
        JWT_ACCESS_TOKEN_EXPIRES=timedelta(minutes=jwt_minutes),
        JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=jwt_refresh_days),
        JWT_TOKEN_LOCATION=["headers", "cookies"],
        JWT_COOKIE_SECURE=env_flag("JWT_COOKIE_SECURE", not is_development()),
        JWT_COOKIE_SAMESITE=jwt_cookie_samesite,
        JWT_REFRESH_COOKIE_PATH="/refresh",
        JWT_REFRESH_CSRF_COOKIE_PATH="/",
        JWT_COOKIE_CSRF_PROTECT=True,
        MAX_CONTENT_LENGTH=max_upload_mb * 1024 * 1024,
        UPLOAD_FOLDER=upload_folder,
        CHAT_MESSAGE_MAX_CHARS=chat_message_max_chars,
    )

    jwt = JWTManager(app)

    @jwt.invalid_token_loader
    def invalid_token(reason):
        return jsonify({"error": "Sessao invalida", "code": "invalid_token", "detail": reason}), 401

    @jwt.unauthorized_loader
    def unauthorized_token(reason):
        return jsonify({"error": "Sessao ausente", "code": "authorization_required", "detail": reason}), 401

    @jwt.expired_token_loader
    def expired_token(_jwt_header, _jwt_payload):
        return jsonify({"error": "Sessao expirada", "code": "token_expired"}), 401

    @jwt.revoked_token_loader
    def revoked_token(_jwt_header, _jwt_payload):
        return jsonify({"error": "Sessao revogada", "code": "token_revoked"}), 401

    @jwt.needs_fresh_token_loader
    def needs_fresh_token(_jwt_header, _jwt_payload):
        return jsonify({"error": "Sessao precisa ser renovada", "code": "fresh_token_required"}), 401

    allowed_origins = build_allowed_origins()

    CORS(
        app,
        origins=allowed_origins,
        supports_credentials=env_flag("CORS_SUPPORTS_CREDENTIALS", True),
        allow_headers=["Content-Type", "Authorization", "X-Session-ID", "X-CSRF-TOKEN"],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    )

    app.register_blueprint(auth_bp)
    app.register_blueprint(chatbot_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(fitness_bp)
    app.register_blueprint(feedback_bp)
    app.register_blueprint(google_calendar_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(billing_bp)

    @app.route("/health", methods=["GET"])
    def health():
        return jsonify({"status": "ok"})

    @app.route("/health/ready", methods=["GET"])
    def ready():
        try:
            with get_db() as (cursor, conn):
                cursor.execute("SELECT 1 AS ok")
                cursor.fetchone()
            return jsonify({"status": "ok", "checks": {"database": "ok"}})
        except Exception as exc:
            logger.error("Readiness check falhou: %s", exc)
            return jsonify({"status": "error", "checks": {"database": "error"}}), 503

    frontend_dist = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "Nutrinow_Frontend", "dist")
    )

    @app.route("/", defaults={"path": ""}, methods=["GET"])
    @app.route("/<path:path>", methods=["GET"])
    def serve_frontend(path):
        index_path = os.path.join(frontend_dist, "index.html")
        requested_path = os.path.abspath(os.path.join(frontend_dist, path))

        if path and requested_path.startswith(frontend_dist) and os.path.isfile(requested_path):
            cache_seconds = 31536000 if path.startswith("assets/") else 0
            response = send_from_directory(frontend_dist, path, max_age=cache_seconds)
            if path.startswith("assets/"):
                response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
            else:
                response.headers["Cache-Control"] = "no-cache, max-age=0"
            return response

        if os.path.isfile(index_path):
            return send_from_directory(frontend_dist, "index.html", max_age=0)

        return jsonify({"error": "Frontend estatico nao encontrado. Rode npm --prefix ../Nutrinow_Frontend run build antes de iniciar o backend."}), 404

    @app.errorhandler(RequestEntityTooLarge)
    def request_entity_too_large(_error):
        return jsonify({"error": "Arquivo excede o limite permitido"}), 413

    @app.after_request
    def add_security_headers(response):
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("X-Frame-Options", "DENY")
        if request.endpoint == "serve_frontend":
            response.headers.setdefault(
                "Content-Security-Policy",
                "default-src 'self'; "
                "script-src 'self'; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data:; "
                "connect-src 'self' http://127.0.0.1:8000 http://localhost:8000; "
                "frame-ancestors 'none'",
            )
        else:
            response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
        if not is_development():
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response

    return app
