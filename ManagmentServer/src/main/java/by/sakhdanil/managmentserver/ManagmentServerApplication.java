package by.sakhdanil.managmentserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling  // Для polling результатов VirusTotal
@EnableAsync       // Для асинхронного сканирования файлов
public class ManagmentServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(ManagmentServerApplication.class, args);
    }

}
