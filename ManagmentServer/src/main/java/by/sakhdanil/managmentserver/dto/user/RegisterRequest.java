package by.sakhdanil.managmentserver.dto.user;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Запрос на регистрацию нового пользователя")
public record RegisterRequest(
    @Schema(
        description = "Имя пользователя (логин)",
        example = "john_doe",
        minLength = 3,
        maxLength = 50
    )
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    String username,
    
    @Schema(
        description = "Соль, сгенерированная на клиенте для хеширования пароля",
        example = "a1b2c3d4e5f6g7h8"
    )
    @NotBlank(message = "Salt is required")
    String salt,
    
    @Schema(
        description = "Хеш пароля: Argon2(SHA256(masterPassword) + salt)",
        example = "$argon2id$v=19$m=4096,t=3,p=1$a1b2c3d4e5f6$hash_result"
    )
    @NotBlank(message = "Password hash is required")
    String passwordHash
) {}
