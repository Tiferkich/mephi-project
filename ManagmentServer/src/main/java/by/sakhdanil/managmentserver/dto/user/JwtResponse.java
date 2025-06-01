package by.sakhdanil.managmentserver.dto.user;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Ответ с JWT токеном после успешной аутентификации")
public record JwtResponse(
    @Schema(
        description = "JWT токен для аутентификации",
        example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    )
    String token,
    
    @Schema(
        description = "Тип токена",
        example = "Bearer"
    )
    String type,
    
    @Schema(
        description = "Уникальный идентификатор пользователя",
        example = "123e4567-e89b-12d3-a456-426614174000"
    )
    String userId,
    
    @Schema(
        description = "Имя пользователя",
        example = "john_doe"
    )
    String username
) {
    public JwtResponse(String token, String userId, String username) {
        this(token, "Bearer", userId, username);
    }
}
