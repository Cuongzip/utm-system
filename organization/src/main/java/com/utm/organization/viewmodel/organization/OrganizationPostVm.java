package com.utm.organization.viewmodel.organization;

import com.utm.organization.model.enumeration.OrganizationType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Map;

@Schema(description = "Request payload for registering a new Organization")
public record OrganizationPostVm(
        @NotBlank(message = "Organization name is required")
        @Size(max = 255, message = "Organization name must not exceed 255 characters")
        String name,

        @NotNull(message = "Organization type is required")
        OrganizationType type,

        @Size(min = 3, max = 100, message = "Registration number must be between 3 and 100 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Registration number must contain only alphanumeric characters, dashes, and underscores")
        String registrationNumber,

        String contactInfo,
        Map<String, Object> address,
        Map<String, Object> authorizedAirspace,
        Map<String, Object> certifications,
        Map<String, Object> insuranceInfo
) {
    public OrganizationPostVm(
            String name,
            OrganizationType type,
            String registrationNumber,
            String contactInfo
    ) {
        this(name, type, registrationNumber, contactInfo, null, null, null, null);
    }
}
