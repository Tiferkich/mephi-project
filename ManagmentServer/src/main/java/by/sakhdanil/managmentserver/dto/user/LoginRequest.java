package by.sakhdanil.managmentserver.dto.user;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Запрос на вход в систему")
public record LoginRequest(
    @Schema(
        description = "Имя пользователя (логин)",
        example = "john_doe"
    )
    @NotBlank(message = "Username is required")
    String username,
    
    @Schema(
        description = "Хеш пароля: Argon2(SHA256(masterPassword) + salt)",
        example = "$argon2id$v=19$m=4096,t=3,p=1$a1b2c3d4e5f6$hash_result"
    )
    @NotBlank(message = "Password hash is required")
    String passwordHash
) {}
