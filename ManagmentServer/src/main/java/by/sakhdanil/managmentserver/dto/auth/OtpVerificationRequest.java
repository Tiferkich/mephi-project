package by.sakhdanil.managmentserver.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OtpVerificationRequest {
    
    @NotBlank(message = "Username is required")
    private String username;
    
    @NotBlank(message = "OTP code is required")
    private String otpCode;
    
    @NotBlank(message = "OTP type is required")
    private String otpType; // "EMAIL_VERIFICATION", "ACCOUNT_RECOVERY", "SYNC_SETUP"
} 