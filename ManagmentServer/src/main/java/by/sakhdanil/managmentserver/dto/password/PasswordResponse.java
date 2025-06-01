package by.sakhdanil.managmentserver.dto.password;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

@Schema(description = "Ответ с данными записи пароля")
public record PasswordResponse(
    @Schema(
        description = "Уникальный идентификатор записи пароля",
        example = "1"
    )
    Long id,
    
    @Schema(
        description = "Зашифрованное название записи пароля",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y="
    )
    String encryptedTitle,
    
    @Schema(
        description = "Зашифрованный сайт",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y="
    )
    String encryptedSite,
    
    @Schema(
        description = "Зашифрованный логин",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y="
    )
    String encryptedLogin,
    
    @Schema(
        description = "Зашифрованный пароль",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y="
    )
    String encryptedPassword,
    
    @Schema(
        description = "Зашифрованный тип записи",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y="
    )
    String encryptedType,
    
    @Schema(
        description = "Время создания записи",
        example = "2024-01-15T10:30:00.000Z"
    )
    Instant createdAt,
    
    @Schema(
        description = "Время последнего обновления записи",
        example = "2024-01-15T10:30:00.000Z"
    )
    Instant updatedAt
) {} 