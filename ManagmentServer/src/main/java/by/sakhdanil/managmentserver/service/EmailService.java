package by.sakhdanil.managmentserver.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {
    
    private final JavaMailSender mailSender;
    
    @Value("${app.mail.from:noreply@passwordmanager.com}")
    private String fromEmail;
    
    @Value("${app.name:Password Manager}")
    private String appName;
    
    private final SecureRandom random = new SecureRandom();
    
    /**
     * Генерирует безопасный 6-значный OTP код
     */
    public String generateOtpCode() {
        int code = 100000 + random.nextInt(900000);
        return String.valueOf(code);
    }
    
    /**
     * Отправляет OTP код для подтверждения email
     */
    public CompletableFuture<Boolean> sendEmailVerificationOtp(String email, String username, String otpCode) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromEmail);
                message.setTo(email);
                message.setSubject(appName + " - Email Verification");
                message.setText(buildEmailVerificationMessage(username, otpCode));
                
                mailSender.send(message);
                log.info("✅ Email verification OTP sent to: {}", email);
                return true;
            } catch (Exception e) {
                log.error("❌ Failed to send email verification OTP to {}: {}", email, e.getMessage());
                return false;
            }
        });
    }
    
    /**
     * Отправляет OTP код для настройки синхронизации
     */
    public CompletableFuture<Boolean> sendSyncSetupOtp(String email, String username, String otpCode) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromEmail);
                message.setTo(email);
                message.setSubject(appName + " - Sync Setup Verification");
                message.setText(buildSyncSetupMessage(username, otpCode));
                
                mailSender.send(message);
                log.info("✅ Sync setup OTP sent to: {}", email);
                return true;
            } catch (Exception e) {
                log.error("❌ Failed to send sync setup OTP to {}: {}", email, e.getMessage());
                return false;
            }
        });
    }
    
    /**
     * Отправляет OTP код для восстановления аккаунта
     */
    public CompletableFuture<Boolean> sendAccountRecoveryOtp(String email, String username, String otpCode) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromEmail);
                message.setTo(email);
                message.setSubject(appName + " - Account Recovery");
                message.setText(buildAccountRecoveryMessage(username, otpCode));
                
                mailSender.send(message);
                log.info("✅ Account recovery OTP sent to: {}", email);
                return true;
            } catch (Exception e) {
                log.error("❌ Failed to send account recovery OTP to {}: {}", email, e.getMessage());
                return false;
            }
        });
    }
    
    /**
     * Отправляет OTP код для облачного входа
     */
    public CompletableFuture<Boolean> sendCloudLoginOtp(String email, String username, String otpCode) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(fromEmail);
                message.setTo(email);
                message.setSubject(appName + " - Cloud Login Verification");
                message.setText(buildCloudLoginMessage(username, otpCode));
                
                mailSender.send(message);
                log.info("✅ Cloud login OTP sent to: {}", email);
                return true;
            } catch (Exception e) {
                log.error("❌ Failed to send cloud login OTP to {}: {}", email, e.getMessage());
                return false;
            }
        });
    }
    
    private String buildEmailVerificationMessage(String username, String otpCode) {
        return String.format("""
            Hello %s,
            
            Welcome to %s!
            
            To complete your email verification, please use the following code:
            
            %s
            
            This code will expire in 10 minutes.
            
            If you didn't request this verification, please ignore this email.
            
            Best regards,
            %s Team
            """, username, appName, otpCode, appName);
    }
    
    private String buildSyncSetupMessage(String username, String otpCode) {
        return String.format("""
            Hello %s,
            
            You're setting up synchronization for your %s account.
            
            To complete the setup, please use the following verification code:
            
            %s
            
            This code will expire in 10 minutes.
            
            If you didn't request this setup, please secure your account immediately.
            
            Best regards,
            %s Team
            """, username, appName, otpCode, appName);
    }
    
    private String buildAccountRecoveryMessage(String username, String otpCode) {
        return String.format("""
            Hello %s,
            
            You've requested to recover your %s account.
            
            To complete the recovery process, please use the following code:
            
            %s
            
            This code will expire in 10 minutes.
            
            If you didn't request this recovery, please contact our support team immediately.
            
            Best regards,
            %s Team
            """, username, appName, otpCode, appName);
    }
    
    private String buildCloudLoginMessage(String username, String otpCode) {
        return String.format("""
            Hello %s,
            
            Someone is trying to access your %s account from a new device.
            
            To complete the cloud login, please use the following verification code:
            
            %s
            
            This code will expire in 10 minutes.
            
            If this wasn't you, please secure your account immediately and change your master password.
            
            Best regards,
            %s Team
            """, username, appName, otpCode, appName);
    }
} 