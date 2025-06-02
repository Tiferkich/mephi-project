package by.sakhdanil.managmentserver.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransferTokenRequest {
    
    @NotBlank(message = "Username is required")
    private String username;
    
    @NotBlank(message = "Password hash is required")
    private String passwordHash;
    
    // Опциональные поля для дополнительной безопасности
    private String deviceInfo;
    private String ipAddress;
} 