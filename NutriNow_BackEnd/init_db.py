from dotenv import load_dotenv

from app.database import get_db
from app.services.db_schema import ensure_core_schema


def main():
    load_dotenv()
    with get_db() as (cursor, conn):
        ensure_core_schema(cursor)
        conn.commit()
        cursor.execute("SELECT DATABASE() AS database_name")
        database_name = cursor.fetchone()["database_name"]
        cursor.execute("SHOW TABLES")
        tables = [next(iter(row.values())) for row in cursor.fetchall()]

    print(f"Schema NutriNow criado/atualizado em {database_name}.")
    print("Tabelas:", ", ".join(sorted(tables)))


if __name__ == "__main__":
    main()
