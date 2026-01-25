package by.sakhdanil.managmentserver.config;

import by.sakhdanil.managmentserver.service.MalwareScanService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler для периодической проверки статуса сканирования файлов.
 * VirusTotal API асинхронный - нужен polling для получения результатов.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ScanPollingScheduler {
    
    private final MalwareScanService malwareScanService;
    
    /**
     * Проверяет статус PENDING сканирований каждые 30 секунд.
     * VirusTotal обычно возвращает результат за 1-2 минуты.
     */
    @Scheduled(fixedDelayString = "${virustotal.polling-interval:30000}")
    public void pollPendingScans() {
        try {
            malwareScanService.checkPendingScans();
        } catch (Exception e) {
            log.error("Error during scan polling: {}", e.getMessage());
        }
    }
}




