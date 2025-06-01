package by.sakhdanil.managmentserver.dto.note;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Запрос на создание или обновление заметки")
public record NoteRequest(
    @Schema(
        description = "Зашифрованное название заметки (AES шифрование на клиенте)",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y="
    )
    @NotBlank(message = "Encrypted title is required")
    String encryptedTitle,
    
    @Schema(
        description = "Зашифрованный тип заметки (AES шифрование на клиенте)",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y="
    )
    @NotBlank(message = "Encrypted type is required")
    String encryptedType,
    
    @Schema(
        description = "Зашифрованные данные заметки (AES шифрование на клиенте)",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y96Qsv2Lm+31cmzaAILwyt"
    )
    @NotBlank(message = "Encrypted data is required")
    String encryptedData
) {}
