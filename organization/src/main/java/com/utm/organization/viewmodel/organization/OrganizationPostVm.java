package com.utm.organization.viewmodel.organization;

import com.utm.organization.model.enumeration.OrganizationType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Request payload for registering a new Organization")
public record OrganizationPostVm(
        @Schema(description = "Legal / operational organization name", example = "Drone Express Vietnam JSC")
        @NotBlank(message = "Organization name is required")
        @Size(max = 255, message = "Organization name must not exceed 255 characters")
        String name,

        @Schema(description = "Organization category / type", example = "operator")
        @NotNull(message = "Organization type is required")
        OrganizationType type,

        @Schema(description = "Business registration number / license code. If omitted or blank, a unique code will be auto-generated (e.g. ORG-YYYY-XXXX).", example = "VN-BIZ-0109988776")
        @Size(min = 3, max = 100, message = "Registration number must be between 3 and 100 characters")
        @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Registration number must contain only alphanumeric characters, dashes, and underscores")
        String registrationNumber,

        @Schema(description = "Contact details such as email, phone, physical address", example = "contact@droneexpress.vn | +84-28-3822-9999")
        String contactInfo
) {
}

