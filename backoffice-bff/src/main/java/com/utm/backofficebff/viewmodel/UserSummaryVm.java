package com.utm.backofficebff.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "Authenticated user profile summary")
public record UserSummaryVm(
        @Schema(description = "User unique identifier (UUID)", example = "6a4ccf58-14a7-4c68-8f35-9107f98755b2")
        String id,

        @Schema(description = "Username", example = "admin")
        String username,

        @Schema(description = "Email address", example = "admin@utm.com")
        String email,

        @Schema(description = "First name", example = "Admin")
        String firstName,

        @Schema(description = "Last name", example = "UTM")
        String lastName,

        @Schema(description = "List of assigned realm roles", example = "[\"ADMIN\", \"default-roles-utm\"]")
        List<String> roles
) {
}

