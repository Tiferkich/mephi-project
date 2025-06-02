package by.sakhdanil.managmentserver.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AccountRecoveryRequest {
    
    @NotBlank(message = "Username is required")
    private String username;
    
    @Email(message = "Valid email is required")
    @NotBlank(message = "Email is required")
    private String email;
    
    @NotBlank(message = "New password hash is required")
    private String newPasswordHash;
    
    @NotBlank(message = "New salt is required")
    private String newSalt;
} 