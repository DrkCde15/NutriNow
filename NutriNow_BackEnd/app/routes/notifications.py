import logging
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.database import get_db
from app.services.schema_cache import ensure_notificacoes_table
logger = logging.getLogger(__name__)
notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/notificacoes", methods=["GET"])
@jwt_required()
def listar_notificacoes():
    user_id = get_jwt_identity()
    try:
        with get_db() as (cursor, conn):
            ensure_notificacoes_table(cursor)
            cursor.execute(
                """
                SELECT
                    id,
                    dieta_treino_id,
                    tipo,
                    titulo,
                    mensagem,
                    agendado_para,
                    enviado_email,
                    lida,
                    recorrente,
                    enviado_em,
                    criado_em
                FROM notificacoes
                WHERE user_id=%s
                ORDER BY agendado_para DESC
                LIMIT 200
                """,
                (user_id,),
            )
            rows = cursor.fetchall() or []
            conn.commit()
        return jsonify({"notificacoes": rows}), 200
    except Exception as exc:
        logger.error(f"Erro ao listar notificacoes: {exc}")
        return jsonify({"error": "Falha ao listar notificacoes"}), 500


@notifications_bp.route("/notificacoes/<int:notificacao_id>/lida", methods=["POST"])
@jwt_required()
def marcar_lida(notificacao_id):
    user_id = get_jwt_identity()
    try:
        with get_db() as (cursor, conn):
            ensure_notificacoes_table(cursor)
            cursor.execute(
                "UPDATE notificacoes SET lida=1 WHERE id=%s AND user_id=%s",
                (notificacao_id, user_id),
            )
            conn.commit()
        return jsonify({"success": True}), 200
    except Exception as exc:
        logger.error(f"Erro ao marcar notificacao como lida: {exc}")
        return jsonify({"error": "Falha ao marcar notificacao"}), 500
