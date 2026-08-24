import logging
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app.database import get_db
from app.security import check_rate_limit, rate_limit_response
from app.services.schema_cache import ensure_feedbacks_columns

logger = logging.getLogger(__name__)
feedback_bp = Blueprint("feedback", __name__)
_feedbacks_table_ready = False
DEFAULT_FEEDBACKS_LIMIT = 12
MAX_FEEDBACKS_LIMIT = 50

CREATE_FEEDBACKS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS feedbacks (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NULL,
    nome VARCHAR(120) NOT NULL,
    email VARCHAR(255),
    rating TINYINT UNSIGNED NOT NULL,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_feedbacks_user (user_id),
    INDEX idx_feedbacks_created (created_at),
    CONSTRAINT fk_feedbacks_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    CONSTRAINT chk_feedbacks_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
"""

def _ensure_feedbacks_table(cursor):
    global _feedbacks_table_ready
    if _feedbacks_table_ready:
        return

    cursor.execute(CREATE_FEEDBACKS_TABLE_SQL)
    ensure_feedbacks_columns(cursor)
    _feedbacks_table_ready = True

def _feedbacks_limit():
    try:
        limit = int(request.args.get("limit", DEFAULT_FEEDBACKS_LIMIT))
    except (TypeError, ValueError):
        limit = DEFAULT_FEEDBACKS_LIMIT
    return max(1, min(limit, MAX_FEEDBACKS_LIMIT))

def _optional_user_id():
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        return int(identity) if identity is not None else None
    except Exception as exc:
        logger.warning(f"Token invalido no feedback: {exc}")
        return None

def _current_user_can_delete(row, current_user_id):
    if current_user_id is None or row.get("user_id") is None:
        return False
    return str(row.get("user_id")) == str(current_user_id)

def _serialize_feedback(row, current_user_id=None):
    created_at = row.get("created_at")
    return {
        "id": row.get("id"),
        "name": row.get("nome") or "Anonimo",
        "rating": int(row.get("rating") or 0),
        "message": row.get("message") or "",
        "createdAt": created_at.isoformat() if hasattr(created_at, "isoformat") else str(created_at or ""),
        "canDelete": _current_user_can_delete(row, current_user_id),
    }

@feedback_bp.route("/api/feedbacks", methods=["GET"])
def list_feedbacks():
    try:
        current_user_id = _optional_user_id()
        with get_db() as (cursor, _conn):
            _ensure_feedbacks_table(cursor)
            cursor.execute(
                """
                SELECT id, user_id, nome, rating, message, created_at
                FROM feedbacks
                ORDER BY created_at DESC, id DESC
                LIMIT %s
                """,
                (_feedbacks_limit(),),
            )
            items = [_serialize_feedback(row, current_user_id) for row in cursor.fetchall()]
            response = jsonify({"items": items})
            response.headers["Cache-Control"] = "no-store"
            return response, 200
    except Exception as exc:
        logger.error(f"Erro ao listar feedbacks: {exc}")
        return jsonify({"error": "Falha ao carregar feedbacks"}), 500

@feedback_bp.route("/api/feedbacks/<int:feedback_id>", methods=["DELETE"])
def delete_feedback(feedback_id):
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception as exc:
        logger.warning(f"Tentativa de excluir feedback sem sessao valida: {exc}")
        return jsonify({"error": "Entre na sua conta para excluir este feedback"}), 401

    try:
        with get_db() as (cursor, conn):
            _ensure_feedbacks_table(cursor)
            cursor.execute(
                "DELETE FROM feedbacks WHERE id=%s AND user_id=%s",
                (feedback_id, user_id),
            )
            if cursor.rowcount == 0:
                return jsonify({"error": "Feedback nao encontrado para esta conta"}), 404
            conn.commit()
            return jsonify({"success": True}), 200
    except Exception as exc:
        logger.error(f"Erro ao excluir feedback: {exc}")
        return jsonify({"error": "Falha ao excluir feedback"}), 500

@feedback_bp.route("/api/feedbacks", methods=["POST", "OPTIONS"])
def create_feedback():
    if request.method == "OPTIONS":
        return jsonify({"message": "OK"}), 200

    data = request.get_json(silent=True) or {}
    message = " ".join(str(data.get("message", "")).strip().split())
    name = " ".join(str(data.get("name", "")).strip().split())

    allowed, retry_after = check_rate_limit("feedback", 10, 3600)
    if not allowed:
        return rate_limit_response(retry_after)

    try:
        rating = int(data.get("rating"))
    except (TypeError, ValueError):
        return jsonify({"error": "A nota deve ser um numero de 1 a 5"}), 400

    if rating < 1 or rating > 5:
        return jsonify({"error": "A nota deve estar entre 1 e 5"}), 400
    if len(message) < 5:
        return jsonify({"error": "Escreva uma mensagem com pelo menos 5 caracteres"}), 400
    if len(message) > 2000:
        return jsonify({"error": "A mensagem deve ter no maximo 2000 caracteres"}), 400
    if len(name) > 120:
        return jsonify({"error": "O nome deve ter no maximo 120 caracteres"}), 400

    user_id = _optional_user_id()
    user_name = None

    try:
        with get_db() as (cursor, conn):
            _ensure_feedbacks_table(cursor)
            if user_id is not None:
                cursor.execute("SELECT nome FROM usuarios WHERE id=%s", (user_id,))
                user = cursor.fetchone() or {}
                user_name = user.get("nome")

            author_name = name or user_name or "Anonimo"

            cursor.execute(
                """
                INSERT INTO feedbacks (user_id, nome, email, rating, message)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (user_id, author_name, None, rating, message),
            )
            feedback_id = cursor.lastrowid
            conn.commit()
            feedback = _serialize_feedback(
                {
                    "id": feedback_id,
                    "user_id": user_id,
                    "nome": author_name,
                    "rating": rating,
                    "message": message,
                    "created_at": datetime.now(timezone.utc),
                },
                user_id,
            )

            return (
                jsonify(
                    {
                        "success": True,
                        "message": "Feedback enviado com sucesso!",
                        "feedbackId": feedback_id,
                        "feedback": feedback,
                    }
                ),
                201,
            )
    except Exception as exc:
        logger.error(f"Erro ao salvar feedback: {exc}")
        return jsonify({"error": "Falha ao salvar feedback"}), 500
