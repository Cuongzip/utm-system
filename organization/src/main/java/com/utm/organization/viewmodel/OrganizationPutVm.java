package com.utm.organization.viewmodel;

import com.utm.organization.model.enumeration.OrganizationStatus;
import com.utm.organization.model.enumeration.OrganizationType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

@Schema(description = "Request payload for updating an existing Organization")
public record OrganizationPutVm(
        @Schema(description = "Legal / operational organization name", example = "Drone Express Global JSC")
        @Size(max = 255, message = "Organization name must not exceed 255 characters")
        String name,

        @Schema(description = "Organization category / type", example = "operator")
        OrganizationType type,

        @Schema(description = "Contact details such as email, phone, physical address", example = "support@droneexpress.vn | +84-28-3822-0000")
        String contactInfo,

        @Schema(description = "Operational status of the organization", example = "active")
        OrganizationStatus status
) {
}
