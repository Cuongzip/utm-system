package com.utm.organization.viewmodel.organization;

import com.utm.organization.model.enumeration.OrganizationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

import java.util.Map;

@Schema(description = "Request payload for updating an existing Organization")
public record OrganizationPutVm(
        @Size(max = 255, message = "Organization name must not exceed 255 characters")
        String name,
        String contactInfo,
        Map<String, Object> address,
        Map<String, Object> authorizedAirspace,
        Map<String, Object> certifications,
        Map<String, Object> insuranceInfo,
        OrganizationStatus status
) {
    public OrganizationPutVm(
            String name,
            String contactInfo,
            OrganizationStatus status
    ) {
        this(name, contactInfo, null, null, null, null, status);
    }
}
