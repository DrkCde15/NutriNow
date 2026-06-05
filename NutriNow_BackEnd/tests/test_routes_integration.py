import unittest
from unittest.mock import patch

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.routes.auth import auth_bp
from app.routes.chatbot import chatbot_bp
from app.routes.fitness import fitness_bp
from app.routes.profile import profile_bp


def create_test_app(*blueprints):
    app = Flask(__name__)
    app.config.update(
        TESTING=True,
        JWT_SECRET_KEY="test-secret-with-at-least-32-characters",
        JWT_TOKEN_LOCATION=["headers"],
    )
    JWTManager(app)
    for blueprint in blueprints:
        app.register_blueprint(blueprint)
    return app


def auth_header(app, user_id="7"):
    with app.app_context():
        token = create_access_token(identity=str(user_id))
    return {"Authorization": f"Bearer {token}"}


class FakeCursor:
    def __init__(self, operations, item=None, deleted_rows=1):
        self.operations = operations
        self.item = item
        self.deleted_rows = deleted_rows
        self.rowcount = 0
        self._next_result = None

    def execute(self, query, params=None):
        normalized = " ".join(query.split())
        self.operations.append(("sql", normalized, params))
        if normalized.startswith("SELECT id, tipo FROM dieta_treino"):
            self._next_result = self.item
        elif normalized.startswith("DELETE FROM dieta_treino"):
            self.rowcount = self.deleted_rows

    def fetchone(self):
        return self._next_result


class FakeConn:
    def __init__(self, operations):
        self.operations = operations

    def commit(self):
        self.operations.append(("commit",))


class FakeDb:
    def __init__(self, cursor, conn):
        self.cursor = cursor
        self.conn = conn

    def __enter__(self):
        return self.cursor, self.conn

    def __exit__(self, exc_type, exc, traceback):
        return False


class RouteIntegrationTest(unittest.TestCase):
    def test_cadastro_rejects_weak_password_before_database(self):
        app = create_test_app(auth_bp)
        response = app.test_client().post(
            "/cadastro",
            json={
                "nome": "Ana",
                "sobrenome": "Silva",
                "email": "ana@example.com",
                "senha": "123",
            },
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Senha", response.get_json()["error"])

    def test_profile_rejects_invalid_email_before_database(self):
        app = create_test_app(profile_bp)
        with patch("app.services.access_control.user_has_premium", return_value=False) as premium_check:
            response = app.test_client().post(
                "/perfil",
                json={"email": "email-invalido"},
                headers=auth_header(app),
            )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "Informe um email valido")
        premium_check.assert_not_called()

    def test_premium_route_blocks_free_account(self):
        app = create_test_app(profile_bp)
        with patch("app.services.access_control.user_has_premium", return_value=False), patch(
            "app.routes.profile.get_db"
        ) as get_db:
            response = app.test_client().get("/dashboard", headers=auth_header(app))

        self.assertEqual(response.status_code, 402)
        self.assertEqual(response.get_json()["code"], "premium_required")
        get_db.assert_not_called()

    def test_chat_rejects_empty_message_without_agent_call(self):
        app = create_test_app(chatbot_bp)
        with patch("app.routes.chatbot._get_user_email", return_value="user@example.com"), patch(
            "app.routes.chatbot.get_agent"
        ) as get_agent:
            response = app.test_client().post(
                "/chat",
                json={"message": "   ", "session_id": "session-test"},
                headers=auth_header(app),
            )

        self.assertEqual(response.status_code, 400)
        get_agent.assert_not_called()

    def test_delete_item_removes_google_event_before_local_row(self):
        app = create_test_app(fitness_bp)
        operations = []
        cursor = FakeCursor(operations, item={"id": 55, "tipo": "treino"})
        conn = FakeConn(operations)

        def fake_get_db():
            return FakeDb(cursor, conn)

        def fake_calendar_delete(user_id, item_id, tipo=None):
            operations.append(("calendar_delete", user_id, item_id, tipo))
            self.assertFalse(
                any(op[0] == "sql" and op[1].startswith("DELETE FROM dieta_treino") for op in operations)
            )
            return {"deleted": True, "calendarId": "primary"}

        with patch("app.services.access_control.user_has_premium", return_value=True), patch(
            "app.routes.fitness.get_db", side_effect=fake_get_db
        ), patch("app.routes.fitness.delete_google_calendar_item", side_effect=fake_calendar_delete):
            response = app.test_client().delete("/dieta-treino/55", headers=auth_header(app))

        self.assertEqual(response.status_code, 200)
        labels = [op[0] if op[0] != "sql" else op[1] for op in operations]
        calendar_index = labels.index("calendar_delete")
        delete_index = next(index for index, label in enumerate(labels) if label.startswith("DELETE FROM dieta_treino"))
        self.assertLess(calendar_index, delete_index)

    def test_delete_item_blocks_local_delete_when_google_delete_fails(self):
        app = create_test_app(fitness_bp)
        operations = []
        cursor = FakeCursor(operations, item={"id": 55, "tipo": "treino"})
        conn = FakeConn(operations)

        with patch("app.services.access_control.user_has_premium", return_value=True), patch(
            "app.routes.fitness.get_db", return_value=FakeDb(cursor, conn)
        ), patch(
            "app.routes.fitness.delete_google_calendar_item",
            return_value={"deleted": False, "reason": "google_error", "error": "API indisponivel"},
        ):
            response = app.test_client().delete("/dieta-treino/55", headers=auth_header(app))

        self.assertEqual(response.status_code, 502)
        self.assertFalse(any(op[0] == "sql" and op[1].startswith("DELETE FROM dieta_treino") for op in operations))


if __name__ == "__main__":
    unittest.main()
