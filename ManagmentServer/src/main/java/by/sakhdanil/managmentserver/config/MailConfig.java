package by.sakhdanil.managmentserver.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

import java.util.Properties;

@Configuration
public class MailConfig {

    @Value("${mail.host:smtp.gmail.com}")
    private String host;

    @Value("${mail.port:587}")
    private int port;

    @Value("${mail.username:}")
    private String username;

    @Value("${mail.password:}")
    private String password;

    @Bean
    @ConditionalOnProperty(name = "mail.enabled", havingValue = "true", matchIfMissing = true)
    public JavaMailSender javaMailSender() {
        JavaMailSenderImpl mailSender = new JavaMailSenderImpl();
        
        // Проверяем что настройки email заданы
        if (username.isEmpty() || password.isEmpty()) {
            System.out.println("⚠️ Email настройки не заданы, используем mock email sender");
            return createMockMailSender();
        }
        
        mailSender.setHost(host);
        mailSender.setPort(port);
        mailSender.setUsername(username);
        mailSender.setPassword(password);
        
        Properties props = mailSender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.connectiontimeout", "5000");
        props.put("mail.smtp.timeout", "3000");
        props.put("mail.smtp.writetimeout", "5000");
        props.put("mail.debug", "false"); // Включите для отладки
        
        System.out.println("✅ Настроен real email sender: " + username);
        return mailSender;
    }
    
    private JavaMailSender createMockMailSender() {
        return new JavaMailSenderImpl() {
            @Override
            public void send(org.springframework.mail.SimpleMailMessage simpleMessage) {
                System.out.println("📧 MOCK EMAIL SENT:");
                System.out.println("   To: " + simpleMessage.getTo()[0]);
                System.out.println("   Subject: " + simpleMessage.getSubject());
                System.out.println("   Text: " + simpleMessage.getText());
                // Не отправляем реальный email
            }
        };
    }
} 