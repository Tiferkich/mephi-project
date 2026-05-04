package com.mephi.ManagmentLocalServer.dto.auth;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DeleteAccountRequest {

    @NotBlank(message = "Требуется хеш мастер-пароля")
    private String passwordHash;

    private String securityCheckId;
}
