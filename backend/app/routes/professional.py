import logging
import json
from decimal import Decimal, InvalidOperation
from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from app.database import get_db
from app.services.access_control import professional_required, role_has_capability, user_role
from app.services.db_schema import ensure_professional_schema

logger = logging.getLogger(__name__)
professional_bp = Blueprint("professional", __name__)


def _serialize_datetime(value):
    return value.isoformat() if hasattr(value, "isoformat") else value


def _optional_int(value, field_name, min_value=0, max_value=130):
    if value in (None, ""):
        return None, None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None, f"{field_name} deve ser um numero inteiro"
    if parsed < min_value or parsed > max_value:
        return None, f"{field_name} deve estar entre {min_value} e {max_value}"
    return parsed, None


def _optional_decimal(value, field_name, min_value=0, max_value=500):
    if value in (None, ""):
        return None, None
    try:
        parsed = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None, f"{field_name} deve ser um numero valido"
    if parsed < Decimal(str(min_value)) or parsed > Decimal(str(max_value)):
        return None, f"{field_name} deve estar entre {min_value} e {max_value}"
    return parsed, None


def _serialize_decimal(value):
    if value is None:
        return None
    return float(value)


def _patient_payload(data):
    nome = str(data.get("nome") or "").strip()
    idade, idade_error = _optional_int(data.get("idade"), "idade")
    peso, peso_error = _optional_decimal(data.get("peso"), "peso", 0, 500)
    altura, altura_error = _optional_decimal(data.get("altura"), "altura", 0, 3)
    objetivo = str(data.get("objetivo") or "").strip()
    observacoes = str(data.get("observacoes") or "").strip()

    if not nome:
        return None, "Nome do paciente e obrigatorio"
    for error in (idade_error, peso_error, altura_error):
        if error:
            return None, error

    return {
        "nome": nome[:255],
        "idade": idade,
        "peso": peso,
        "altura": altura,
        "objetivo": objetivo[:255],
        "observacoes": observacoes,
    }, None


def _serialize_patient(patient):
    if not patient:
        return patient
    return {
        **patient,
        "peso": _serialize_decimal(patient.get("peso")),
        "altura": _serialize_decimal(patient.get("altura")),
        "criado_em": _serialize_datetime(patient.get("criado_em")),
    }


def _serialize_note(note):
    if not note:
        return note
    return {
        **note,
        "criado_em": _serialize_datetime(note.get("criado_em")),
    }


def _loads_json_field(row, field_name):
    if isinstance(row.get(field_name), str):
        try:
            row[field_name] = json.loads(row[field_name])
        except (TypeError, ValueError):
            row[field_name] = None
    return row


def _verify_patient_ownership(cursor, professional_id, patient_id):
    cursor.execute(
        "SELECT id FROM pacientes WHERE id = %s AND professional_id = %s",
        (patient_id, professional_id),
    )
    return cursor.fetchone() is not None


# --- PATIENTS ENDPOINTS ---

@professional_bp.route("/patients", methods=["GET"])
@jwt_required()
@professional_required
def get_patients():
    user_id = get_jwt_identity()
    search = request.args.get("search", "").strip()
    try:
        with get_db() as (cursor, conn):
            ensure_professional_schema(cursor)
            if search:
                cursor.execute(
                    """
                    SELECT id, nome, idade, peso, altura, objetivo, observacoes, criado_em
                    FROM pacientes
                    WHERE professional_id = %s AND (nome LIKE %s OR objetivo LIKE %s)
                    ORDER BY nome ASC
                    """,
                    (user_id, f"%{search}%", f"%{search}%"),
                )
            else:
                cursor.execute(
                    """
                    SELECT id, nome, idade, peso, altura, objetivo, observacoes, criado_em
                    FROM pacientes
                    WHERE professional_id = %s
                    ORDER BY nome ASC
                    """,
                    (user_id,),
                )
            patients = [_serialize_patient(patient) for patient in cursor.fetchall()]
            return jsonify({"success": True, "patients": patients}), 200
    except Exception as e:
        logger.error(f"Error fetching patients: {e}")
        return jsonify({"error": "Falha ao buscar pacientes"}), 500


@professional_bp.route("/patients", methods=["POST"])
@jwt_required()
@professional_required
def add_patient():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    payload, error = _patient_payload(data)
    if error:
        return jsonify({"error": error}), 400

    try:
        with get_db() as (cursor, conn):
            ensure_professional_schema(cursor)
            cursor.execute(
                """
                INSERT INTO pacientes (professional_id, nome, idade, peso, altura, objetivo, observacoes)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    user_id,
                    payload["nome"],
                    payload["idade"],
                    payload["peso"],
                    payload["altura"],
                    payload["objetivo"],
                    payload["observacoes"],
                ),
            )
            patient_id = cursor.lastrowid
            conn.commit()

            return jsonify({
                "success": True,
                "message": "Paciente cadastrado com sucesso!",
                "patient": _serialize_patient({
                    "id": patient_id,
                    **payload,
                    "criado_em": datetime.utcnow(),
                })
            }), 201
    except Exception as e:
        logger.error(f"Error adding patient: {e}")
        return jsonify({"error": "Falha ao cadastrar paciente"}), 500


@professional_bp.route("/patients/<int:patient_id>", methods=["GET"])
@jwt_required()
@professional_required
def get_patient_detail(patient_id):
    user_id = get_jwt_identity()
    try:
        with get_db() as (cursor, conn):
            ensure_professional_schema(cursor)
            cursor.execute(
                """
                SELECT id, nome, idade, peso, altura, objetivo, observacoes, criado_em
                FROM pacientes
                WHERE id = %s AND professional_id = %s
                LIMIT 1
                """,
                (patient_id, user_id),
            )
            patient = cursor.fetchone()
            if not patient:
                return jsonify({"error": "Paciente não encontrado"}), 404

            return jsonify({"success": True, "patient": _serialize_patient(patient)}), 200
    except Exception as e:
        logger.error(f"Error fetching patient detail: {e}")
        return jsonify({"error": "Falha ao buscar detalhes do paciente"}), 500


@professional_bp.route("/patients/<int:patient_id>", methods=["PUT"])
@jwt_required()
@professional_required
def update_patient(patient_id):
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    payload, error = _patient_payload(data)
    if error:
        return jsonify({"error": error}), 400

    try:
        with get_db() as (cursor, conn):
            ensure_professional_schema(cursor)
            if not _verify_patient_ownership(cursor, user_id, patient_id):
                return jsonify({"error": "Paciente não encontrado ou não autorizado"}), 404

            cursor.execute(
                """
                UPDATE pacientes
                SET nome = %s, idade = %s, peso = %s, altura = %s, objetivo = %s, observacoes = %s
                WHERE id = %s AND professional_id = %s
                """,
                (
                    payload["nome"],
                    payload["idade"],
                    payload["peso"],
                    payload["altura"],
                    payload["objetivo"],
                    payload["observacoes"],
                    patient_id,
                    user_id,
                ),
            )
            conn.commit()

            return jsonify({
                "success": True,
                "message": "Paciente atualizado com sucesso!",
                "patient": _serialize_patient({"id": patient_id, **payload}),
            }), 200
    except Exception as e:
        logger.error(f"Error updating patient: {e}")
        return jsonify({"error": "Falha ao atualizar paciente"}), 500


@professional_bp.route("/patients/<int:patient_id>", methods=["DELETE"])
@jwt_required()
@professional_required
def delete_patient(patient_id):
    user_id = get_jwt_identity()
    try:
        with get_db() as (cursor, conn):
            ensure_professional_schema(cursor)
            if not _verify_patient_ownership(cursor, user_id, patient_id):
                return jsonify({"error": "Paciente não encontrado ou não autorizado"}), 404

            cursor.execute("DELETE FROM pacientes WHERE id = %s AND professional_id = %s", (patient_id, user_id))
            conn.commit()

            return jsonify({"success": True, "message": "Paciente e todos os registros associados foram excluídos."}), 200
    except Exception as e:
        logger.error(f"Error deleting patient: {e}")
        return jsonify({"error": "Falha ao excluir paciente"}), 500


# --- NOTES ENDPOINTS ---

@professional_bp.route("/notes", methods=["GET"])
@jwt_required()
@professional_required
def get_notes():
    user_id = get_jwt_identity()
    patient_id = request.args.get("patient_id")

    try:
        with get_db() as (cursor, conn):
            ensure_professional_schema(cursor)
            if patient_id:
                if not _verify_patient_ownership(cursor, user_id, patient_id):
                    return jsonify({"error": "Paciente não encontrado ou não autorizado"}), 404

                cursor.execute(
                    """
                    SELECT n.id, n.patient_id, n.professional_id, n.categoria, n.content, n.criado_em, p.nome AS patient_name
                    FROM paciente_anotacoes n
                    INNER JOIN pacientes p ON p.id = n.patient_id
                    WHERE n.patient_id = %s AND n.professional_id = %s
                    ORDER BY n.criado_em DESC
                    """,
                    (patient_id, user_id),
                )
            else:
                cursor.execute(
                    """
                    SELECT n.id, n.patient_id, n.professional_id, n.categoria, n.content, n.criado_em, p.nome AS patient_name
                    FROM paciente_anotacoes n
                    INNER JOIN pacientes p ON p.id = n.patient_id
                    WHERE n.professional_id = %s
                    ORDER BY n.criado_em DESC
                    LIMIT 200
                    """,
                    (user_id,),
                )
            notes = cursor.fetchall()

            return jsonify({"success": True, "notes": [_serialize_note(note) for note in notes]}), 200
    except Exception as e:
        logger.error(f"Error fetching notes: {e}")
        return jsonify({"error": "Falha ao buscar anotações"}), 500


@professional_bp.route("/notes", methods=["POST"])
@jwt_required()
@professional_required
def add_note():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    patient_id = data.get("patient_id")
    categoria = str(data.get("categoria") or "observações").strip()
    content = str(data.get("content") or "").strip()

    if not patient_id or not content:
        return jsonify({"error": "patient_id e content são obrigatórios"}), 400

    try:
        with get_db() as (cursor, conn):
            ensure_professional_schema(cursor)
            if not _verify_patient_ownership(cursor, user_id, patient_id):
                return jsonify({"error": "Paciente não encontrado ou não autorizado"}), 404

            cursor.execute(
                """
                INSERT INTO paciente_anotacoes (patient_id, professional_id, categoria, content)
                VALUES (%s, %s, %s, %s)
                """,
                (patient_id, user_id, categoria, content),
            )
            note_id = cursor.lastrowid
            conn.commit()

            return jsonify({
                "success": True,
                "message": "Anotação criada com sucesso!",
                "note": {
                    "id": note_id,
                    "patient_id": patient_id,
                    "professional_id": user_id,
                    "categoria": categoria,
                    "content": content,
                }
            }), 201
    except Exception as e:
        logger.error(f"Error adding note: {e}")
        return jsonify({"error": "Falha ao criar anotação"}), 500


@professional_bp.route("/notes/<int:note_id>", methods=["PUT"])
@jwt_required()
@professional_required
def update_note(note_id):
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    content = str(data.get("content") or "").strip()
    categoria = str(data.get("categoria") or "").strip()

    if not content:
        return jsonify({"error": "content é obrigatório"}), 400

    try:
        with get_db() as (cursor, conn):
            ensure_professional_schema(cursor)
            # Check ownership of note
            cursor.execute(
                "SELECT id, patient_id FROM paciente_anotacoes WHERE id = %s AND professional_id = %s",
                (note_id, user_id),
            )
            note = cursor.fetchone()
            if not note:
                return jsonify({"error": "Anotação não encontrada ou não autorizada"}), 404

            if categoria:
                cursor.execute(
                    "UPDATE paciente_anotacoes SET content = %s, categoria = %s WHERE id = %s AND professional_id = %s",
                    (content, categoria, note_id, user_id),
                )
            else:
                cursor.execute(
                    "UPDATE paciente_anotacoes SET content = %s WHERE id = %s AND professional_id = %s",
                    (content, note_id, user_id),
                )
            conn.commit()

            return jsonify({"success": True, "message": "Anotação atualizada com sucesso!"}), 200
    except Exception as e:
        logger.error(f"Error updating note: {e}")
        return jsonify({"error": "Falha ao atualizar anotação"}), 500


@professional_bp.route("/notes/<int:note_id>", methods=["DELETE"])
@jwt_required()
@professional_required
def delete_note(note_id):
    user_id = get_jwt_identity()
    try:
        with get_db() as (cursor, conn):
            ensure_professional_schema(cursor)
            cursor.execute(
                "SELECT id FROM paciente_anotacoes WHERE id = %s AND professional_id = %s",
                (note_id, user_id),
            )
            if not cursor.fetchone():
                return jsonify({"error": "Anotação não encontrada ou não autorizada"}), 404

            cursor.execute("DELETE FROM paciente_anotacoes WHERE id = %s AND professional_id = %s", (note_id, user_id))
            conn.commit()

            return jsonify({"success": True, "message": "Anotação excluída com sucesso!"}), 200
    except Exception as e:
        logger.error(f"Error deleting note: {e}")
        return jsonify({"error": "Falha ao excluir anotação"}), 500


# --- PLANO ALIMENTAR (DIET) ENDPOINTS (NUTRITIONIST ONLY) ---

@professional_bp.route("/patients/<int:patient_id>/diet", methods=["GET"])
@jwt_required()
@professional_required
def get_patient_diet(patient_id):
    user_id = get_jwt_identity()
    role = user_role(user_id)
    if not role_has_capability(role, "diet"):
        return jsonify({"error": "Apenas nutricionistas podem gerenciar dietas"}), 403

    try:
        with get_db() as (cursor, conn):
            ensure_professional_schema(cursor)
            if not _verify_patient_ownership(cursor, user_id, patient_id):
                return jsonify({"error": "Paciente não encontrado ou não autorizado"}), 404

            cursor.execute(
                """
                SELECT id, patient_id, professional_id, titulo, calorias, proteinas, carboidratos, gorduras, refeicoes, observacoes, criado_em
                FROM paciente_dietas
                WHERE patient_id = %s AND professional_id = %s
                ORDER BY criado_em DESC
                LIMIT 1
                """,
                (patient_id, user_id),
            )
            diet = cursor.fetchone()
            if not diet:
                return jsonify({"success": True, "diet": None}), 200

            if diet.get("criado_em"):
                diet["criado_em"] = _serialize_datetime(diet.get("criado_em"))

            # Parse refeicoes JSON if stored as string, though dictionary cursor handles it depending on connector version
            if isinstance(diet.get("refeicoes"), str):
                try:
                    diet["refeicoes"] = json.loads(diet["refeicoes"])
                except Exception:
                    pass

            return jsonify({"success": True, "diet": diet}), 200
    except Exception as e:
        logger.error(f"Error fetching patient diet: {e}")
        return jsonify({"error": "Falha ao buscar plano alimentar"}), 500


@professional_bp.route("/patients/<int:patient_id>/diet", methods=["POST"])
@jwt_required()
@professional_required
def save_patient_diet(patient_id):
    user_id = get_jwt_identity()
    role = user_role(user_id)
    if not role_has_capability(role, "diet"):
        return jsonify({"error": "Apenas nutricionistas podem gerenciar dietas"}), 403

    data = request.get_json(silent=True) or {}
    titulo = str(data.get("titulo") or "Plano Alimentar").strip()
    calorias = data.get("calorias")
    proteinas = data.get("proteinas")
    carboidratos = data.get("carboidratos")
    gorduras = data.get("gorduras")
    refeicoes = data.get("refeicoes")  # Expect a list/object
    observacoes = str(data.get("observacoes") or "").strip()

    refeicoes_json = json.dumps(refeicoes) if refeicoes is not None else None

    try:
        with get_db() as (cursor, conn):
            ensure_professional_schema(cursor)
            if not _verify_patient_ownership(cursor, user_id, patient_id):
                return jsonify({"error": "Paciente não encontrado ou não autorizado"}), 404

            # Check if one already exists
            cursor.execute(
                "SELECT id FROM paciente_dietas WHERE patient_id = %s AND professional_id = %s LIMIT 1",
                (patient_id, user_id),
            )
            existing = cursor.fetchone()

            if existing:
                cursor.execute(
                    """
                    UPDATE paciente_dietas
                    SET titulo = %s, calorias = %s, proteinas = %s, carboidratos = %s, gorduras = %s, refeicoes = %s, observacoes = %s
                    WHERE id = %s
                    """,
                    (titulo, calorias, proteinas, carboidratos, gorduras, refeicoes_json, observacoes, existing["id"]),
                )
                diet_id = existing["id"]
            else:
                cursor.execute(
                    """
                    INSERT INTO paciente_dietas (patient_id, professional_id, titulo, calorias, proteinas, carboidratos, gorduras, refeicoes, observacoes)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (patient_id, user_id, titulo, calorias, proteinas, carboidratos, gorduras, refeicoes_json, observacoes),
                )
                diet_id = cursor.lastrowid

            conn.commit()

            return jsonify({
                "success": True,
                "message": "Plano alimentar salvo com sucesso!",
                "diet_id": diet_id,
            }), 200
    except Exception as e:
        logger.error(f"Error saving diet: {e}")
        return jsonify({"error": "Falha ao salvar plano alimentar"}), 500


# --- PLANO DE TREINO (WORKOUT) ENDPOINTS (PERSONAL TRAINER ONLY) ---

@professional_bp.route("/patients/<int:patient_id>/workout", methods=["GET"])
@jwt_required()
@professional_required
def get_patient_workout(patient_id):
    user_id = get_jwt_identity()
    role = user_role(user_id)
    if not role_has_capability(role, "workout"):
        return jsonify({"error": "Apenas personal trainers podem gerenciar treinos"}), 403

    try:
        with get_db() as (cursor, conn):
            ensure_professional_schema(cursor)
            if not _verify_patient_ownership(cursor, user_id, patient_id):
                return jsonify({"error": "Paciente não encontrado ou não autorizado"}), 404

            cursor.execute(
                """
                SELECT id, patient_id, professional_id, titulo, grupo_muscular, exercicios, observacoes, criado_em
                FROM paciente_treinos
                WHERE patient_id = %s AND professional_id = %s
                ORDER BY criado_em DESC
                LIMIT 1
                """,
                (patient_id, user_id),
            )
            workout = cursor.fetchone()
            if not workout:
                return jsonify({"success": True, "workout": None}), 200

            if workout.get("criado_em"):
                workout["criado_em"] = _serialize_datetime(workout.get("criado_em"))

            if isinstance(workout.get("exercicios"), str):
                try:
                    workout["exercicios"] = json.loads(workout["exercicios"])
                except Exception:
                    pass

            return jsonify({"success": True, "workout": workout}), 200
    except Exception as e:
        logger.error(f"Error fetching patient workout: {e}")
        return jsonify({"error": "Falha ao buscar ficha de treino"}), 500


@professional_bp.route("/patients/<int:patient_id>/workout", methods=["POST"])
@jwt_required()
@professional_required
def save_patient_workout(patient_id):
    user_id = get_jwt_identity()
    role = user_role(user_id)
    if not role_has_capability(role, "workout"):
        return jsonify({"error": "Apenas personal trainers podem gerenciar treinos"}), 403

    data = request.get_json(silent=True) or {}
    titulo = str(data.get("titulo") or "Ficha de Treino").strip()
    grupo_muscular = str(data.get("grupo_muscular") or "").strip()
    exercicios = data.get("exercicios")  # Expect a list/object
    observacoes = str(data.get("observacoes") or "").strip()

    exercicios_json = json.dumps(exercicios) if exercicios is not None else None

    try:
        with get_db() as (cursor, conn):
            ensure_professional_schema(cursor)
            if not _verify_patient_ownership(cursor, user_id, patient_id):
                return jsonify({"error": "Paciente não encontrado ou não autorizado"}), 404

            # Check if one already exists
            cursor.execute(
                "SELECT id FROM paciente_treinos WHERE patient_id = %s AND professional_id = %s LIMIT 1",
                (patient_id, user_id),
            )
            existing = cursor.fetchone()

            if existing:
                cursor.execute(
                    """
                    UPDATE paciente_treinos
                    SET titulo = %s, grupo_muscular = %s, exercicios = %s, observacoes = %s
                    WHERE id = %s
                    """,
                    (titulo, grupo_muscular, exercicios_json, observacoes, existing["id"]),
                )
                workout_id = existing["id"]
            else:
                cursor.execute(
                    """
                    INSERT INTO paciente_treinos (patient_id, professional_id, titulo, grupo_muscular, exercicios, observacoes)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (patient_id, user_id, titulo, grupo_muscular, exercicios_json, observacoes),
                )
                workout_id = cursor.lastrowid

            conn.commit()

            return jsonify({
                "success": True,
                "message": "Ficha de treino salva com sucesso!",
                "workout_id": workout_id,
            }), 200
    except Exception as e:
        logger.error(f"Error saving workout: {e}")
        return jsonify({"error": "Falha ao salvar ficha de treino"}), 500
