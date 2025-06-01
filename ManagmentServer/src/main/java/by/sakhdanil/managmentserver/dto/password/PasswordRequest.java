package by.sakhdanil.managmentserver.dto.password;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Запрос на создание или обновление записи пароля")
public record PasswordRequest(
    @Schema(
        description = "Зашифрованное название записи пароля (AES шифрование на клиенте)",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y="
    )
    @NotBlank(message = "Encrypted title is required")
    String encryptedTitle,
    
    @Schema(
        description = "Зашифрованный сайт (AES шифрование на клиенте)",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y="
    )
    @NotBlank(message = "Encrypted site is required")
    String encryptedSite,
    
    @Schema(
        description = "Зашифрованный логин (AES шифрование на клиенте)",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y="
    )
    @NotBlank(message = "Encrypted login is required")
    String encryptedLogin,
    
    @Schema(
        description = "Зашифрованный пароль (AES шифрование на клиенте)",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y="
    )
    @NotBlank(message = "Encrypted password is required")
    String encryptedPassword,
    
    @Schema(
        description = "Зашифрованный тип записи (AES шифрование на клиенте)",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y="
    )
    @NotBlank(message = "Encrypted type is required")
    String encryptedType
) {} 