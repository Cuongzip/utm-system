package com.utm.organization.viewmodel.organization;

import com.utm.organization.model.enumeration.OrganizationStatus;
import com.utm.organization.model.enumeration.OrganizationType;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.Map;

@Schema(description = "Detailed profile and operational data of an Organization")
public record OrganizationVm(
        String id,
        String name,
        OrganizationType type,
        String registrationNumber,
        String contactInfo,
        Map<String, Object> address,
        Map<String, Object> authorizedAirspace,
        Map<String, Object> certifications,
        Map<String, Object> insuranceInfo,
        OrganizationStatus status,
        ZonedDateTime createdOn,
        String createdBy,
        ZonedDateTime lastModifiedOn,
        String lastModifiedBy
) {
    public OrganizationVm(
            String id,
            String name,
            OrganizationType type,
            String registrationNumber,
            String contactInfo,
            OrganizationStatus status,
            ZonedDateTime createdOn,
            String createdBy,
            ZonedDateTime lastModifiedOn,
            String lastModifiedBy
    ) {
        this(id, name, type, registrationNumber, contactInfo, null, null, null, null,
                status, createdOn, createdBy, lastModifiedOn, lastModifiedBy);
    }
}
