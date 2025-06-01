package com.mephi.ManagmentLocalServer.dto.note;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NoteRequest {
    
    @NotBlank(message = "Encrypted title is required")
    private String encryptedTitle;
    
    @NotBlank(message = "Encrypted type is required")
    private String encryptedType;
    
    @NotBlank(message = "Encrypted data is required")
    private String encryptedData;
} 