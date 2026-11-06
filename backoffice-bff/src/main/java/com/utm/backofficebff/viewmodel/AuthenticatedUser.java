package com.utm.backofficebff.viewmodel;

import java.util.List;

public record AuthenticatedUser(
        String username,
        String email,
        String fullName,
        List<String> roles
) {
    public static AuthenticatedUser anonymous() {
        return new AuthenticatedUser("anonymous", null, null, List.of());
    }
}
