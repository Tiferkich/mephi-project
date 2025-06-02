package by.sakhdanil.managmentserver.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SyncSetupRequest {
    
    @NotBlank(message = "Username is required")
    private String username;
    
    @Email(message = "Valid email is required")
    @NotBlank(message = "Email is required")
    private String email;
    
    @NotBlank(message = "Password hash is required")
    private String passwordHash;
    
    @NotBlank(message = "Salt is required")
    private String salt;
    
    @NotBlank(message = "Local user ID is required")
    private String localUserId;
} 