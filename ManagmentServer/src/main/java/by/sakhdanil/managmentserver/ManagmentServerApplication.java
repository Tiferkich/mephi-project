package by.sakhdanil.managmentserver;

import by.sakhdanil.managmentserver.config.BackupS3Properties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableConfigurationProperties(BackupS3Properties.class)
@EnableScheduling  // Для polling результатов VirusTotal
@EnableAsync       // Для асинхронного сканирования файлов
public class ManagmentServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(ManagmentServerApplication.class, args);
    }

}
