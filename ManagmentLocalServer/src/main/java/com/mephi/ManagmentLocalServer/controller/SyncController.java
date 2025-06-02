package com.mephi.ManagmentLocalServer.controller;


import com.mephi.ManagmentLocalServer.dto.sync.SyncPushRequest;
import com.mephi.ManagmentLocalServer.dto.sync.SyncResponse;
import com.mephi.ManagmentLocalServer.service.SyncService;
import com.mephi.ManagmentLocalServer.service.UserService;
import com.mephi.ManagmentLocalServer.service.SecureNoteService;
import com.mephi.ManagmentLocalServer.service.PasswordEntryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.ExampleObject;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/sync")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "🔄 Synchronization", description = "Синхронизация данных с удаленным сервером")
@SecurityRequirement(name = "Bearer Authentication")
public class SyncController {

    private final SyncService syncService;
    private final UserService userService;
    private final SecureNoteService noteService;
    private final PasswordEntryService passwordService;

    @PostMapping("/push")
    @Operation(
        summary = "Выгрузить данные на удаленный сервер",
        description = """
            Отправляет локальные несинхронизированные данные на удаленный сервер.
            
            **Процесс:**
            1. Находит все локальные записи, которые не синхронизированы (lastSyncAt = null или updatedAt > lastSyncAt)
            2. Отправляет их на удаленный сервер в зашифрованном виде
            3. Получает remoteId для каждой записи
            4. Обновляет локальные записи с remoteId и lastSyncAt
            
            **Требования:**
            - Пользователь должен быть авторизован локально (Bearer токен)
            - Должен быть связан аккаунт с удаленным сервером (remoteId + remoteToken)
            - Удаленный сервер должен быть доступен
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Синхронизация выполнена",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = SyncResponse.class),
                examples = @ExampleObject(
                    name = "Успешная выгрузка",
                    value = """
                        {
                          "success": true,
                          "message": "Successfully pushed data to remote server",
                          "syncTime": "2024-01-15T12:00:00Z",
                          "notesPushed": 3,
                          "passwordsPushed": 5,
                          "notesPulled": 0,
                          "passwordsPulled": 0,
                          "conflicts": 0
                        }
                        """
                )
            )
        ),
        @ApiResponse(responseCode = "401", description = "Не авторизован"),
        @ApiResponse(responseCode = "400", description = "Нет связи с удаленным сервером")
    })
    public ResponseEntity<SyncResponse> pushToRemote(@Valid @RequestBody SyncPushRequest request) {
        log.info("Push sync request: syncNotes={}, syncPasswords={}, forceSync={}", 
                request.isSyncNotes(), request.isSyncPasswords(), request.isForceSync());
        
        SyncResponse response = syncService.pushToRemote(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/pull")
    @Operation(
        summary = "Загрузить данные с удаленного сервера",
        description = """
            Получает данные с удаленного сервера и обновляет локальную базу.
            
            **Процесс:**
            1. Запрашивает все данные пользователя с удаленного сервера
            2. Сравнивает с локальными данными по remoteId
            3. Создает новые локальные записи для данных, которых нет локально
            4. Обновляет существующие записи, если удаленная версия новее
            5. Разрешает конфликты по времени изменения
            
            **Требования:**
            - Пользователь должен быть авторизован локально (Bearer токен)
            - Должен быть связан аккаунт с удаленным сервером (remoteId + remoteToken)
            - Удаленный сервер должен быть доступен
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Синхронизация выполнена",
            content = @Content(
                mediaType = "application/json",
                schema = @Schema(implementation = SyncResponse.class),
                examples = @ExampleObject(
                    name = "Успешная загрузка",
                    value = """
                        {
                          "success": true,
                          "message": "Successfully pulled data from remote server",
                          "syncTime": "2024-01-15T12:00:00Z",
                          "notesPushed": 0,
                          "passwordsPushed": 0,
                          "notesPulled": 2,
                          "passwordsPulled": 3,
                          "conflicts": 1
                        }
                        """
                )
            )
        ),
        @ApiResponse(responseCode = "401", description = "Не авторизован"),
        @ApiResponse(responseCode = "400", description = "Нет связи с удаленным сервером")
    })
    public ResponseEntity<SyncResponse> pullFromRemote() {
        log.info("Pull sync request received");
        
        SyncResponse response = syncService.pullFromRemote();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/status")
    @Operation(
        summary = "Статус синхронизации",
        description = """
            Возвращает информацию о состоянии синхронизации.
            
            **Проверяет:**
            - Включена ли синхронизация
            - Доступен ли удаленный сервер
            - Связан ли аккаунт с удаленным сервером
            - Количество несинхронизированных записей
            """
    )
    @ApiResponses(value = {
        @ApiResponse(
            responseCode = "200",
            description = "Статус получен",
            content = @Content(
                mediaType = "application/json",
                examples = @ExampleObject(
                    name = "Статус синхронизации",
                    value = """
                        {
                          "syncEnabled": true,
                          "remoteServerAvailable": true,
                          "hasRemoteAccount": true,
                          "unsyncedNotes": 2,
                          "unsyncedPasswords": 1,
                          "lastSyncTime": "2024-01-15T11:30:00Z"
                        }
                        """
                )
            )
        ),
        @ApiResponse(responseCode = "401", description = "Не авторизован")
    })
    public ResponseEntity<Map<String, Object>> getSyncStatus() {
        boolean remoteAvailable = syncService.checkRemoteConnection();
        boolean hasRemoteAccount = false;
        int unsyncedNotes = 0;
        int unsyncedPasswords = 0;
        
        try {
            hasRemoteAccount = userService.hasRemoteAccount();
            unsyncedNotes = noteService.countUnsyncedNotes();
            unsyncedPasswords = passwordService.countUnsyncedPasswords();
        } catch (Exception e) {
            log.warn("Failed to get sync statistics", e);
        }
        
        Map<String, Object> status = Map.of(
            "syncEnabled", true, // Получить из конфигурации
            "remoteServerAvailable", remoteAvailable,
            "hasRemoteAccount", hasRemoteAccount,
            "unsyncedNotes", unsyncedNotes,
            "unsyncedPasswords", unsyncedPasswords,
            "canSync", hasRemoteAccount && remoteAvailable
        );
        
        return ResponseEntity.ok(status);
    }
} 