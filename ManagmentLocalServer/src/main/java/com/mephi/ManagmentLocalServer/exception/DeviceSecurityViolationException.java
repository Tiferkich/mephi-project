package com.mephi.ManagmentLocalServer.exception;

import lombok.Getter;

@Getter
public class DeviceSecurityViolationException extends RuntimeException {
    private final String code;

    public DeviceSecurityViolationException(String code, String message) {
        super(message);
        this.code = code;
    }
}
