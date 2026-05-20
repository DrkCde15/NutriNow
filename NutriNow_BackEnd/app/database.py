import os
from contextlib import contextmanager
from threading import Lock
import mysql.connector
from mysql.connector import pooling

_pool = None
_pool_config_key = None
_pool_lock = Lock()


def _env_int(name, default):
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return int(default)


def _env_bool(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _db_config():
    config = {
        "host": os.getenv("MYSQL_HOST"),
        "port": int(os.getenv("MYSQL_PORT", 3306)),
        "user": os.getenv("MYSQL_USER"),
        "password": os.getenv("MYSQL_PASSWORD"),
        "database": os.getenv("MYSQL_DATABASE"),
        "connection_timeout": _env_int("MYSQL_CONNECTION_TIMEOUT", 10),
    }

    ssl_mode = os.getenv("MYSQL_SSL_MODE", "").strip().lower()
    if ssl_mode and ssl_mode != "disabled":
        config["ssl_disabled"] = False

        ssl_ca = os.getenv("MYSQL_SSL_CA")
        if ssl_ca:
            config["ssl_ca"] = ssl_ca
            config["ssl_verify_cert"] = ssl_mode in {"verify_ca", "verify_identity"}
            config["ssl_verify_identity"] = ssl_mode == "verify_identity"
    elif ssl_mode == "disabled":
        config["ssl_disabled"] = True

    return config


def _get_pool():
    global _pool, _pool_config_key

    config = _db_config()
    config_key = tuple(sorted(config.items()))
    with _pool_lock:
        if _pool is None or _pool_config_key != config_key:
            _pool = pooling.MySQLConnectionPool(
                pool_name=os.getenv("MYSQL_POOL_NAME", "nutrinow_pool"),
                pool_size=_env_int("MYSQL_POOL_SIZE", 2),
                pool_reset_session=_env_bool("MYSQL_POOL_RESET_SESSION", False),
                **config,
            )
            _pool_config_key = config_key

    return _pool

def get_db_connection():
    if os.getenv("MYSQL_DISABLE_POOL", "").strip().lower() in {"1", "true", "yes", "on"}:
        return mysql.connector.connect(**_db_config())
    return _get_pool().get_connection()

@contextmanager
def get_db():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        yield cursor, conn
    except Exception:
        if conn.is_connected():
            conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()
