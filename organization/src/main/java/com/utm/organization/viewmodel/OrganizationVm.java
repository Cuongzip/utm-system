package com.utm.organization.viewmodel;

import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;

@Schema(description = "Detailed profile and operational data of an Organization")
public record OrganizationVm(
        @Schema(description = "Unique UUID identifier of the organization", example = "3fa85f64-5717-4562-b3fc-2c963f66afa6")
        String id,

        @Schema(description = "Legal / operational organization name", example = "Drone Express Vietnam JSC")
        String name,

        @Schema(description = "Organization category / type", example = "operator")
        String type,

        @Schema(description = "Business registration number / license code", example = "VN-BIZ-0109988776")
        String registrationNumber,

        @Schema(description = "Contact details such as email, phone, physical address", example = "contact@droneexpress.vn | +84-28-3822-9999")
        String contactInfo,

        @Schema(description = "Operational status", example = "active")
        String status,

        @Schema(description = "Record creation timestamp", example = "2026-09-28T10:00:00Z")
        ZonedDateTime createdOn,

        @Schema(description = "Identity that created this organization record", example = "admin-user-01")
        String createdBy,

        @Schema(description = "Last modification timestamp", example = "2026-09-28T10:30:00Z")
        ZonedDateTime lastModifiedOn,

        @Schema(description = "Identity that last modified this organization record", example = "admin-user-01")
        String lastModifiedBy
) {
}
