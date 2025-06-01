package by.sakhdanil.managmentserver.dto.note;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;

@Schema(description = "Ответ с данными заметки")
public record NoteResponse(
    @Schema(
        description = "Уникальный идентификатор заметки",
        example = "1"
    )
    Long id,
    
    @Schema(
        description = "Зашифрованное название заметки",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y="
    )
    String encryptedTitle,
    
    @Schema(
        description = "Зашифрованный тип заметки",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y="
    )
    String encryptedType,
    
    @Schema(
        description = "Зашифрованные данные заметки",
        example = "U2FsdGVkX1+vupppZksvRf5pq5g5XjFRIipRkwB0K1Y96Qsv2Lm+31cmzaAILwyt"
    )
    String encryptedData,
    
    @Schema(
        description = "Время создания заметки",
        example = "2024-01-15T10:30:00.000Z"
    )
    Instant createdAt,
    
    @Schema(
        description = "Время последнего обновления заметки",
        example = "2024-01-15T10:30:00.000Z"
    )
    Instant updatedAt
) {}
