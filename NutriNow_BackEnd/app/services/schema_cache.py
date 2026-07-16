import re
import time
from threading import Lock

TABLE_NAME_RE = re.compile(r"^[A-Za-z0-9_]+$")
SCHEMA_CACHE_SECONDS = 10 * 60
USER_ROLE_ENUM_SQL = "ENUM('user','nutritionist','personal_trainer')"
USER_ROLE_ENUM_VALUES = ("user", "nutritionist", "personal_trainer")
DIETA_TREINO_SCHEDULE_COLUMNS = {
    "duration_minutes": "ALTER TABLE dieta_treino ADD COLUMN duration_minutes INT NOT NULL DEFAULT 60",
    "recurrence_type": "ALTER TABLE dieta_treino ADD COLUMN recurrence_type VARCHAR(20) NOT NULL DEFAULT 'none'",
    "recurrence_days": "ALTER TABLE dieta_treino ADD COLUMN recurrence_days VARCHAR(32) NULL",
    "recurrence_until": "ALTER TABLE dieta_treino ADD COLUMN recurrence_until DATE NULL",
}
USUARIO_ACCESS_COLUMNS = {
    "is_premium": "ALTER TABLE usuarios ADD COLUMN is_premium TINYINT(1) NOT NULL DEFAULT 0",
    "premium_expires_at": "ALTER TABLE usuarios ADD COLUMN premium_expires_at DATETIME NULL",
    "role": f"ALTER TABLE usuarios ADD COLUMN role {USER_ROLE_ENUM_SQL} NOT NULL DEFAULT 'user'",
    "convidado_por": "ALTER TABLE usuarios ADD COLUMN convidado_por INT NULL",
}
FEEDBACKS_COLUMNS = {
    "user_id": "ALTER TABLE feedbacks ADD COLUMN user_id INT NULL",
    "nome": "ALTER TABLE feedbacks ADD COLUMN nome VARCHAR(120) NOT NULL DEFAULT 'Anonimo'",
    "email": "ALTER TABLE feedbacks ADD COLUMN email VARCHAR(255) NULL",
    "rating": "ALTER TABLE feedbacks ADD COLUMN rating TINYINT UNSIGNED NOT NULL DEFAULT 5",
    "message": "ALTER TABLE feedbacks ADD COLUMN message TEXT NULL",
    "created_at": "ALTER TABLE feedbacks ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP",
}
PERFIL_COLUMNS = {
    "foto": "ALTER TABLE perfil ADD COLUMN foto VARCHAR(512) NULL",
}

NOTIFICACOES_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS notificacoes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    dieta_treino_id BIGINT NULL,
    tipo ENUM('treino','dieta') NOT NULL DEFAULT 'treino',
    titulo VARCHAR(255) NOT NULL,
    mensagem TEXT NOT NULL,
    agendado_para DATETIME NOT NULL,
    enviado_email TINYINT(1) NOT NULL DEFAULT 0,
    lida TINYINT(1) NOT NULL DEFAULT 0,
    recorrente TINYINT(1) NOT NULL DEFAULT 0,
    enviado_em DATETIME NULL,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notificacoes_user (user_id),
    INDEX idx_notificacoes_agendado (agendado_para, enviado_email),
    CONSTRAINT fk_notificacoes_user
        FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
"""

_table_columns_cache = {}
_cache_lock = Lock()

def _normalize_column_name(row):
    return row.get("column_name") or row.get("COLUMN_NAME")


def _row_value(row, key):
    return row.get(key) or row.get(key.upper())

def get_table_columns(cursor, table_name):
    if not TABLE_NAME_RE.match(table_name or ""):
        raise ValueError("Nome de tabela invalido")

    now = time.monotonic()
    with _cache_lock:
        cached = _table_columns_cache.get(table_name)
        if cached and cached["expires_at"] > now:
            return set(cached["columns"])

    cursor.execute(
        """
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = %s
        """,
        (table_name,),
    )
    columns = {_normalize_column_name(row) for row in cursor.fetchall()}
    columns.discard(None)

    with _cache_lock:
        _table_columns_cache[table_name] = {
            "columns": set(columns),
            "expires_at": now + SCHEMA_CACHE_SECONDS,
        }

    return columns

def invalidate_table_columns(table_name):
    with _cache_lock:
        _table_columns_cache.pop(table_name, None)


def get_table_column_metadata(cursor, table_name, column_name):
    if not TABLE_NAME_RE.match(table_name or ""):
        raise ValueError("Nome de tabela invalido")

    cursor.execute(
        """
        SELECT column_type, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = %s
          AND column_name = %s
        LIMIT 1
        """,
        (table_name, column_name),
    )
    return cursor.fetchone()

def resolve_dieta_user_column(cursor):
    columns = get_table_columns(cursor, "dieta_treino")
    if "user_id" in columns:
        return "user_id"
    if "usuario_id" in columns:
        return "usuario_id"
    return "user_id"

def ensure_dieta_treino_schedule_columns(cursor):
    columns = get_table_columns(cursor, "dieta_treino")
    missing_columns = [
        column
        for column in DIETA_TREINO_SCHEDULE_COLUMNS
        if column not in columns
    ]
    if not missing_columns:
        return

    for column in missing_columns:
        cursor.execute(DIETA_TREINO_SCHEDULE_COLUMNS[column])

    invalidate_table_columns("dieta_treino")


def ensure_usuario_access_columns(cursor):
    columns = get_table_columns(cursor, "usuarios")
    missing_columns = [
        column
        for column in USUARIO_ACCESS_COLUMNS
        if column not in columns
    ]
    if missing_columns:
        for column in missing_columns:
            cursor.execute(USUARIO_ACCESS_COLUMNS[column])

        invalidate_table_columns("usuarios")

    ensure_usuario_role_enum(cursor)


def ensure_usuario_role_enum(cursor):
    metadata = get_table_column_metadata(cursor, "usuarios", "role")
    if not metadata:
        return

    column_type = str(_row_value(metadata, "column_type") or "").lower().replace(" ", "")
    column_default = str(_row_value(metadata, "column_default") or "")
    expected_type = USER_ROLE_ENUM_SQL.lower().replace(" ", "")
    if column_type == expected_type and column_default == "user":
        return

    placeholders = ", ".join(["%s"] * len(USER_ROLE_ENUM_VALUES))
    cursor.execute(
        f"""
        UPDATE usuarios
        SET role='user'
        WHERE role IS NULL OR role NOT IN ({placeholders})
        """,
        USER_ROLE_ENUM_VALUES,
    )
    cursor.execute(f"ALTER TABLE usuarios MODIFY COLUMN role {USER_ROLE_ENUM_SQL} NOT NULL DEFAULT 'user'")
    invalidate_table_columns("usuarios")


def ensure_feedbacks_columns(cursor):
    columns = get_table_columns(cursor, "feedbacks")
    missing_columns = [
        column
        for column in FEEDBACKS_COLUMNS
        if column not in columns
    ]
    if not missing_columns:
        return

    for column in missing_columns:
        cursor.execute(FEEDBACKS_COLUMNS[column])

    invalidate_table_columns("feedbacks")


def ensure_perfil_columns(cursor):
    columns = get_table_columns(cursor, "perfil")
    missing_columns = [
        column
        for column in PERFIL_COLUMNS
        if column not in columns
    ]
    if not missing_columns:
        return

    for column in missing_columns:
        cursor.execute(PERFIL_COLUMNS[column])

    invalidate_table_columns("perfil")


def ensure_notificacoes_table(cursor):
    cursor.execute(NOTIFICACOES_TABLE_SQL)
    invalidate_table_columns("notificacoes")
