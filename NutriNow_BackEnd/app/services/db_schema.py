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
        criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_usuarios_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS perfil (
        usuario_id INT PRIMARY KEY,
        meta VARCHAR(255) DEFAULT 'Nao definida',
        altura DECIMAL(5,2) NULL,
        peso DECIMAL(5,2) NULL,
        ja_treinou VARCHAR(255) DEFAULT 'Nunca treinou',
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
    CREATE TABLE IF NOT EXISTS google_calendar_tokens (
        user_id INT PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT NULL,
        token_type VARCHAR(40) DEFAULT 'Bearer',
        scope TEXT NULL,
        expires_at DATETIME NULL,
        calendar_id VARCHAR(255) NOT NULL DEFAULT 'primary',
        connected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_google_calendar_tokens_user
            FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """,
    """
    CREATE TABLE IF NOT EXISTS google_calendar_events (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        dieta_treino_id BIGINT NOT NULL,
        tipo ENUM('treino','dieta') NOT NULL,
        google_event_id VARCHAR(255) NOT NULL,
        synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_google_calendar_event_item (user_id, dieta_treino_id, tipo),
        INDEX idx_google_calendar_events_user (user_id),
        CONSTRAINT fk_google_calendar_events_user
            FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_google_calendar_events_item
            FOREIGN KEY (dieta_treino_id) REFERENCES dieta_treino(id) ON DELETE CASCADE
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
]

def ensure_core_schema(cursor):
    for statement in CORE_SCHEMA_SQL:
        cursor.execute(statement)
