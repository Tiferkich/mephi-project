package com.mephi.ManagmentLocalServer.service;

import com.mephi.ManagmentLocalServer.dto.note.NoteRequest;
import com.mephi.ManagmentLocalServer.dto.password.PasswordRequest;
import com.mephi.ManagmentLocalServer.dto.remote.RemoteNoteResponse;
import com.mephi.ManagmentLocalServer.dto.remote.RemotePasswordResponse;
import com.mephi.ManagmentLocalServer.dto.sync.ConflictResolutionStrategy;
import com.mephi.ManagmentLocalServer.dto.sync.SyncPushRequest;
import com.mephi.ManagmentLocalServer.dto.sync.SyncResponse;
import com.mephi.ManagmentLocalServer.entity.PasswordEntry;
import com.mephi.ManagmentLocalServer.entity.SecureNote;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class SyncService {

    private final UserService userService;
    private final SecureNoteService noteService;
    private final PasswordEntryService passwordService;
    private final WebClient.Builder webClientBuilder;

    @Value("${remote.server.url}")
    private String remoteServerUrl;

    @Value("${remote.server.enabled}")
    private boolean remoteEnabled;

    @Value("${remote.server.timeout}")
    private int timeout;

    @Transactional
    public SyncResponse pushToRemote(SyncPushRequest request) {
        if (!remoteEnabled) {
            return SyncResponse.error("Remote synchronization is disabled");
        }

        if (!userService.hasRemoteAccount()) {
            return SyncResponse.error("No remote account linked. Please register on remote server first");
        }

        try {
            SyncResponse response = SyncResponse.success("Synchronization started");
            
            if (request.isSyncNotes()) {
                int pushedNotes = pushNotesToRemote(request.isForceSync());
                response.setNotesPushed(pushedNotes);
                log.info("Pushed {} notes to remote server", pushedNotes);
            }

            if (request.isSyncPasswords()) {
                int pushedPasswords = pushPasswordsToRemote(request.isForceSync());
                response.setPasswordsPushed(pushedPasswords);
                log.info("Pushed {} passwords to remote server", pushedPasswords);
            }

            response.setMessage("Successfully pushed data to remote server");
            return response;

        } catch (Exception e) {
            log.error("Error during push synchronization", e);
            return SyncResponse.error("Sync failed: " + e.getMessage());
        }
    }

    @Transactional
    public SyncResponse pullFromRemote() {
        return pullFromRemote(ConflictResolutionStrategy.LATEST_TIMESTAMP);
    }

    @Transactional
    public SyncResponse pullFromRemote(ConflictResolutionStrategy conflictStrategy) {
        if (!remoteEnabled) {
            return SyncResponse.error("Remote synchronization is disabled");
        }

        if (!userService.hasRemoteAccount()) {
            return SyncResponse.error("No remote account linked. Please register on remote server first");
        }

        try {
            SyncResponse response = SyncResponse.success("Pull synchronization started");
            
            CompletableFuture<Integer> notesFuture = CompletableFuture.supplyAsync(() -> {
                try {
                    return pullNotesFromRemote(conflictStrategy);
                } catch (Exception e) {
                    log.error("Error pulling notes", e);
                    return 0;
                }
            });

            CompletableFuture<Integer> passwordsFuture = CompletableFuture.supplyAsync(() -> {
                try {
                    return pullPasswordsFromRemote(conflictStrategy);
                } catch (Exception e) {
                    log.error("Error pulling passwords", e);
                    return 0;
                }
            });

            // Ожидаем завершения обеих операций
            CompletableFuture.allOf(notesFuture, passwordsFuture).join();
            
            int pulledNotes = notesFuture.get();
            int pulledPasswords = passwordsFuture.get();
            
            response.setNotesPulled(pulledNotes);
            response.setPasswordsPulled(pulledPasswords);
            response.setMessage(String.format("Successfully pulled %d notes and %d passwords", pulledNotes, pulledPasswords));
            
            log.info("Pulled {} notes and {} passwords from remote server", pulledNotes, pulledPasswords);
            return response;

        } catch (Exception e) {
            log.error("Error during pull synchronization", e);
            return SyncResponse.error("Pull sync failed: " + e.getMessage());
        }
    }

    @Async
    public CompletableFuture<SyncResponse> pushToRemoteAsync(SyncPushRequest request) {
        return CompletableFuture.completedFuture(pushToRemote(request));
    }

    @Async
    public CompletableFuture<SyncResponse> pullFromRemoteAsync() {
        return CompletableFuture.completedFuture(pullFromRemote());
    }

    private int pushNotesToRemote(boolean forceSync) {
        List<SecureNote> unsyncedNotes = noteService.getUnsyncedNotes();
        int count = 0;
        String remoteToken = userService.getRemoteToken();

        for (SecureNote note : unsyncedNotes) {
            try {
                WebClient webClient = webClientBuilder.baseUrl(remoteServerUrl).build();
                
                if (note.getRemoteId() == null) {
                    // Создаем новую заметку на удаленном сервере
                    NoteRequest request = new NoteRequest(
                        note.getEncryptedTitle(),
                        note.getEncryptedType(),
                        note.getEncryptedData()
                    );

                    RemoteNoteResponse remoteNote = webClient.post()
                            .uri("/api/notes")
                            .header("Authorization", "Bearer " + remoteToken)
                            .bodyValue(request)
                            .retrieve()
                            .bodyToMono(RemoteNoteResponse.class)
                            .timeout(Duration.ofMillis(timeout))
                            .block();

                    if (remoteNote != null) {
                        noteService.markAsSynced(note.getId(), remoteNote.getId());
                        count++;
                    }
                    
                } else {
                    // Обновляем существующую заметку на удаленном сервере
                    NoteRequest request = new NoteRequest(
                        note.getEncryptedTitle(),
                        note.getEncryptedType(),
                        note.getEncryptedData()
                    );

                    webClient.put()
                            .uri("/api/notes/" + note.getRemoteId())
                            .header("Authorization", "Bearer " + remoteToken)
                            .bodyValue(request)
                            .retrieve()
                            .bodyToMono(Void.class)
                            .timeout(Duration.ofMillis(timeout))
                            .block();

                    noteService.markAsSynced(note.getId(), note.getRemoteId());
                    count++;
                }

            } catch (Exception e) {
                log.error("Failed to sync note {}", note.getId(), e);
            }
        }

        return count;
    }

    private int pushPasswordsToRemote(boolean forceSync) {
        List<PasswordEntry> unsyncedPasswords = passwordService.getUnsyncedPasswords();
        int count = 0;
        String remoteToken = userService.getRemoteToken();

        for (PasswordEntry password : unsyncedPasswords) {
            try {
                WebClient webClient = webClientBuilder.baseUrl(remoteServerUrl).build();
                
                if (password.getRemoteId() == null) {
                    // Создаем новую запись пароля на удаленном сервере
                    PasswordRequest request = new PasswordRequest(
                        password.getEncryptedTitle(),
                        password.getEncryptedSite(),
                        password.getEncryptedLogin(),
                        password.getEncryptedPassword(),
                        password.getEncryptedType()
                    );

                    RemotePasswordResponse remotePassword = webClient.post()
                            .uri("/api/passwords")
                            .header("Authorization", "Bearer " + remoteToken)
                            .bodyValue(request)
                            .retrieve()
                            .bodyToMono(RemotePasswordResponse.class)
                            .timeout(Duration.ofMillis(timeout))
                            .block();

                    if (remotePassword != null) {
                        passwordService.markAsSynced(password.getId(), remotePassword.getId());
                        count++;
                    }
                    
                } else {
                    // Обновляем существующую запись на удаленном сервере
                    PasswordRequest request = new PasswordRequest(
                        password.getEncryptedTitle(),
                        password.getEncryptedSite(),
                        password.getEncryptedLogin(),
                        password.getEncryptedPassword(),
                        password.getEncryptedType()
                    );

                    webClient.put()
                            .uri("/api/passwords/" + password.getRemoteId())
                            .header("Authorization", "Bearer " + remoteToken)
                            .bodyValue(request)
                            .retrieve()
                            .bodyToMono(Void.class)
                            .timeout(Duration.ofMillis(timeout))
                            .block();

                    passwordService.markAsSynced(password.getId(), password.getRemoteId());
                    count++;
                }

            } catch (Exception e) {
                log.error("Failed to sync password {}", password.getId(), e);
            }
        }

        return count;
    }

    private int pullNotesFromRemote(ConflictResolutionStrategy conflictStrategy) {
        try {
            String remoteToken = userService.getRemoteToken();
            WebClient webClient = webClientBuilder.baseUrl(remoteServerUrl).build();

            List<RemoteNoteResponse> remoteNotes = webClient.get()
                    .uri("/api/notes")
                    .header("Authorization", "Bearer " + remoteToken)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<RemoteNoteResponse>>() {})
                    .timeout(Duration.ofMillis(timeout))
                    .block();

            if (remoteNotes == null) {
                return 0;
            }

            int pulledCount = 0;
            List<SecureNote> localNotes = noteService.getAllNotesForUser();

            for (RemoteNoteResponse remoteNote : remoteNotes) {
                Optional<SecureNote> existingLocal = localNotes.stream()
                        .filter(n -> remoteNote.getId().equals(n.getRemoteId()))
                        .findFirst();

                if (existingLocal.isPresent()) {
                    // Обработка конфликтов для существующих записей
                    SecureNote localNote = existingLocal.get();
                    if (shouldUpdateLocal(localNote, remoteNote, conflictStrategy)) {
                        updateLocalNoteFromRemote(localNote, remoteNote);
                        pulledCount++;
                    }
                } else {
                    // Создаем новую локальную запись из удаленной
                    noteService.createNoteFromRemote(
                        remoteNote.getEncryptedTitle(),
                        remoteNote.getEncryptedType(),
                        remoteNote.getEncryptedData(),
                        remoteNote.getId(),
                        remoteNote.getCreatedAt(),
                        remoteNote.getUpdatedAt()
                    );
                    pulledCount++;
                }
            }

            return pulledCount;
        } catch (Exception e) {
            log.error("Failed to pull notes from remote server", e);
            throw e;
        }
    }

    private int pullPasswordsFromRemote(ConflictResolutionStrategy conflictStrategy) {
        try {
            String remoteToken = userService.getRemoteToken();
            WebClient webClient = webClientBuilder.baseUrl(remoteServerUrl).build();

            List<RemotePasswordResponse> remotePasswords = webClient.get()
                    .uri("/api/passwords")
                    .header("Authorization", "Bearer " + remoteToken)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<RemotePasswordResponse>>() {})
                    .timeout(Duration.ofMillis(timeout))
                    .block();

            if (remotePasswords == null) {
                return 0;
            }

            int pulledCount = 0;
            List<PasswordEntry> localPasswords = passwordService.getAllPasswordsForUser();

            for (RemotePasswordResponse remotePassword : remotePasswords) {
                Optional<PasswordEntry> existingLocal = localPasswords.stream()
                        .filter(p -> remotePassword.getId().equals(p.getRemoteId()))
                        .findFirst();

                if (existingLocal.isPresent()) {
                    // Обработка конфликтов для существующих записей
                    PasswordEntry localPassword = existingLocal.get();
                    if (shouldUpdateLocal(localPassword, remotePassword, conflictStrategy)) {
                        updateLocalPasswordFromRemote(localPassword, remotePassword);
                        pulledCount++;
                    }
                } else {
                    // Создаем новую локальную запись из удаленной
                    passwordService.createPasswordFromRemote(
                        remotePassword.getEncryptedTitle(),
                        remotePassword.getEncryptedSite(),
                        remotePassword.getEncryptedLogin(),
                        remotePassword.getEncryptedPassword(),
                        remotePassword.getEncryptedType(),
                        remotePassword.getId(),
                        remotePassword.getCreatedAt(),
                        remotePassword.getUpdatedAt()
                    );
                    pulledCount++;
                }
            }

            return pulledCount;
        } catch (Exception e) {
            log.error("Failed to pull passwords from remote server", e);
            throw e;
        }
    }

    private boolean shouldUpdateLocal(SecureNote localNote, RemoteNoteResponse remoteNote, ConflictResolutionStrategy strategy) {
        return shouldUpdate(localNote.getUpdatedAt(), remoteNote.getUpdatedAt(), strategy);
    }

    private boolean shouldUpdateLocal(PasswordEntry localPassword, RemotePasswordResponse remotePassword, ConflictResolutionStrategy strategy) {
        return shouldUpdate(localPassword.getUpdatedAt(), remotePassword.getUpdatedAt(), strategy);
    }

    private boolean shouldUpdate(Instant localUpdatedAt, Instant remoteUpdatedAt, ConflictResolutionStrategy strategy) {
        return switch (strategy) {
            case LOCAL_WINS -> false; // Всегда сохраняем локальную версию
            case REMOTE_WINS -> true; // Всегда берем удаленную версию
            case LATEST_TIMESTAMP -> remoteUpdatedAt.isAfter(localUpdatedAt); // Берем более новую
            case CREATE_DUPLICATE -> true; // TODO: реализовать создание дубликатов
            case SKIP_CONFLICTS -> false; // Пропускаем конфликты
        };
    }

    private void updateLocalNoteFromRemote(SecureNote localNote, RemoteNoteResponse remoteNote) {
        localNote.setEncryptedTitle(remoteNote.getEncryptedTitle());
        localNote.setEncryptedType(remoteNote.getEncryptedType());
        localNote.setEncryptedData(remoteNote.getEncryptedData());
        localNote.setUpdatedAt(remoteNote.getUpdatedAt());
        localNote.setLastSyncAt(Instant.now());
        noteService.saveNote(localNote);
    }

    private void updateLocalPasswordFromRemote(PasswordEntry localPassword, RemotePasswordResponse remotePassword) {
        localPassword.setEncryptedTitle(remotePassword.getEncryptedTitle());
        localPassword.setEncryptedSite(remotePassword.getEncryptedSite());
        localPassword.setEncryptedLogin(remotePassword.getEncryptedLogin());
        localPassword.setEncryptedPassword(remotePassword.getEncryptedPassword());
        localPassword.setEncryptedType(remotePassword.getEncryptedType());
        localPassword.setUpdatedAt(remotePassword.getUpdatedAt());
        localPassword.setLastSyncAt(Instant.now());
        passwordService.savePassword(localPassword);
    }

    public boolean checkRemoteConnection() {
        if (!remoteEnabled) {
            return false;
        }

        try {
            WebClient webClient = webClientBuilder.baseUrl(remoteServerUrl).build();
            
            webClient.get()
                    .uri("/actuator/health")
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofMillis(timeout))
                    .block();
            
            return true;
        } catch (WebClientResponseException e) {
            log.warn("Remote server not available: {} {}", e.getStatusCode(), e.getMessage());
            return false;
        } catch (Exception e) {
            log.warn("Failed to connect to remote server", e);
            return false;
        }
    }
} 
                        note.getEncryptedType(),
                        note.getEncryptedData()
                    );

                    webClient.put()
                            .uri("/api/notes/" + note.getRemoteId())
                            .header("Authorization", "Bearer " + remoteToken)
                            .bodyValue(request)
                            .retrieve()
                            .bodyToMono(Void.class)
                            .timeout(Duration.ofMillis(timeout))
                            .block();

                    noteService.markAsSynced(note.getId(), note.getRemoteId());
                    count++;
                }

            } catch (Exception e) {
                log.error("Failed to sync note {}", note.getId(), e);
            }
        }

        return count;
    }

    private int pushPasswordsToRemote(boolean forceSync) {
        List<PasswordEntry> unsyncedPasswords = passwordService.getUnsyncedPasswords();
        int count = 0;
        String remoteToken = userService.getRemoteToken();

        for (PasswordEntry password : unsyncedPasswords) {
            try {
                WebClient webClient = webClientBuilder.baseUrl(remoteServerUrl).build();
                
                if (password.getRemoteId() == null) {
                    // Создаем новую запись пароля на удаленном сервере
                    PasswordRequest request = new PasswordRequest(
                        password.getEncryptedTitle(),
                        password.getEncryptedSite(),
                        password.getEncryptedLogin(),
                        password.getEncryptedPassword(),
                        password.getEncryptedType()
                    );

                    RemotePasswordResponse remotePassword = webClient.post()
                            .uri("/api/passwords")
                            .header("Authorization", "Bearer " + remoteToken)
                            .bodyValue(request)
                            .retrieve()
                            .bodyToMono(RemotePasswordResponse.class)
                            .timeout(Duration.ofMillis(timeout))
                            .block();

                    if (remotePassword != null) {
                        passwordService.markAsSynced(password.getId(), remotePassword.getId());
                        count++;
                    }
                    
                } else {
                    // Обновляем существующую запись на удаленном сервере
                    PasswordRequest request = new PasswordRequest(
                        password.getEncryptedTitle(),
                        password.getEncryptedSite(),
                        password.getEncryptedLogin(),
                        password.getEncryptedPassword(),
                        password.getEncryptedType()
                    );

                    webClient.put()
                            .uri("/api/passwords/" + password.getRemoteId())
                            .header("Authorization", "Bearer " + remoteToken)
                            .bodyValue(request)
                            .retrieve()
                            .bodyToMono(Void.class)
                            .timeout(Duration.ofMillis(timeout))
                            .block();

                    passwordService.markAsSynced(password.getId(), password.getRemoteId());
                    count++;
                }

            } catch (Exception e) {
                log.error("Failed to sync password {}", password.getId(), e);
            }
        }

        return count;
    }

    private int pullNotesFromRemote(ConflictResolutionStrategy conflictStrategy) {
        try {
            String remoteToken = userService.getRemoteToken();
            WebClient webClient = webClientBuilder.baseUrl(remoteServerUrl).build();

            List<RemoteNoteResponse> remoteNotes = webClient.get()
                    .uri("/api/notes")
                    .header("Authorization", "Bearer " + remoteToken)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<RemoteNoteResponse>>() {})
                    .timeout(Duration.ofMillis(timeout))
                    .block();

            if (remoteNotes == null) {
                return 0;
            }

            int pulledCount = 0;
            List<SecureNote> localNotes = noteService.getAllNotesForUser();

            for (RemoteNoteResponse remoteNote : remoteNotes) {
                Optional<SecureNote> existingLocal = localNotes.stream()
                        .filter(n -> remoteNote.getId().equals(n.getRemoteId()))
                        .findFirst();

                if (existingLocal.isPresent()) {
                    // Обработка конфликтов для существующих записей
                    SecureNote localNote = existingLocal.get();
                    if (shouldUpdateLocal(localNote, remoteNote, conflictStrategy)) {
                        updateLocalNoteFromRemote(localNote, remoteNote);
                        pulledCount++;
                    }
                } else {
                    // Создаем новую локальную запись из удаленной
                    noteService.createNoteFromRemote(
                        remoteNote.getEncryptedTitle(),
                        remoteNote.getEncryptedType(),
                        remoteNote.getEncryptedData(),
                        remoteNote.getId(),
                        remoteNote.getCreatedAt(),
                        remoteNote.getUpdatedAt()
                    );
                    pulledCount++;
                }
            }

            return pulledCount;
        } catch (Exception e) {
            log.error("Failed to pull notes from remote server", e);
            throw e;
        }
    }

    private int pullPasswordsFromRemote(ConflictResolutionStrategy conflictStrategy) {
        try {
            String remoteToken = userService.getRemoteToken();
            WebClient webClient = webClientBuilder.baseUrl(remoteServerUrl).build();

            List<RemotePasswordResponse> remotePasswords = webClient.get()
                    .uri("/api/passwords")
                    .header("Authorization", "Bearer " + remoteToken)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<RemotePasswordResponse>>() {})
                    .timeout(Duration.ofMillis(timeout))
                    .block();

            if (remotePasswords == null) {
                return 0;
            }

            int pulledCount = 0;
            List<PasswordEntry> localPasswords = passwordService.getAllPasswordsForUser();

            for (RemotePasswordResponse remotePassword : remotePasswords) {
                Optional<PasswordEntry> existingLocal = localPasswords.stream()
                        .filter(p -> remotePassword.getId().equals(p.getRemoteId()))
                        .findFirst();

                if (existingLocal.isPresent()) {
                    // Обработка конфликтов для существующих записей
                    PasswordEntry localPassword = existingLocal.get();
                    if (shouldUpdateLocal(localPassword, remotePassword, conflictStrategy)) {
                        updateLocalPasswordFromRemote(localPassword, remotePassword);
                        pulledCount++;
                    }
                } else {
                    // Создаем новую локальную запись из удаленной
                    passwordService.createPasswordFromRemote(
                        remotePassword.getEncryptedTitle(),
                        remotePassword.getEncryptedSite(),
                        remotePassword.getEncryptedLogin(),
                        remotePassword.getEncryptedPassword(),
                        remotePassword.getEncryptedType(),
                        remotePassword.getId(),
                        remotePassword.getCreatedAt(),
                        remotePassword.getUpdatedAt()
                    );
                    pulledCount++;
                }
            }

            return pulledCount;
        } catch (Exception e) {
            log.error("Failed to pull passwords from remote server", e);
            throw e;
        }
    }

    private boolean shouldUpdateLocal(SecureNote localNote, RemoteNoteResponse remoteNote, ConflictResolutionStrategy strategy) {
        return shouldUpdate(localNote.getUpdatedAt(), remoteNote.getUpdatedAt(), strategy);
    }

    private boolean shouldUpdateLocal(PasswordEntry localPassword, RemotePasswordResponse remotePassword, ConflictResolutionStrategy strategy) {
        return shouldUpdate(localPassword.getUpdatedAt(), remotePassword.getUpdatedAt(), strategy);
    }

    private boolean shouldUpdate(Instant localUpdatedAt, Instant remoteUpdatedAt, ConflictResolutionStrategy strategy) {
        return switch (strategy) {
            case LOCAL_WINS -> false; // Всегда сохраняем локальную версию
            case REMOTE_WINS -> true; // Всегда берем удаленную версию
            case LATEST_TIMESTAMP -> remoteUpdatedAt.isAfter(localUpdatedAt); // Берем более новую
            case CREATE_DUPLICATE -> true; // TODO: реализовать создание дубликатов
            case SKIP_CONFLICTS -> false; // Пропускаем конфликты
        };
    }

    private void updateLocalNoteFromRemote(SecureNote localNote, RemoteNoteResponse remoteNote) {
        localNote.setEncryptedTitle(remoteNote.getEncryptedTitle());
        localNote.setEncryptedType(remoteNote.getEncryptedType());
        localNote.setEncryptedData(remoteNote.getEncryptedData());
        localNote.setUpdatedAt(remoteNote.getUpdatedAt());
        localNote.setLastSyncAt(Instant.now());
        noteService.saveNote(localNote);
    }

    private void updateLocalPasswordFromRemote(PasswordEntry localPassword, RemotePasswordResponse remotePassword) {
        localPassword.setEncryptedTitle(remotePassword.getEncryptedTitle());
        localPassword.setEncryptedSite(remotePassword.getEncryptedSite());
        localPassword.setEncryptedLogin(remotePassword.getEncryptedLogin());
        localPassword.setEncryptedPassword(remotePassword.getEncryptedPassword());
        localPassword.setEncryptedType(remotePassword.getEncryptedType());
        localPassword.setUpdatedAt(remotePassword.getUpdatedAt());
        localPassword.setLastSyncAt(Instant.now());
        passwordService.savePassword(localPassword);
    }

    public boolean checkRemoteConnection() {
        if (!remoteEnabled) {
            return false;
        }

        try {
            WebClient webClient = webClientBuilder.baseUrl(remoteServerUrl).build();
            
            webClient.get()
                    .uri("/actuator/health")
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(Duration.ofMillis(timeout))
                    .block();
            
            return true;
        } catch (WebClientResponseException e) {
            log.warn("Remote server not available: {} {}", e.getStatusCode(), e.getMessage());
            return false;
        } catch (Exception e) {
            log.warn("Failed to connect to remote server", e);
            return false;
        }
    }
} 