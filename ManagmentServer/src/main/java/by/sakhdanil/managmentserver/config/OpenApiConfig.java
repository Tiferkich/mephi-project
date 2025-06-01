package by.sakhdanil.managmentserver.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.info.License;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.examples.Example;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "Management Server API",
        version = "1.0.0",
        description = """
            # Management Server API
            
            Сервер для управления конфиденциальной пользовательской информацией. 
            Приложение предназначено для безопасного хранения зашифрованных заметок и паролей пользователей.
            
            ## Особенности безопасности
            
            - 🔐 **Шифрование на клиенте**: Все данные шифруются на клиенте перед отправкой на сервер
            - 🔑 **JWT аутентификация**: Безопасная аутентификация с использованием JWT токенов
            - 🛡️ **Argon2 хеширование**: Использование Argon2 для хеширования паролей
            - 🚫 **Мастер-пароль не хранится**: Сервер никогда не получает и не хранит мастер-пароль
            
            ## Архитектура безопасности
            
            1. **Клиент** хеширует мастер-пароль (SHA-256)
            2. Добавляет **соль** и хеширует повторно с помощью **Argon2**
            3. Отправляет результат на сервер для аутентификации
            4. Сервер возвращает **JWT токен** для последующих запросов
            5. Все пользовательские данные **шифруются на клиенте** перед отправкой
            
            ## Аутентификация
            
            Для доступа к защищенным эндпоинтам необходимо:
            1. Зарегистрироваться или войти в систему
            2. Получить JWT токен
            3. Добавить токен в заголовок: `Authorization: Bearer <token>`
            """,
        contact = @Contact(
            name = "API Support",
            email = "support@managementserver.com"
        ),
        license = @License(
            name = "MIT License",
            url = "https://opensource.org/licenses/MIT"
        )
    ),
    servers = {
        @Server(url = "http://localhost:8080", description = "Development server"),
        @Server(url = "https://api.managementserver.com", description = "Production server")
    }
)
@SecurityScheme(
    name = "Bearer Authentication",
    type = SecuritySchemeType.HTTP,
    bearerFormat = "JWT",
    scheme = "bearer",
    description = "JWT токен для аутентификации. Получите токен через /api/auth/login или /api/auth/register"
)
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
            .components(new Components()
                .addResponses("BadRequest", createErrorResponse(
                    "Неверный запрос",
                    "Ошибка валидации данных или неверные параметры запроса",
                    """
                    {
                      "timestamp": "2024-01-15T10:30:00.000Z",
                      "status": 400,
                      "error": "Bad Request",
                      "message": "Validation failed",
                      "path": "/api/auth/register"
                    }
                    """
                ))
                .addResponses("Unauthorized", createErrorResponse(
                    "Не авторизован",
                    "Отсутствует или недействительный JWT токен",
                    """
                    {
                      "timestamp": "2024-01-15T10:30:00.000Z",
                      "status": 401,
                      "error": "Unauthorized",
                      "message": "JWT token is missing or invalid",
                      "path": "/api/notes"
                    }
                    """
                ))
                .addResponses("Forbidden", createErrorResponse(
                    "Доступ запрещен",
                    "Недостаточно прав для выполнения операции",
                    """
                    {
                      "timestamp": "2024-01-15T10:30:00.000Z",
                      "status": 403,
                      "error": "Forbidden",
                      "message": "Access denied",
                      "path": "/api/notes/123"
                    }
                    """
                ))
                .addResponses("NotFound", createErrorResponse(
                    "Ресурс не найден",
                    "Запрашиваемый ресурс не существует или недоступен",
                    """
                    {
                      "timestamp": "2024-01-15T10:30:00.000Z",
                      "status": 404,
                      "error": "Not Found",
                      "message": "Note not found",
                      "path": "/api/notes/999"
                    }
                    """
                ))
                .addResponses("Conflict", createErrorResponse(
                    "Конфликт",
                    "Ресурс уже существует или конфликт состояния",
                    """
                    {
                      "timestamp": "2024-01-15T10:30:00.000Z",
                      "status": 409,
                      "error": "Conflict",
                      "message": "Username already exists",
                      "path": "/api/auth/register"
                    }
                    """
                ))
                .addResponses("InternalServerError", createErrorResponse(
                    "Внутренняя ошибка сервера",
                    "Произошла непредвиденная ошибка на сервере",
                    """
                    {
                      "timestamp": "2024-01-15T10:30:00.000Z",
                      "status": 500,
                      "error": "Internal Server Error",
                      "message": "An unexpected error occurred",
                      "path": "/api/notes"
                    }
                    """
                ))
                
                // Примеры схем данных
                .addSchemas("RegisterRequestExample", new Schema<>()
                    .type("object")
                    .description("Пример запроса регистрации")
                    .example("""
                        {
                          "username": "john_doe",
                          "salt": "random_salt_generated_by_client",
                          "passwordHash": "argon2_hash_of_sha256_password_plus_salt"
                        }
                        """))
                
                .addSchemas("LoginRequestExample", new Schema<>()
                    .type("object")
                    .description("Пример запроса входа")
                    .example("""
                        {
                          "username": "john_doe",
                          "passwordHash": "argon2_hash_of_sha256_password_plus_salt"
                        }
                        """))
                
                .addSchemas("NoteRequestExample", new Schema<>()
                    .type("object")
                    .description("Пример запроса создания заметки")
                    .example("""
                        {
                          "encryptedData": "AES_encrypted_note_content_by_client"
                        }
                        """))
                
                .addSchemas("PasswordRequestExample", new Schema<>()
                    .type("object")
                    .description("Пример запроса создания пароля")
                    .example("""
                        {
                          "encryptedData": "AES_encrypted_password_data_by_client"
                        }
                        """))
            );
    }
    
    private ApiResponse createErrorResponse(String summary, String description, String example) {
        return new ApiResponse()
            .description(description)
            .content(new Content()
                .addMediaType("application/json", new MediaType()
                    .schema(new Schema<>()
                        .type("object")
                        .addProperty("timestamp", new Schema<>().type("string").format("date-time"))
                        .addProperty("status", new Schema<>().type("integer"))
                        .addProperty("error", new Schema<>().type("string"))
                        .addProperty("message", new Schema<>().type("string"))
                        .addProperty("path", new Schema<>().type("string"))
                    )
                    .example(example)
                )
            );
    }
} 