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
from app.routes.professional import professional_bp
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
        self.lastrowid = 1
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

    def fetchall(self):
        return []


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

    def test_delete_item_removes_local_row(self):
        app = create_test_app(fitness_bp)
        operations = []
        cursor = FakeCursor(operations, item={"id": 55, "tipo": "treino"})
        conn = FakeConn(operations)

        def fake_get_db():
            return FakeDb(cursor, conn)

        with patch("app.services.access_control.user_has_premium", return_value=True), patch(
            "app.routes.fitness.get_db", side_effect=fake_get_db
        ):
            response = app.test_client().delete("/dieta-treino/55", headers=auth_header(app))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            any(op[0] == "sql" and op[1].startswith("DELETE FROM dieta_treino") for op in operations)
        )

    def test_delete_item_succeeds_without_calendar_integration(self):
        app = create_test_app(fitness_bp)
        operations = []
        cursor = FakeCursor(operations, item={"id": 55, "tipo": "treino"})
        conn = FakeConn(operations)

        with patch("app.services.access_control.user_has_premium", return_value=True), patch(
            "app.routes.fitness.get_db", return_value=FakeDb(cursor, conn)
        ):
            response = app.test_client().delete("/dieta-treino/55", headers=auth_header(app))

        self.assertEqual(response.status_code, 200)
        self.assertTrue(any(op[0] == "sql" and op[1].startswith("DELETE FROM dieta_treino") for op in operations))

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

    def test_professional_patients_block_common_user_before_database(self):
        app = create_test_app(professional_bp)
        with patch("app.services.access_control.user_role", return_value="user"), patch(
            "app.routes.professional.get_db"
        ) as get_db:
            response = app.test_client().get("/patients", headers=auth_header(app))

        self.assertEqual(response.status_code, 403)
        self.assertIn("profissionais", response.get_json()["error"])
        get_db.assert_not_called()

    def test_diet_endpoint_blocks_personal_trainer_before_database(self):
        app = create_test_app(professional_bp)
        with patch("app.services.access_control.user_role", return_value="personal_trainer"), patch(
            "app.routes.professional.user_role", return_value="personal_trainer"
        ), patch("app.routes.professional.get_db") as get_db:
            response = app.test_client().get("/patients/9/diet", headers=auth_header(app))

        self.assertEqual(response.status_code, 403)
        self.assertIn("nutricionistas", response.get_json()["error"])
        get_db.assert_not_called()

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


class NotifFakeCursor:
    def __init__(self, operations, rows=None, rowcount=1, lastrowid=1):
        self.operations = operations
        self.rows = rows or []
        self.rowcount = rowcount
        self.lastrowid = lastrowid
        self._next_result = None

    def execute(self, query, params=None):
        normalized = " ".join(query.split())
        self.operations.append(("sql", normalized, params))
        if normalized.startswith("SELECT email FROM usuarios"):
            self._next_result = {"email": "user@example.com"}
        elif normalized.startswith("SELECT id, email, is_premium, premium_expires_at FROM usuarios"):
            self._next_result = None

    def fetchone(self):
        return self._next_result

    def fetchall(self):
        return self.rows


class NotificationsTests(unittest.TestCase):
    def test_create_item_returns_notification_contract(self):
        app = create_test_app(fitness_bp)
        operations = []
        cursor = FakeCursor(operations, item={"id": 99, "tipo": "treino"})
        cursor.lastrowid = 99
        conn = FakeConn(operations)
        fake_notif = {"id": 123, "scheduledFor": "2026-07-16T08:00:00"}

        with patch("app.services.access_control.user_has_premium", return_value=True), patch(
            "app.routes.fitness.get_db", return_value=FakeDb(cursor, conn)
        ), patch("app.routes.fitness.agendar_notificacao_item", return_value=123):
            response = app.test_client().post(
                "/dieta-treino",
                headers=auth_header(app),
                json={
                    "tipo": "treino",
                    "title": "Pernal",
                    "description": "Agachamento",
                    "time": "08:00",
                    "date": "2026-07-16",
                },
            )

        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertEqual(data["itemId"], 99)
        self.assertIsInstance(data["notification"], dict)
        self.assertEqual(data["notification"]["id"], 123)
        self.assertIn("scheduledFor", data["notification"])

    def test_disparo_is_idempotent(self):
        from app.services import notifications as notif_module

        rows = [
            {
                "id": 1,
                "user_id": 7,
                "dieta_treino_id": 99,
                "tipo": "treino",
                "titulo": "Lembrete",
                "mensagem": "Treino",
                "recorrente": 0,
            }
        ]
        operations = []

        with patch.object(notif_module, "get_db") as get_db, patch(
            "app.services.notifications.envoyer_email", return_value=True
        ) as send_mail:
            cursor = NotifFakeCursor(operations, rows=rows, rowcount=1)
            conn = FakeConn(operations)
            get_db.return_value = FakeDb(cursor, conn)

            enviadas_1 = notif_module.disparar_notificacoes_vencidas()
            self.assertEqual(enviadas_1, 1)
            send_mail.assert_called_once()

            cursor2 = NotifFakeCursor(operations, rows=rows, rowcount=0)
            conn2 = FakeConn(operations)
            get_db.return_value = FakeDb(cursor2, conn2)

            enviadas_2 = notif_module.disparar_notificacoes_vencidas()
            self.assertEqual(enviadas_2, 0)
            self.assertEqual(send_mail.call_count, 1)

        update_ops = [
            op for op in operations
            if op[0] == "sql" and op[1].startswith("UPDATE notificacoes SET enviado_email=1")
        ]
        self.assertTrue(update_ops)
        self.assertIn("enviado_email=0", update_ops[0][1])

    def test_disparo_recorrente_reagenda(self):
        from app.services import notifications as notif_module

        rows = [
            {
                "id": 5,
                "user_id": 7,
                "dieta_treino_id": 99,
                "tipo": "treino",
                "titulo": "Lembrete",
                "mensagem": "Treino",
                "recorrente": 1,
            }
        ]
        operations = []

        with patch.object(notif_module, "get_db") as get_db, patch(
            "app.services.notifications.envoyer_email", return_value=True
        ):
            cursor = NotifFakeCursor(operations, rows=rows, rowcount=1)
            conn = FakeConn(operations)
            get_db.return_value = FakeDb(cursor, conn)

            enviadas = notif_module.disparar_notificacoes_vencidas()

        self.assertEqual(enviadas, 1)
        insert_ops = [
            op for op in operations
            if op[0] == "sql"
            and op[1].startswith("INSERT INTO notificacoes")
        ]
        self.assertTrue(insert_ops, "Esperado reagendamento para recorrente")

    def test_get_notificacoes_returns_list(self):
        from app.routes.notifications import notifications_bp

        app = create_test_app(notifications_bp)
        operations = []
        linhas = [
            {
                "id": 10,
                "dieta_treino_id": 99,
                "tipo": "treino",
                "titulo": "Lembrete de Treino: Pernal",
                "mensagem": "Nao esqueca do seu treino",
                "agendado_para": "2026-07-16 08:00:00",
                "enviado_email": 0,
                "lida": 0,
                "recorrente": 1,
                "enviado_em": None,
                "criado_em": "2026-07-16 07:00:00",
            }
        ]
        cursor = NotifFakeCursor(operations, rows=linhas)
        conn = FakeConn(operations)

        with patch("app.services.access_control.user_has_premium", return_value=True), patch(
            "app.routes.notifications.get_db", return_value=FakeDb(cursor, conn)
        ):
            response = app.test_client().get("/notificacoes", headers=auth_header(app))

        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(len(data["notificacoes"]), 1)
        self.assertEqual(data["notificacoes"][0]["id"], 10)
        self.assertEqual(data["notificacoes"][0]["tipo"], "treino")

    def test_create_item_sem_email_marca_email_reminder_false(self):
        app = create_test_app(fitness_bp)
        operations = []
        cursor = FakeCursor(operations, item={"id": 99, "tipo": "treino"})
        cursor.lastrowid = 99
        conn = FakeConn(operations)

        with patch("app.services.access_control.user_has_premium", return_value=True), patch(
            "app.routes.fitness.get_db", return_value=FakeDb(cursor, conn)
        ), patch("app.routes.fitness.agendar_notificacao_item", return_value=123):
            response = app.test_client().post(
                "/dieta-treino",
                headers=auth_header(app),
                json={
                    "tipo": "treino",
                    "title": "Pernal",
                    "description": "Agachamento",
                    "time": "08:00",
                    "date": "2026-07-16",
                },
            )

        self.assertEqual(response.status_code, 201)
        data = response.get_json()
        self.assertIsNotNone(data["notification"])
        self.assertFalse(data["notification"]["emailReminder"])


class InviteMemoryCursor:
    def __init__(self, operations, convites=None, usuarios=None):
        self.operations = operations
        self.convites = convites if convites is not None else []
        self.usuarios = usuarios if usuarios is not None else []
        self.rowcount = 0
        self.lastrowid = 1
        self._next_result = None

    def execute(self, query, params=None):
        normalized = " ".join(query.split())
        self.operations.append(("sql", normalized, params))
        if normalized.startswith("INSERT INTO convites_profissionais"):
            self.convites.append({
                "id": len(self.convites) + 1,
                "professional_id": params[0],
                "token": params[1],
                "usado_por": None,
                "expira_em": params[2],
            })
            self.lastrowid = self.convites[-1]["id"]
        elif normalized.startswith("SELECT id, professional_id, usado_por, expira_em FROM convites_profissionais"):
            token = params[0]
            convite = next((c for c in self.convites if c["token"] == token), None)
            self._next_result = self._convite_com_profissional(convite)
        elif "FROM convites_profissionais" in normalized and "c.usado_por" in normalized:
            token = params[0]
            convite = next((c for c in self.convites if c["token"] == token), None)
            self._next_result = self._convite_com_profissional(convite)
        elif normalized.startswith("UPDATE convites_profissionais SET usado_por"):
            for c in self.convites:
                if c["token"] == params[1]:
                    c["usado_por"] = params[0]
        elif normalized.startswith("INSERT INTO usuarios"):
            self._next_result = None

    def fetchone(self):
        return self._next_result

    def _convite_com_profissional(self, convite):
        if not convite:
            return None
        expira = convite.get("expira_em")
        if isinstance(expira, str):
            try:
                expira = datetime.strptime(expira, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                expira = None
        return dict(convite, nome="Dra. Ana", email="ana@ex.com", role="nutritionist", foto=None, expira_em=expira)

    def fetchall(self):
        return []


class InviteTests(unittest.TestCase):
    def test_criar_e_validar_convite(self):
        from app.routes.invites import invites_bp

        app = create_test_app(invites_bp)
        operations = []
        cursor = InviteMemoryCursor(operations)
        conn = FakeConn(operations)

        with patch("app.services.access_control.user_role", return_value="nutritionist"), patch(
            "app.routes.invites.get_db", return_value=FakeDb(cursor, conn)
        ):
            create = app.test_client().post("/invites", headers=auth_header(app))
            self.assertEqual(create.status_code, 201)
            token = create.get_json()["token"]

            validate = app.test_client().get(f"/invites/validate?token={token}")
            self.assertEqual(validate.status_code, 200)
            data = validate.get_json()
            self.assertTrue(data["valid"])
            self.assertEqual(data["professional"]["tipo"], "nutricionista")

    def test_validar_convite_inexistente(self):
        from app.routes.invites import invites_bp

        app = create_test_app(invites_bp)
        operations = []
        cursor = InviteMemoryCursor(operations)
        conn = FakeConn(operations)

        with patch("app.routes.invites.get_db", return_value=FakeDb(cursor, conn)):
            response = app.test_client().get("/invites/validate?token=naoexiste")
            self.assertEqual(response.status_code, 404)

    def test_cadastro_com_convite_associa_convidado_por(self):
        from app.routes.auth import auth_bp

        app = create_test_app(auth_bp)
        operations = []
        convites = [{
            "id": 1, "professional_id": 7, "token": "tok123", "usado_por": None,
            "expira_em": "2099-01-01 00:00:00",
        }]
        cursor = InviteMemoryCursor(operations, convites=convites, usuarios=[{"id": 1}])
        conn = FakeConn(operations)

        with patch("app.routes.auth.check_rate_limit", return_value=(True, None)), patch(
            "app.routes.auth.ensure_usuario_access_columns"
        ), patch("app.services.account_cache.set_cached_account"), patch(
            "app.routes.auth.get_db", return_value=FakeDb(cursor, conn)
        ):
            response = app.test_client().post(
                "/cadastro",
                json={
                    "nome": "Joao", "sobrenome": "Silva",
                    "email": "joao@example.com", "senha": "Senha12345",
                    "convite": "tok123",
                },
            )

        self.assertEqual(response.status_code, 201)
        insert_ops = [
            op for op in operations
            if op[0] == "sql" and op[1].startswith("INSERT INTO usuarios")
        ]
        self.assertTrue(insert_ops, "Esperado INSERT em usuarios")
        params = insert_ops[0][2]
        self.assertIn(7, params, "convidado_por deve ser o professional_id")


if __name__ == "__main__":
    unittest.main()
