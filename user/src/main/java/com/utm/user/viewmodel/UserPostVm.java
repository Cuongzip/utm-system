package com.utm.user.viewmodel;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UserPostVm(
    @NotBlank(message = "Username must not be blank")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    String username,

    @NotBlank(message = "Email must not be blank")
    @Email(message = "Email format is invalid")
    String email,

    String firstName,
    String lastName,
    String password
) {
}
