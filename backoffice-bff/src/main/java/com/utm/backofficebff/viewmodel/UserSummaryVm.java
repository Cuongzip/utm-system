package com.utm.backofficebff.viewmodel;

import java.util.List;

public record UserSummaryVm(
        String id,
        String username,
        String email,
        String firstName,
        String lastName,
        List<String> roles
) {
}
