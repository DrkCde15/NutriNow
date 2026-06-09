import os
import unittest
from datetime import datetime
from unittest.mock import patch

from flask import Flask
from flask_jwt_extended import JWTManager, create_access_token

from app.routes.auth import auth_bp
from app.routes.billing import billing_bp
from app.routes.chatbot import chatbot_bp
from app.routes.feedbacks import feedback_bp
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


class FeedbackFakeCursor:
    def __init__(self, operations, columns=None, user=None, insert_id=42, feedback_rows=None, deleted_rows=1):
        self.operations = operations
        self.columns = columns or {"id", "user_id", "nome", "email", "rating", "message", "created_at"}
        self.user = user
        self.feedback_rows = feedback_rows or []
        self.deleted_rows = deleted_rows
        self.lastrowid = insert_id
        self.rowcount = 0
        self._next_result = None
        self._next_rows = []

    def execute(self, query, params=None):
        normalized = " ".join(query.split())
        self.operations.append(("sql", normalized, params))
        if normalized.startswith("SELECT column_name FROM information_schema.columns"):
            self._next_rows = [{"column_name": column} for column in self.columns]
        elif normalized.startswith("ALTER TABLE feedbacks ADD COLUMN"):
            self.columns.add(normalized.split(" ADD COLUMN ", 1)[1].split(" ", 1)[0])
        elif normalized.startswith("SELECT nome FROM usuarios"):
            self._next_result = self.user
        elif normalized.startswith("SELECT id, user_id, nome, rating, message, created_at FROM feedbacks"):
            self._next_rows = self.feedback_rows
        elif normalized.startswith("DELETE FROM feedbacks"):
            self.rowcount = self.deleted_rows

    def fetchone(self):
        return self._next_result

    def fetchall(self):
        return self._next_rows


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


class BillingFakeCursor:
    def __init__(self, operations, user=None):
        self.operations = operations
        self.user = user
        self._next_result = None

    def execute(self, query, params=None):
        normalized = " ".join(query.split())
        self.operations.append(("sql", normalized, params))
        if normalized.startswith("SELECT id, email, is_premium, premium_expires_at FROM usuarios"):
            self._next_result = self.user

    def fetchone(self):
        return self._next_result


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

    def test_feedback_saves_public_feedback(self):
        app = create_test_app(feedback_bp)
        operations = []
        cursor = FeedbackFakeCursor(operations)
        conn = FakeConn(operations)

        with patch("app.routes.feedbacks.get_db", return_value=FakeDb(cursor, conn)), patch(
            "app.routes.feedbacks.check_rate_limit", return_value=(True, None)
        ), patch("app.routes.feedbacks._feedbacks_table_ready", False):
            response = app.test_client().post(
                "/api/feedbacks",
                json={
                    "rating": 5,
                    "name": "Valeria Oliveira",
                    "message": "Site muito funcional, vale a pena testar e usar. Adorei!!",
                },
            )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.get_json()["success"])
        insert_op = next(op for op in operations if op[0] == "sql" and op[1].startswith("INSERT INTO feedbacks"))
        self.assertEqual(
            insert_op[2],
            (None, "Valeria Oliveira", None, 5, "Site muito funcional, vale a pena testar e usar. Adorei!!"),
        )
        self.assertIn(("commit",), operations)

    def test_feedback_adds_missing_columns_before_insert(self):
        app = create_test_app(feedback_bp)
        operations = []
        cursor = FeedbackFakeCursor(operations, columns={"id"})
        conn = FakeConn(operations)

        with patch("app.routes.feedbacks.get_db", return_value=FakeDb(cursor, conn)), patch(
            "app.routes.feedbacks.check_rate_limit", return_value=(True, None)
        ), patch("app.routes.feedbacks._feedbacks_table_ready", False):
            response = app.test_client().post(
                "/api/feedbacks",
                json={"rating": 4, "name": "Ana", "message": "Gostei bastante da experiencia."},
            )

        self.assertEqual(response.status_code, 201)
        alter_ops = [op for op in operations if op[0] == "sql" and op[1].startswith("ALTER TABLE feedbacks")]
        self.assertGreaterEqual(len(alter_ops), 5)
        self.assertIn(("commit",), operations)

    def test_feedback_list_returns_public_recent_feedbacks(self):
        app = create_test_app(feedback_bp)
        operations = []
        cursor = FeedbackFakeCursor(
            operations,
            feedback_rows=[
                {
                    "id": 10,
                    "user_id": 7,
                    "nome": "Valeria Oliveira",
                    "email": "valeria@example.com",
                    "rating": 5,
                    "message": "Site muito funcional.",
                    "created_at": datetime(2026, 6, 9, 12, 30),
                }
            ],
        )
        conn = FakeConn(operations)

        with patch("app.routes.feedbacks.get_db", return_value=FakeDb(cursor, conn)), patch(
            "app.routes.feedbacks._feedbacks_table_ready", False
        ):
            response = app.test_client().get("/api/feedbacks?limit=3", headers=auth_header(app))

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["items"][0]["name"], "Valeria Oliveira")
        self.assertEqual(data["items"][0]["rating"], 5)
        self.assertTrue(data["items"][0]["canDelete"])
        self.assertNotIn("email", data["items"][0])
        select_op = next(op for op in operations if op[0] == "sql" and op[1].startswith("SELECT id, user_id"))
        self.assertEqual(select_op[2], (3,))

    def test_feedback_delete_removes_only_current_user_feedback(self):
        app = create_test_app(feedback_bp)
        operations = []
        cursor = FeedbackFakeCursor(operations, deleted_rows=1)
        conn = FakeConn(operations)

        with patch("app.routes.feedbacks.get_db", return_value=FakeDb(cursor, conn)), patch(
            "app.routes.feedbacks._feedbacks_table_ready", False
        ):
            response = app.test_client().delete("/api/feedbacks/10", headers=auth_header(app))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.get_json()["success"])
        delete_op = next(op for op in operations if op[0] == "sql" and op[1].startswith("DELETE FROM feedbacks"))
        self.assertEqual(delete_op[2], (10, 7))
        self.assertIn(("commit",), operations)

    def test_feedback_delete_requires_session(self):
        app = create_test_app(feedback_bp)
        with patch("app.routes.feedbacks.get_db") as get_db, patch("app.routes.feedbacks.logger.warning"):
            response = app.test_client().delete("/api/feedbacks/10")

        self.assertEqual(response.status_code, 401)
        get_db.assert_not_called()

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

    def test_billing_checkout_adds_user_ref_to_cakto_link(self):
        app = create_test_app(billing_bp)
        operations = []
        cursor = BillingFakeCursor(
            operations,
            user={"id": 7, "email": "ana@example.com", "is_premium": 0, "premium_expires_at": None},
        )
        conn = FakeConn(operations)

        with patch.dict(os.environ, {"CHECKOUT_LINK": "https://pay.cakto.com.br/teste?offer=abc"}), patch(
            "app.routes.billing.get_db", return_value=FakeDb(cursor, conn)
        ), patch("app.routes.billing.ensure_usuario_access_columns"):
            response = app.test_client().post("/billing/checkout", headers=auth_header(app))

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("refId=nutrinow_user_7", data["checkout_url"])
        self.assertIn("offer=abc", data["checkout_url"])
        self.assertFalse(data["alreadyPremium"])

    def test_cakto_webhook_activates_premium_after_paid_order_validation(self):
        app = create_test_app(billing_bp)
        operations = []
        cursor = BillingFakeCursor(
            operations,
            user={"id": 7, "email": "ana@example.com", "is_premium": 0, "premium_expires_at": None},
        )
        conn = FakeConn(operations)
        payload = {
            "event": "purchase_approved",
            "secret": "webhook-secret",
            "data": {
                "id": "order-123",
                "refId": "nutrinow_user_7",
                "status": "paid",
                "customer": {"email": "ana@example.com"},
            },
        }

        with patch.dict(os.environ, {"CAKTO_WEBHOOK_SECRET": "", "WEBHOOK_KEY": "webhook-secret"}, clear=False), patch(
            "app.routes.billing.get_db", return_value=FakeDb(cursor, conn)
        ), patch("app.routes.billing.ensure_usuario_access_columns"), patch(
            "app.routes.billing.cakto_service.get_order", return_value={"status": "paid"}
        ), patch(
            "app.routes.billing.invalidate_cached_account"
        ) as invalidate_cache:
            response = app.test_client().post("/billing/webhook/cakto", json=payload)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["action"], "activated")
        update_ops = [op for op in operations if op[0] == "sql" and op[1].startswith("UPDATE usuarios")]
        self.assertEqual(len(update_ops), 1)
        self.assertEqual(update_ops[0][2][0], 1)
        self.assertIn(("commit",), operations)
        invalidate_cache.assert_called_once_with(7)

    def test_cakto_webhook_does_not_activate_when_order_is_not_paid(self):
        app = create_test_app(billing_bp)
        operations = []
        cursor = BillingFakeCursor(
            operations,
            user={"id": 7, "email": "ana@example.com", "is_premium": 0, "premium_expires_at": None},
        )
        conn = FakeConn(operations)
        payload = {
            "event": "purchase_approved",
            "secret": "webhook-secret",
            "data": {"id": "order-123", "refId": "nutrinow_user_7", "status": "waiting_payment"},
        }

        with patch.dict(os.environ, {"CAKTO_WEBHOOK_SECRET": "webhook-secret"}), patch(
            "app.routes.billing.get_db", return_value=FakeDb(cursor, conn)
        ), patch("app.routes.billing.ensure_usuario_access_columns"), patch(
            "app.routes.billing.cakto_service.get_order", return_value={"status": "waiting_payment"}
        ):
            response = app.test_client().post("/billing/webhook/cakto", json=payload)

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.get_json()["reason"], "order_not_paid")
        self.assertFalse(any(op[0] == "sql" and op[1].startswith("UPDATE usuarios") for op in operations))
        self.assertNotIn(("commit",), operations)


if __name__ == "__main__":
    unittest.main()
