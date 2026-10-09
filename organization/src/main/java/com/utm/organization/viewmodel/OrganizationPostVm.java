package com.utm.organization.viewmodel;

import com.utm.organization.model.enumeration.OrganizationType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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

        @Schema(description = "Business registration number / license code", example = "VN-BIZ-0109988776")
        @NotBlank(message = "Registration number is required")
        @Size(max = 100, message = "Registration number must not exceed 100 characters")
        String registrationNumber,

        @Schema(description = "Contact details such as email, phone, physical address", example = "contact@droneexpress.vn | +84-28-3822-9999")
        String contactInfo
) {
}
