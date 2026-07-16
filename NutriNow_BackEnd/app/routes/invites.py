import logging
import secrets
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.database import get_db
from app.services.access_control import professional_required
from app.services.schema_cache import ensure_perfil_columns

logger = logging.getLogger(__name__)
invites_bp = Blueprint("invites", __name__)

CONVITE_EXPIRACAO_DIAS = 30


def _gerar_token():
    return secrets.token_urlsafe(32)


@invites_bp.route("/invites", methods=["POST"])
@jwt_required()
@professional_required
def criar_convite():
    user_id = get_jwt_identity()
    try:
        with get_db() as (cursor, conn):
            token = _gerar_token()
            expira_em = datetime.now() + timedelta(days=CONVITE_EXPIRACAO_DIAS)
            cursor.execute(
                """
                INSERT INTO convites_profissionais (professional_id, token, expira_em)
                VALUES (%s, %s, %s)
                """,
                (user_id, token, expira_em),
            )
            conn.commit()

        return (
            jsonify(
                {
                    "success": True,
                    "token": token,
                    "expiraEm": expira_em.isoformat(),
                }
            ),
            201,
        )
    except Exception as exc:
        logger.error(f"Erro ao criar convite: {exc}")
        return jsonify({"error": "Falha ao criar convite"}), 500


@invites_bp.route("/invites/validate", methods=["GET"])
def validar_convite():
    token = (request.args.get("token") or "").strip()
    if not token:
        return jsonify({"error": "Token ausente"}), 400

    try:
        with get_db() as (cursor, conn):
            ensure_perfil_columns(cursor)
            cursor.execute(
                """
                SELECT c.id, c.professional_id, c.usado_por, c.expira_em,
                       u.nome, u.email, u.role, p.foto
                FROM convites_profissionais c
                INNER JOIN usuarios u ON u.id = c.professional_id
                LEFT JOIN perfil p ON p.usuario_id = u.id
                WHERE c.token = %s
                LIMIT 1
                """,
                (token,),
            )
            convite = cursor.fetchone()

        if not convite:
            return jsonify({"error": "Convite invalido"}), 404

        expira_em = convite.get("expira_em")
        if expira_em and expira_em < datetime.now():
            return jsonify({"error": "Convite expirado"}), 410

        if convite.get("usado_por"):
            return jsonify({"error": "Convite ja utilizado"}), 409

        tipo = "personal_trainer" if convite.get("role") == "personal_trainer" else "nutricionista"
        return (
            jsonify(
                {
                    "success": True,
                    "valid": True,
                    "professional": {
                        "id": convite.get("professional_id"),
                        "nome": convite.get("nome"),
                        "email": convite.get("email"),
                        "tipo": tipo,
                        "foto": convite.get("foto"),
                    },
                }
            ),
            200,
        )
    except Exception as exc:
        logger.error(f"Erro ao validar convite: {exc}")
        return jsonify({"error": "Falha ao validar convite"}), 500
