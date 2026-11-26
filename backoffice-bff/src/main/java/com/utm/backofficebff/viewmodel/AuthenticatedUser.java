package com.utm.backofficebff.viewmodel;

import java.util.List;

public record AuthenticatedUser(
        String username,
        String email,
        String fullName,
        List<String> roles,
        String orgId
) {
    public static AuthenticatedUser anonymous() {
        return new AuthenticatedUser("anonymous", null, null, List.of(), null);
    }
}
