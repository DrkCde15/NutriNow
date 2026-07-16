from app.services.schema_cache import ensure_feedbacks_columns, ensure_usuario_access_columns


CORE_SCHEMA_SQL = [
    """
    CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nome VARCHAR(100) NOT NULL,
        sobrenome VARCHAR(100) NOT NULL,
        data_nascimento DATE NULL,
        genero ENUM('Masculino','Feminino') NOT NULL DEFAULT 'Masculino',
        email VARCHAR(255) NOT NULL UNIQUE,
        senha VARCHAR(255) NOT NULL,
        is_premium TINYINT(1) NOT NULL DEFAULT 0,
        premium_expires_at DATETIME NULL,
        role ENUM('user','nutritionist','personal_trainer') NOT NULL DEFAULT 'user',
        convidado_por INT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_usuarios_email (email),
        INDEX idx_usuarios_premium (is_premium, premium_expires_at),
        CONSTRAINT fk_usuarios_convidado_por
            FOREIGN KEY (convidado_por) REFERENCES usuarios(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS perfil (
        usuario_id INT PRIMARY KEY,
        meta VARCHAR(255) DEFAULT 'Nao definida',
        altura DECIMAL(5,2) NULL,
        peso DECIMAL(5,2) NULL,
        ja_treinou VARCHAR(255) DEFAULT 'Nunca treinou',
        foto VARCHAR(512) NULL,
        CONSTRAINT fk_perfil_usuario
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS redefinicao_senha (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        token VARCHAR(255) NOT NULL,
        data_expiracao DATETIME NOT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_redefinicao_usuario (usuario_id),
        INDEX idx_redefinicao_token (token),
        CONSTRAINT fk_redefinicao_usuario
            FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS dieta_treino (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        tipo ENUM('treino','dieta') NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        time VARCHAR(50) NULL,
        duration_minutes INT NOT NULL DEFAULT 60,
        recurrence_type VARCHAR(20) NOT NULL DEFAULT 'none',
        recurrence_days VARCHAR(32) NULL,
        recurrence_until DATE NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_dieta_treino_user_tipo_created (user_id, tipo, created_at),
        INDEX idx_dieta_treino_user_updated (user_id, updated_at),
        CONSTRAINT fk_dieta_treino_user
            FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
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
    """,
    """
    CREATE TABLE IF NOT EXISTS chat_history (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        session_id VARCHAR(128) NOT NULL,
        user_id INT NULL,
        email VARCHAR(255) NULL,
        message_type ENUM('human','ai') NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_chat_user_session_time (user_id, session_id, timestamp, id),
        INDEX idx_chat_user_time (user_id, timestamp),
        INDEX idx_chat_session_id (session_id),
        INDEX idx_chat_email (email),
        CONSTRAINT fk_chat_history_user
            FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS uploads (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        message_type ENUM('human','ai') NOT NULL DEFAULT 'human',
        INDEX idx_uploads_user_uploaded (user_id, uploaded_at),
        CONSTRAINT fk_uploads_user
            FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS feedbacks (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        nome VARCHAR(120) NOT NULL,
        email VARCHAR(255) NULL,
        rating TINYINT UNSIGNED NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_feedbacks_user (user_id),
        INDEX idx_feedbacks_created (created_at),
        CONSTRAINT fk_feedbacks_user
            FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL,
        CONSTRAINT chk_feedbacks_rating CHECK (rating BETWEEN 1 AND 5)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS analytics_events (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NULL,
        anonymous_id VARCHAR(120) NULL,
        event_type VARCHAR(40) NOT NULL,
        path VARCHAR(255) NULL,
        metadata JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_analytics_created (created_at),
        INDEX idx_analytics_event_created (event_type, created_at),
        INDEX idx_analytics_user_created (user_id, created_at),
        CONSTRAINT fk_analytics_user
            FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS pacientes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        professional_id INT NOT NULL,
        nome VARCHAR(255) NOT NULL,
        idade INT NULL,
        peso DECIMAL(5,2) NULL,
        altura DECIMAL(5,2) NULL,
        objetivo VARCHAR(255) NULL,
        observacoes TEXT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pacientes_professional (professional_id),
        CONSTRAINT fk_pacientes_professional
            FOREIGN KEY (professional_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS convites_profissionais (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        professional_id INT NOT NULL,
        token VARCHAR(64) NOT NULL,
        usado_por INT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        expira_em DATETIME NOT NULL,
        INDEX idx_convites_token (token),
        INDEX idx_convites_professional (professional_id),
        CONSTRAINT fk_convites_professional
            FOREIGN KEY (professional_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_convites_usado_por
            FOREIGN KEY (usado_por) REFERENCES usuarios(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS paciente_anotacoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        professional_id INT NOT NULL,
        categoria VARCHAR(100) NULL,
        content TEXT NOT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_anotacoes_patient (patient_id),
        INDEX idx_anotacoes_professional (professional_id),
        CONSTRAINT fk_anotacoes_patient
            FOREIGN KEY (patient_id) REFERENCES pacientes(id) ON DELETE CASCADE,
        CONSTRAINT fk_anotacoes_professional
            FOREIGN KEY (professional_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS paciente_dietas (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        professional_id INT NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        calorias INT NULL,
        proteinas INT NULL,
        carboidratos INT NULL,
        gorduras INT NULL,
        refeicoes JSON NULL,
        observacoes TEXT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_dietas_patient (patient_id),
        CONSTRAINT fk_dietas_patient
            FOREIGN KEY (patient_id) REFERENCES pacientes(id) ON DELETE CASCADE,
        CONSTRAINT fk_dietas_professional
            FOREIGN KEY (professional_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS paciente_treinos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        patient_id INT NOT NULL,
        professional_id INT NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        grupo_muscular VARCHAR(255) NULL,
        exercicios JSON NULL,
        observacoes TEXT NULL,
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_treinos_patient (patient_id),
        CONSTRAINT fk_treinos_patient
            FOREIGN KEY (patient_id) REFERENCES pacientes(id) ON DELETE CASCADE,
        CONSTRAINT fk_treinos_professional
            FOREIGN KEY (professional_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
]

PROFESSIONAL_SCHEMA_SQL = CORE_SCHEMA_SQL[-4:]

def ensure_core_schema(cursor):
    for statement in CORE_SCHEMA_SQL:
        cursor.execute(statement)
    ensure_usuario_access_columns(cursor)
    ensure_feedbacks_columns(cursor)


def ensure_professional_schema(cursor):
    for statement in PROFESSIONAL_SCHEMA_SQL:
        cursor.execute(statement)
