package com.utm.user.viewmodel;

import jakarta.validation.constraints.Email;

public record UserPutVm(
    @Email(message = "Email format is invalid")
    String email,

    String firstName,
    String lastName,
    String password,
    Boolean isActive
) {
}
