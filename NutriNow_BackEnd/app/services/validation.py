import re
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from flask import jsonify

logger = logging.getLogger(__name__)

class ValidationError(Exception):
    def __init__(self, message: str, field: Optional[str] = None, code: Optional[str] = None):
        self.message = message
        self.field = field
        self.code = code or "validation_error"
        super().__init__(message)

class InputValidator:
    @staticmethod
    def validate_email(email: str) -> str:
        if not email or not isinstance(email, str):
            raise ValidationError("Email é obrigatório", "email", "required")
        
        email = email.strip().lower()
        
        if len(email) > 254:
            raise ValidationError("Email muito longo", "email", "too_long")
        
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
            raise ValidationError("Formato de email inválido", "email", "invalid_format")
        
        return email
    
    @staticmethod
    def validate_password(password: str, confirm_password: Optional[str] = None) -> str:
        if not password or not isinstance(password, str):
            raise ValidationError("Senha é obrigatória", "password", "required")
        
        password = password.strip()
        
        if len(password) < 10:
            raise ValidationError("Senha deve ter pelo menos 10 caracteres", "password", "too_short")
        
        if len(password) > 128:
            raise ValidationError("Senha muito longa", "password", "too_long")
        
        if not re.search(r'[A-Z]', password):
            raise ValidationError("Senha deve conter pelo menos uma letra maiúscula", "password", "missing_uppercase")
        
        if not re.search(r'[a-z]', password):
            raise ValidationError("Senha deve conter pelo menos uma letra minúscula", "password", "missing_lowercase")
        
        if not re.search(r'\d', password):
            raise ValidationError("Senha deve conter pelo menos um número", "password", "missing_digit")
        
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            raise ValidationError("Senha deve conter pelo menos um caractere especial", "password", "missing_special_char")
        
        common_passwords = {
            "1234567890", "123456789", "12345678", "password", "password123",
            "senha123", "senha1234", "qwerty123", "qwerty12", "nutrinow123",
            "nutrinow1", "admin12345", "teste1234", "batata123", "abcd1234",
            "letmein", "welcome1", "iloveyou", "sunshine", "princess", "monkey", "master"
        }
        
        if password.lower() in common_passwords:
            raise ValidationError("Senha muito comum, escolha uma senha mais segura", "password", "common_password")
        
        if confirm_password is not None:
            if password != confirm_password:
                raise ValidationError("Senhas não coincidem", "confirm_password", "mismatch")
        
        return password
    
    @staticmethod
    def validate_name(name: str, field_name: str = "nome") -> str:
        if not name or not isinstance(name, str):
            raise ValidationError(f"{field_name.title()} é obrigatório", field_name, "required")
        
        name = name.strip()
        
        if len(name) < 2:
            raise ValidationError(f"{field_name.title()} deve ter pelo menos 2 caracteres", field_name, "too_short")
        
        if len(name) > 100:
            raise ValidationError(f"{field_name.title()} muito longo", field_name, "too_long")
        
        if not re.match(r'^[\w\s\-\']+$', name):
            raise ValidationError(f"{field_name.title()} contém caracteres inválidos", field_name, "invalid_characters")
        
        return name
    
    @staticmethod
    def validate_date_of_birth(date_str: str) -> datetime:
        if not date_str:
            raise ValidationError("Data de nascimento é obrigatória", "date_of_birth", "required")
        
        try:
            date_obj = datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            raise ValidationError("Formato de data inválido. Use YYYY-MM-DD", "date_of_birth", "invalid_format")
        
        today = datetime.now()
        age = today.year - date_obj.year - ((today.month, today.day) < (date_obj.month, date_obj.day))
        
        if age < 13:
            raise ValidationError("Você deve ter pelo menos 13 anos para se cadastrar", "date_of_birth", "too_young")
        
        if age > 120:
            raise ValidationError("Data de nascimento inválida", "date_of_birth", "invalid_age")
        
        return date_obj
    
    @staticmethod
    def validate_height(height: Any) -> float:
        try:
            height_float = float(height)
        except (ValueError, TypeError):
            raise ValidationError("Altura deve ser um número válido", "height", "invalid_number")
        
        if height_float < 50 or height_float > 300:
            raise ValidationError("Altura deve estar entre 50cm e 300cm", "height", "out_of_range")
        
        return round(height_float, 2)
    
    @staticmethod
    def validate_weight(weight: Any) -> float:
        try:
            weight_float = float(weight)
        except (ValueError, TypeError):
            raise ValidationError("Peso deve ser um número válido", "weight", "invalid_number")
        
        if weight_float < 20 or weight_float > 1000:
            raise ValidationError("Peso deve estar entre 20kg e 1000kg", "weight", "out_of_range")
        
        return round(weight_float, 2)
    
    @staticmethod
    def validate_phone(phone: str) -> str:
        if not phone:
            return ""
        
        phone = phone.strip()
        
        if len(phone) > 20:
            raise ValidationError("Telefone muito longo", "phone", "too_long")
        
        if not re.match(r'^[\d\s\(\)\-\+]+$', phone):
            raise ValidationError("Formato de telefone inválido", "phone", "invalid_format")
        
        return phone
    
    @staticmethod
    def validate_object_id(id_value: Any, field_name: str = "id") -> int:
        try:
            id_int = int(id_value)
        except (ValueError, TypeError):
            raise ValidationError(f"{field_name.title()} deve ser um número inteiro", field_name, "invalid_number")
        
        if id_int <= 0:
            raise ValidationError(f"{field_name.title()} deve ser maior que 0", field_name, "invalid_value")
        
        return id_int
    
    @staticmethod
    def validate_pagination(page: Any, per_page: Any) -> tuple[int, int]:
        try:
            page_int = max(1, int(page))
        except (ValueError, TypeError):
            page_int = 1
        
        try:
            per_page_int = min(max(1, int(per_page)), 100)
        except (ValueError, TypeError):
            per_page_int = 20
        
        return page_int, per_page_int

class ResponseFormatter:
    @staticmethod
    def success(data: Any = None, message: Optional[str] = None) -> tuple:
        response = {"success": True}
        if data is not None:
            response["data"] = data
        if message:
            response["message"] = message
        return jsonify(response), 200
    
    @staticmethod
    def error(error: ValidationError) -> tuple:
        response = {
            "success": False,
            "error": {
                "message": error.message,
                "code": error.code,
                "field": error.field
            }
        }
        return jsonify(response), 400
    
    @staticmethod
    def paginated(data: List[Any], page: int, per_page: int, total: int) -> tuple:
        total_pages = (total + per_page - 1) // per_page
        
        response = {
            "success": True,
            "data": data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": total,
                "total_pages": total_pages
            }
        }
        return jsonify(response), 200