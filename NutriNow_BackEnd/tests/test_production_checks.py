import os
import unittest
from unittest.mock import patch

from app.services.production_checks import ProductionConfigError, validate_production_environment


class ProductionChecksTest(unittest.TestCase):
    def test_production_validation_rejects_missing_required_values(self):
        with patch.dict(os.environ, {"APP_ENV": "production"}, clear=True):
            with self.assertRaises(ProductionConfigError) as error:
                validate_production_environment()

        self.assertIn("FLASK_SECRET_KEY", str(error.exception))
        self.assertIn("FRONTEND_URL_PROD", str(error.exception))

    def test_production_validation_accepts_minimal_secure_config(self):
        env = {
            "APP_ENV": "production",
            "FLASK_SECRET_KEY": "x" * 40,
            "JWT_SECRET_KEY": "y" * 40,
            "MYSQL_HOST": "db.example.com",
            "MYSQL_USER": "nutrinow",
            "MYSQL_PASSWORD": "db-password",
            "MYSQL_DATABASE": "nutrinow",
            "GROQ_API_KEY": "gsk_test",
            "GROQ_BASE_URL": "https://api.groq.com/openai/v1",
            "GROQ_PRIMARY_MODEL": "text-model",
            "GROQ_VISION_MODEL": "vision-model",
            "GOOGLE_CLIENT_ID": "client-id",
            "GOOGLE_CLIENT_SECRET": "z" * 40,
            "GOOGLE_LOGIN_REDIRECT_URI": "https://api.example.com/auth/callback",
            "GOOGLE_CALENDAR_REDIRECT_URI": "https://api.example.com/calendar/google/callback",
            "EMAIL_SENDER": "privacy@example.com",
            "EMAIL_PASSWORD": "mail-password-value-that-is-long-enough",
            "FRONTEND_URL_PROD": "https://app.example.com",
            "CORS_ORIGINS_PROD": "https://app.example.com",
            "JWT_COOKIE_SECURE": "true",
            "MAX_UPLOAD_MB": "5",
        }
        with patch.dict(os.environ, env, clear=True):
            self.assertEqual(validate_production_environment(), [])


if __name__ == "__main__":
    unittest.main()
