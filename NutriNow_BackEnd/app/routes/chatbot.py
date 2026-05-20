import logging
import os
import re
import unicodedata
import uuid
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.database import get_db
from app.security import check_rate_limit, rate_limit_response
from app.services.agent_service import clear_session_agent, get_agent
from app.services.account_cache import get_cached_account
from app.services.runtime_cache import TTLCache

logger = logging.getLogger(__name__)
chatbot_bp = Blueprint("chatbot", __name__)

SESSION_ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
CHAT_MESSAGE_MAX_CHARS = int(os.getenv("CHAT_MESSAGE_MAX_CHARS", "8000"))
CHAT_SESSIONS_CACHE_SECONDS = int(os.getenv("CHAT_SESSIONS_CACHE_SECONDS", "12"))
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
_chat_sessions_cache = TTLCache(ttl_seconds=CHAT_SESSIONS_CACHE_SECONDS, max_items=256)
GENERIC_CHAT_TOKENS = {
    "oi",
    "ola",
    "ok",
    "okay",
    "sim",
    "nao",
    "valeu",
    "obrigado",
    "obrigada",
    "bom",
    "boa",
    "dia",
    "tarde",
    "noite",
    "tudo",
    "bem",
}


def _normalize_session_id(value, create_if_missing=False):
    session_id = (value or "").strip()
    if not session_id and create_if_missing:
        return str(uuid.uuid4())
    if session_id and SESSION_ID_RE.match(session_id):
        return session_id
    return None


def _normalize_chat_text(value):
    text = unicodedata.normalize("NFD", str(value or ""))
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = re.sub(r"[^\w\s-]", " ", text.lower())
    return re.sub(r"\s+", " ", text).strip()


def _is_generic_chat_message(message):
    tokens = [token for token in _normalize_chat_text(message).split(" ") if token]
    return bool(tokens) and len(tokens) <= 5 and all(token in GENERIC_CHAT_TOKENS for token in tokens)


def _truncate_text(value, limit=80):
    text = re.sub(r"\s+", " ", str(value or "")).strip()
    if len(text) <= limit:
        return text
    return f"{text[: limit - 3].rstrip()}..."


def _serialize_timestamp(value):
    return value.isoformat() if hasattr(value, "isoformat") else value


def _upload_folder():
    folder = Path(current_app.config.get("UPLOAD_FOLDER") or os.getenv("UPLOAD_FOLDER") or "uploads")
    folder = folder.resolve()
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def _detect_image_extension(header):
    if header.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return ".webp"
    return None


def _validated_image_extension(file):
    original_ext = os.path.splitext(file.filename or "")[1].lower()
    if original_ext not in ALLOWED_IMAGE_EXTENSIONS:
        return None

    mimetype = (file.mimetype or "").lower()
    if mimetype and mimetype not in ALLOWED_IMAGE_MIME_TYPES:
        return None

    header = file.stream.read(32)
    file.stream.seek(0)
    detected_ext = _detect_image_extension(header)
    if not detected_ext:
        return None
    if original_ext in {".jpg", ".jpeg"} and detected_ext == ".jpg":
        return ".jpg"
    if original_ext == detected_ext:
        return detected_ext
    return None


def _get_user_email(user_id):
    account = get_cached_account(user_id)
    if account and account.get("email"):
        return account["email"]

    with get_db() as (cursor, conn):
        cursor.execute("SELECT email FROM usuarios WHERE id=%s", (user_id,))
        user_data = cursor.fetchone()
    return user_data["email"] if user_data else "guest"


def _chat_sessions_cache_key(user_id):
    return ("chat_sessions", str(user_id))


def _invalidate_chat_sessions_cache(user_id):
    _chat_sessions_cache.invalidate(_chat_sessions_cache_key(user_id))


def _build_session_summaries(user_id, limit=50):
    with get_db() as (cursor, conn):
        cursor.execute(
            """
            SELECT
                grouped.session_id,
                grouped.created_at,
                grouped.updated_at,
                grouped.message_count,
                first_human.content AS first_human_message,
                first_message.content AS first_message,
                last_message.content AS last_message
            FROM (
                SELECT
                    session_id,
                    MIN(timestamp) AS created_at,
                    MAX(timestamp) AS updated_at,
                    COUNT(*) AS message_count,
                    MIN(id) AS first_id,
                    MIN(CASE WHEN message_type = 'human' THEN id END) AS first_human_id,
                    MAX(id) AS last_id
                FROM chat_history
                WHERE user_id = %s AND session_id IS NOT NULL AND session_id != ''
                GROUP BY session_id
                ORDER BY updated_at DESC
                LIMIT %s
            ) grouped
            LEFT JOIN chat_history first_human ON first_human.id = grouped.first_human_id
            LEFT JOIN chat_history first_message ON first_message.id = grouped.first_id
            LEFT JOIN chat_history last_message ON last_message.id = grouped.last_id
            ORDER BY grouped.updated_at DESC
            """,
            (user_id, limit),
        )
        rows = cursor.fetchall() or []

    sessions = []
    for row in rows:
        title_source = next(
            (
                candidate
                for candidate in (
                    row.get("first_human_message"),
                    row.get("first_message"),
                )
                if candidate and not _is_generic_chat_message(candidate)
            ),
            None,
        )
        if not title_source:
            title_source = row.get("first_human_message") or row.get("first_message") or "Nova conversa"

        last_message = row.get("last_message") or ""

        sessions.append(
            {
                "session_id": row["session_id"],
                "title": _truncate_text(title_source or "Nova conversa", 72),
                "preview": _truncate_text(last_message, 120),
                "created_at": _serialize_timestamp(row["created_at"]),
                "updated_at": _serialize_timestamp(row["updated_at"]),
                "message_count": row["message_count"],
            }
        )

    return sessions


@chatbot_bp.route("/chat", methods=["POST"])
@jwt_required()
def chat():
    user_id = get_jwt_identity()
    email = _get_user_email(user_id)
    data = request.get_json(silent=True) or {}

    allowed, retry_after = check_rate_limit("chat", 60, 60, user_id)
    if not allowed:
        return rate_limit_response(retry_after)

    session_id = _normalize_session_id(
        request.headers.get("X-Session-ID") or data.get("session_id"),
        create_if_missing=True,
    )
    if not session_id:
        return jsonify({"error": "Sessao invalida"}), 400

    message = str(data.get("message") or "").strip()
    if not message:
        return jsonify({"error": "Mensagem vazia"}), 400
    message_limit = int(current_app.config.get("CHAT_MESSAGE_MAX_CHARS", CHAT_MESSAGE_MAX_CHARS))
    if len(message) > message_limit:
        return jsonify({"error": "Mensagem muito longa"}), 413

    agent = get_agent(session_id=session_id, user_id=user_id, email=email)
    response_text = agent.run_text(message)
    _invalidate_chat_sessions_cache(user_id)
    return jsonify({"success": True, "session_id": session_id, "response": response_text}), 200


@chatbot_bp.route("/chat_history", methods=["GET"])
@jwt_required()
def chat_history():
    user_id = get_jwt_identity()
    session_id = _normalize_session_id(request.args.get("session_id") or request.headers.get("X-Session-ID"))
    if not session_id:
        return jsonify({"error": "Sessao invalida"}), 400

    with get_db() as (cursor, conn):
        cursor.execute(
            """
            SELECT message_type, content, timestamp
            FROM chat_history
            WHERE user_id = %s AND session_id = %s
            ORDER BY timestamp ASC, CASE WHEN message_type = 'human' THEN 0 ELSE 1 END, id ASC
            LIMIT 200
            """,
            (user_id, session_id),
        )
        rows = cursor.fetchall() or []

    history = [
        {
            "role": "user" if row["message_type"] == "human" else "assistant",
            "content": row["content"],
            "timestamp": _serialize_timestamp(row["timestamp"]),
        }
        for row in rows
    ]
    return jsonify({"success": True, "history": history})


@chatbot_bp.route("/chat_sessions", methods=["GET"])
@jwt_required()
def chat_sessions():
    user_id = get_jwt_identity()
    try:
        cache_key = _chat_sessions_cache_key(user_id)
        cached_sessions = _chat_sessions_cache.get(cache_key)
        if cached_sessions is not None:
            return jsonify({"success": True, "sessions": cached_sessions}), 200

        sessions = _build_session_summaries(user_id)
        _chat_sessions_cache.set(cache_key, sessions)
        return jsonify({"success": True, "sessions": sessions}), 200
    except Exception as e:
        logger.exception("Erro ao listar sessoes de chat")
        return jsonify({"success": False, "error": "Falha ao listar sessoes de chat"}), 500


@chatbot_bp.route("/chat_sessions/<session_id>", methods=["DELETE"])
@jwt_required()
def delete_chat_session(session_id):
    user_id = get_jwt_identity()
    session_id = _normalize_session_id(session_id)
    if not session_id:
        return jsonify({"error": "Sessao invalida"}), 400

    try:
        with get_db() as (cursor, conn):
            cursor.execute(
                "DELETE FROM chat_history WHERE user_id = %s AND session_id = %s",
                (user_id, session_id),
            )
            deleted = cursor.rowcount
            conn.commit()

        clear_session_agent(user_id, session_id)
        _invalidate_chat_sessions_cache(user_id)
        if deleted <= 0:
            return jsonify({"error": "Conversa nao encontrada"}), 404
        return jsonify({"success": True, "deleted": deleted}), 200
    except Exception as e:
        logger.exception("Erro ao excluir sessao de chat")
        return jsonify({"success": False, "error": "Falha ao excluir sessao de chat"}), 500


@chatbot_bp.route("/analyze_image", methods=["POST", "OPTIONS"])
@jwt_required()
def analyze_image():
    if request.method == "OPTIONS":
        return jsonify({"message": "OK"}), 200

    try:
        user_id = get_jwt_identity()
        email = _get_user_email(user_id)

        allowed, retry_after = check_rate_limit("image_upload", 20, 3600, user_id)
        if not allowed:
            return rate_limit_response(retry_after)

        session_id = _normalize_session_id(
            request.headers.get("X-Session-ID") or request.form.get("session_id"),
            create_if_missing=True,
        )
        if not session_id:
            return jsonify({"error": "Sessao invalida"}), 400

        if "file" not in request.files:
            return jsonify({"error": "Nenhum arquivo enviado"}), 400
        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "Nenhum arquivo selecionado"}), 400

        detected_ext = _validated_image_extension(file)
        if not detected_ext:
            return jsonify({"error": "Arquivo de imagem invalido"}), 400

        message_type = request.form.get("message_type", "human")
        if message_type not in {"human", "ai"}:
            message_type = "human"

        filename = f"{uuid.uuid4()}{detected_ext}"
        file_path = _upload_folder() / filename
        file.save(str(file_path))

        with get_db() as (cursor, conn):
            cursor.execute(
                "INSERT INTO uploads (user_id, file_path, uploaded_at, message_type) VALUES (%s, %s, NOW(), %s)",
                (user_id, filename, message_type),
            )
            upload_id = cursor.lastrowid
            conn.commit()

        agent = get_agent(session_id=session_id, user_id=user_id, email=email)
        analysis_result = agent.run_image(str(file_path))
        agent._save_messages([
            ("human", f"Imagem enviada: {file.filename}"),
            ("ai", analysis_result),
        ])
        _invalidate_chat_sessions_cache(user_id)

        return jsonify({
            "success": True,
            "session_id": session_id,
            "upload_id": upload_id,
            "message_type": message_type,
            "response": analysis_result,
        }), 200
    except Exception as e:
        logger.exception("Erro no endpoint /analyze_image")
        return jsonify({"success": False, "error": "Falha ao analisar imagem"}), 500
