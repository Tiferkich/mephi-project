import random
import string
import hashlib
import json
from typing import Dict, List, Any


class TestDataGenerator:
    """Генератор тестовых данных для атак на ManagmentServer"""
    
    def __init__(self):
        self.usernames = [
            "test_user", "admin", "user123", "john_doe", "jane_smith",
            "demo_user", "attack_test", "load_test", "stress_user", "temp_user"
        ]
        
        self.emails = [
            "test@example.com", "admin@test.com", "user@demo.org",
            "john@example.com", "jane@test.org", "demo@example.com"
        ]
        
        self.passwords = [
            "password123", "admin123", "test1234", "demo_pass",
            "12345678", "qwerty123", "password", "admin"
        ]
        
        self.websites = [
            "google.com", "facebook.com", "github.com", "stackoverflow.com",
            "amazon.com", "netflix.com", "spotify.com", "twitter.com",
            "linkedin.com", "reddit.com", "youtube.com", "instagram.com"
        ]
        
        self.note_titles = [
            "Important Note", "Meeting Notes", "TODO List", "Ideas",
            "Shopping List", "Work Notes", "Personal", "Secret Notes"
        ]
        
        self.note_contents = [
            "This is a test note content for stress testing",
            "Meeting with team tomorrow at 10 AM",
            "Buy milk, eggs, bread from grocery store",
            "New project ideas: AI, blockchain, mobile app",
            "Password manager development roadmap",
            "Security best practices checklist"
        ]
    
    def generate_salt(self, length: int = 16) -> str:
        """Генерирует случайную соль"""
        return ''.join(random.choices(string.ascii_letters + string.digits, k=length))
    
    def hash_password(self, password: str) -> str:
        """Имитирует хеширование пароля (упрощенная версия)"""
        salt = self.generate_salt()
        # Имитация SHA256 + Argon2 хеширования
        sha256_hash = hashlib.sha256(password.encode()).hexdigest()
        return f"$argon2id$v=19$m=4096,t=3,p=1${salt}${sha256_hash[:32]}"
    
    def get_random_username(self) -> str:
        """Возвращает случайное имя пользователя"""
        return random.choice(self.usernames)
    
    def get_random_email(self) -> str:
        """Возвращает случайный email"""
        return random.choice(self.emails)
    
    def get_random_password(self) -> str:
        """Возвращает случайный пароль"""
        return random.choice(self.passwords)
    
    def generate_register_data(self) -> Dict[str, str]:
        """Генерирует данные для регистрации"""
        username = self.get_random_username() + "_" + str(random.randint(1000, 9999))
        password = self.get_random_password()
        salt = self.generate_salt()
        password_hash = self.hash_password(password)
        
        return {
            "username": username,
            "salt": salt,
            "passwordHash": password_hash
        }
    
    def generate_login_data(self) -> Dict[str, str]:
        """Генерирует данные для входа"""
        username = self.get_random_username()
        password = self.get_random_password()
        password_hash = self.hash_password(password)
        
        return {
            "username": username,
            "passwordHash": password_hash
        }
    
    def generate_sync_setup_data(self) -> Dict[str, str]:
        """Генерирует данные для настройки синхронизации"""
        return {
            "username": self.get_random_username(),
            "email": self.get_random_email(),
            "verificationCode": str(random.randint(100000, 999999))
        }
    
    def generate_otp_verification_data(self) -> Dict[str, str]:
        """Генерирует данные для верификации OTP"""
        return {
            "username": self.get_random_username(),
            "otpCode": str(random.randint(100000, 999999)),
            "email": self.get_random_email()
        }
    
    def generate_recovery_data(self) -> Dict[str, str]:
        """Генерирует данные для восстановления аккаунта"""
        return {
            "username": self.get_random_username(),
            "email": self.get_random_email()
        }
    
    def generate_cloud_login_data(self) -> Dict[str, str]:
        """Генерирует данные для облачного входа"""
        return {
            "email": self.get_random_email(),
            "username": self.get_random_username(),
            "masterPassword": self.get_random_password()
        }
    
    def generate_password_entry_data(self) -> Dict[str, str]:
        """Генерирует данные для записи пароля"""
        website = random.choice(self.websites)
        username = self.get_random_username()
        password = self.get_random_password()
        
        # Имитация зашифрованных данных
        encrypted_title = f"encrypted_title_{random.randint(1000, 9999)}"
        encrypted_data = f"encrypted_data_{random.randint(10000, 99999)}"
        
        return {
            "encryptedTitle": encrypted_title,
            "encryptedData": encrypted_data
        }
    
    def generate_note_data(self) -> Dict[str, str]:
        """Генерирует данные для заметки"""
        title = random.choice(self.note_titles)
        content = random.choice(self.note_contents)
        
        # Имитация зашифрованных данных
        encrypted_title = f"encrypted_note_title_{random.randint(1000, 9999)}"
        encrypted_data = f"encrypted_note_data_{random.randint(10000, 99999)}"
        
        return {
            "encryptedTitle": encrypted_title,
            "encryptedData": encrypted_data
        }
    
    def generate_transfer_token_data(self) -> Dict[str, str]:
        """Генерирует данные для создания токена переноса"""
        return {
            "username": self.get_random_username(),
            "passwordHash": self.hash_password(self.get_random_password()),
            "deviceInfo": f"TestDevice_{random.randint(100, 999)}"
        }
    
    def get_random_endpoint_data(self, endpoint: str) -> Dict[str, Any]:
        """Возвращает случайные данные для конкретного эндпоинта"""
        endpoint_data_map = {
            "/auth/register": self.generate_register_data,
            "/auth/login": self.generate_login_data,
            "/auth/sync-setup": self.generate_sync_setup_data,
            "/auth/verify-otp": self.generate_otp_verification_data,
            "/auth/initiate-recovery": self.generate_recovery_data,
            "/auth/cloud-login": self.generate_cloud_login_data,
            "/auth/create-transfer-token": self.generate_transfer_token_data,
            "/api/passwords": self.generate_password_entry_data,
            "/api/notes": self.generate_note_data,
        }
        
        generator_func = endpoint_data_map.get(endpoint)
        if generator_func:
            return generator_func()
        else:
            return {}
    
    def get_random_headers(self) -> Dict[str, str]:
        """Генерирует случайные HTTP заголовки"""
        user_agents = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0"
        ]
        
        return {
            "User-Agent": random.choice(user_agents),
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": random.choice(["en-US,en;q=0.9", "ru-RU,ru;q=0.9", "es-ES,es;q=0.8"]),
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin"
        }


# Глобальный экземпляр генератора данных
test_data_generator = TestDataGenerator() 