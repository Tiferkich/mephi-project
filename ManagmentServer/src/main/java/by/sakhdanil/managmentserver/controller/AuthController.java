package by.sakhdanil.managmentserver.controller;

import by.sakhdanil.managmentserver.dto.user.JwtResponse;
import by.sakhdanil.managmentserver.dto.user.LoginRequest;
import by.sakhdanil.managmentserver.dto.user.RegisterRequest;
import by.sakhdanil.managmentserver.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "🔐 Authentication", description = "Эндпоинты для аутентификации пользователей")
public class AuthController {
    
    private final UserService userService;
    
    @PostMapping("/register")
    @Operation(
        summary = "Регистрация нового пользователя",
        description = """
            Регистрирует нового пользователя в системе.
            
            **Важно**: 
            - Мастер-пароль должен быть захеширован на клиенте (SHA-256)
            - Затем добавлена соль и повторно захеширован с помощью Argon2
            - Сервер никогда не получает исходный мастер-пароль
            
            **Процесс на клиенте:**
            1. `masterPasswordHash = SHA256(masterPassword)`
            2. `salt = generateRandomSalt()`
            3. `passwordHash = Argon2(masterPasswordHash + salt)`
            4. Отправить `{username, salt, passwordHash}` на сервер
            """,
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Данные для регистрации",
            required = true,
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = RegisterRequest.class),
                examples = @ExampleObject(
                    name = "Пример регистрации",
                    value = """
                        {
                          "username": "john_doe",
                          "salt": "a1b2c3d4e5f6",
                          "passwordHash": "$argon2id$v=19$m=4096,t=3,p=1$a1b2c3d4e5f6$hash_result"
                        }
                        """
                )
            )
        )
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Пользователь успешно зарегистрирован",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = JwtResponse.class),
                examples = @ExampleObject(
                    name = "Успешная регистрация",
                    value = """
                        {
                          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                          "userId": "123e4567-e89b-12d3-a456-426614174000",
                          "username": "john_doe"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Неверные данные запроса",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Ошибка валидации",
                    value = """
                        {
                          "timestamp": "2024-01-15T10:30:00.000Z",
                          "status": 400,
                          "error": "Bad Request",
                          "message": "Username must be between 3 and 50 characters",
                          "path": "/api/auth/register"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "409",
            description = "Пользователь уже существует",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Пользователь существует",
                    value = """
                        {
                          "timestamp": "2024-01-15T10:30:00.000Z",
                          "status": 409,
                          "error": "Conflict",
                          "message": "Username already exists",
                          "path": "/api/auth/register"
                        }
                        """
                )
            )
        )
    })
    public ResponseEntity<JwtResponse> register(@Valid @RequestBody RegisterRequest request) {
        JwtResponse response = userService.register(request);
        return ResponseEntity.ok(response);
    }
    
    @PostMapping("/login")
    @Operation(
        summary = "Вход в систему",
        description = """
            Аутентифицирует пользователя и возвращает JWT токен.
            
            **Важно**: 
            - Используйте тот же алгоритм хеширования, что и при регистрации
            - `passwordHash = Argon2(SHA256(masterPassword) + salt)`
            - Соль можно получить отдельным запросом или сохранить на клиенте
            
            **Полученный JWT токен** используйте в заголовке `Authorization: Bearer <token>` 
            для доступа к защищенным эндпоинтам.
            """,
        requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
            description = "Данные для входа",
            required = true,
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = LoginRequest.class),
                examples = @ExampleObject(
                    name = "Пример входа",
                    value = """
                        {
                          "username": "john_doe",
                          "passwordHash": "$argon2id$v=19$m=4096,t=3,p=1$a1b2c3d4e5f6$hash_result"
                        }
                        """
                )
            )
        )
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Успешный вход в систему",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = JwtResponse.class),
                examples = @ExampleObject(
                    name = "Успешный вход",
                    value = """
                        {
                          "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                          "userId": "123e4567-e89b-12d3-a456-426614174000",
                          "username": "john_doe"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "400",
            description = "Неверные данные запроса",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Ошибка валидации",
                    value = """
                        {
                          "timestamp": "2024-01-15T10:30:00.000Z",
                          "status": 400,
                          "error": "Bad Request",
                          "message": "Username is required",
                          "path": "/api/auth/login"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "401",
            description = "Неверные учетные данные",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Неверный пароль",
                    value = """
                        {
                          "timestamp": "2024-01-15T10:30:00.000Z",
                          "status": 401,
                          "error": "Unauthorized",
                          "message": "Invalid credentials",
                          "path": "/api/auth/login"
                        }
                        """
                )
            )
        ),
        @ApiResponse(
            responseCode = "404",
            description = "Пользователь не найден",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Пользователь не найден",
                    value = """
                        {
                          "timestamp": "2024-01-15T10:30:00.000Z",
                          "status": 404,
                          "error": "Not Found",
                          "message": "User not found",
                          "path": "/api/auth/login"
                        }
                        """
                )
            )
        )
    })
    public ResponseEntity<JwtResponse> login(@Valid @RequestBody LoginRequest request) {
        JwtResponse response = userService.login(request);
        return ResponseEntity.ok(response);
    }
}
