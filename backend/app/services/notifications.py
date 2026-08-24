import logging
from datetime import datetime, timedelta

from app.database import get_db
from app.services.mail_service import envoyer_email
from app.services.schema_cache import ensure_notificacoes_table

logger = logging.getLogger(__name__)

WEEKDAY_ORDER = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"]


def _parse_time(value):
    if not value:
        return None
    value = str(value).strip()
    if len(value) == 5 and value[2] == ":":
        try:
            hours, minutes = [int(part) for part in value.split(":")]
            return hours, minutes
        except ValueError:
            return None
    return None


def _parse_recurrence_days(value):
    days = []
    for part in str(value or "").split(","):
        day = part.strip().upper()
        if day in WEEKDAY_ORDER and day not in days:
            days.append(day)
    return days


def _next_occurrence(base, time_value, recurrence_days, recurrence_until):
    time_parts = _parse_time(time_value)
    hour, minute = time_parts if time_parts else (base.hour, base.minute)
    candidate = base.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if candidate <= datetime.now():
        candidate += timedelta(days=1)

    if not recurrence_days:
        until = None
        if recurrence_until:
            try:
                until = datetime.strptime(str(recurrence_until)[:10], "%Y-%m-%d").date()
            except ValueError:
                until = None
        if until and candidate.date() > until:
            return None
        return candidate

    weekdays = [WEEKDAY_ORDER.index(d) for d in recurrence_days]
    until = None
    if recurrence_until:
        try:
            until = datetime.strptime(str(recurrence_until)[:10], "%Y-%m-%d").date()
        except ValueError:
            until = None

    for _ in range(7):
        if candidate.weekday() in weekdays:
            if until and candidate.date() > until:
                return None
            return candidate
        candidate += timedelta(days=1)
    return None


def _build_notification(item, user_id):
    tipo = (item.get("tipo") or "treino").lower()
    tipo_label = "Treino" if tipo == "treino" else "Dieta"
    recurrence_type = str(item.get("recurrence_type") or "none").lower()
    recurrence_days = _parse_recurrence_days(item.get("recurrence_days"))
    scheduled = _next_occurrence(
        item.get("created_at") or datetime.now(),
        item.get("time"),
        recurrence_days if recurrence_type == "weekly" else None,
        item.get("recurrence_until"),
    )
    if not scheduled:
        scheduled = datetime.now() + timedelta(minutes=5)

    return {
        "user_id": user_id,
        "dieta_treino_id": item.get("id"),
        "tipo": tipo,
        "titulo": f"Lembrete de {tipo_label}: {item.get('title')}",
        "mensagem": f"Nao esqueca do seu {tipo_label.lower()} '{item.get('title')}'. {item.get('description') or ''}".strip(),
        "agendado_para": scheduled,
        "recorrente": 1 if recurrence_type == "weekly" and recurrence_days else 0,
    }


def agendar_notificacao_item(user_id, item):
    with get_db() as (cursor, conn):
        ensure_notificacoes_table(cursor)
        notif = _build_notification(item, user_id)
        cursor.execute(
            """
            INSERT INTO notificacoes
                (user_id, dieta_treino_id, tipo, titulo, mensagem, agendado_para, recorrente)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                notif["user_id"],
                notif["dieta_treino_id"],
                notif["tipo"],
                notif["titulo"],
                notif["mensagem"],
                notif["agendado_para"],
                notif["recorrente"],
            ),
        )
        conn.commit()
        return cursor.lastrowid


def remover_notificacoes_item(cursor, user_id, item_id):
    cursor.execute(
        "DELETE FROM notificacoes WHERE user_id=%s AND dieta_treino_id=%s",
        (user_id, item_id),
    )


def _user_email(cursor, user_id):
    cursor.execute("SELECT email FROM usuarios WHERE id=%s", (user_id,))
    row = cursor.fetchone()
    return row["email"] if row else None


def _reschedule_recurring(cursor, notif):
    cursor.execute(
        "SELECT tipo, time, recurrence_days, recurrence_until FROM dieta_treino WHERE id=%s",
        (notif["dieta_treino_id"],),
    )
    item = cursor.fetchone()
    if not item:
        return
    scheduled = _next_occurrence(
        datetime.now(),
        item.get("time"),
        _parse_recurrence_days(item.get("recurrence_days")),
        item.get("recurrence_until"),
    )
    if not scheduled:
        return
    cursor.execute(
        """
        INSERT INTO notificacoes
            (user_id, dieta_treino_id, tipo, titulo, mensagem, agendado_para, recorrente)
        VALUES (%s, %s, %s, %s, %s, %s, 1)
        """,
        (
            notif["user_id"],
            notif["dieta_treino_id"],
            notif["tipo"],
            notif["titulo"],
            notif["mensagem"],
            scheduled,
        ),
    )


def disparar_notificacoes_vencidas():
    enviadas = 0
    with get_db() as (cursor, conn):
        ensure_notificacoes_table(cursor)
        cursor.execute(
            """
            SELECT id, user_id, dieta_treino_id, tipo, titulo, mensagem, recorrente
            FROM notificacoes
            WHERE enviado_email = 0 AND agendado_para <= %s
            ORDER BY agendado_para ASC
            """,
            (datetime.now(),),
        )
        pendentes = cursor.fetchall() or []

        for notif in pendentes:
            email = _user_email(cursor, notif["user_id"])
            if not email:
                logger.warning(
                    "Notificacao %s sem email para usuario %s; pulando",
                    notif["id"],
                    notif["user_id"],
                )
                continue

            enviado_em = datetime.now()
            cursor.execute(
                "UPDATE notificacoes SET enviado_email=1, enviado_em=%s WHERE id=%s AND enviado_email=0",
                (enviado_em, notif["id"]),
            )
            if cursor.rowcount == 0:
                continue

            if notif["recorrente"]:
                _reschedule_recurring(cursor, notif)
            conn.commit()

            if envoyer_email(email, notif["titulo"], notif["mensagem"]):
                enviadas += 1
            else:
                logger.warning(
                    "Falha ao enviar notificacao %s para usuario %s",
                    notif["id"],
                    notif["user_id"],
                )
                cursor.execute(
                    "UPDATE notificacoes SET enviado_email=0, enviado_em=NULL WHERE id=%s",
                    (notif["id"],),
                )
                conn.commit()
    return enviadas
