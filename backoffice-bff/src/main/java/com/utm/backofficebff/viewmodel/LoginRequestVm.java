package com.utm.backofficebff.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "User login credentials")
public record LoginRequestVm(
        @Schema(description = "Account username or email", example = "admin")
        @NotBlank(message = "Username cannot be blank")
        String username,

        @Schema(description = "Account password", example = "admin")
        @NotBlank(message = "Password cannot be blank")
        String password
) {
}

