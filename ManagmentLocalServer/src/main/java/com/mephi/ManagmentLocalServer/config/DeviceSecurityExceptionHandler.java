package com.mephi.ManagmentLocalServer.config;

import com.mephi.ManagmentLocalServer.exception.DeviceSecurityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class DeviceSecurityExceptionHandler {

    @ExceptionHandler(DeviceSecurityViolationException.class)
    public ResponseEntity<Map<String, String>> handle(DeviceSecurityViolationException ex) {
        return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                        "error", "ANTIVIRUS_DISABLED",
                        "code", ex.getCode() != null ? ex.getCode() : "POLICY",
                        "reason", ex.getMessage() != null ? ex.getMessage() : ""
                ));
    }
}
