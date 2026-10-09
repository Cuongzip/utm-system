package com.utm.organization.service;

import com.utm.organization.model.enumeration.OrganizationStatus;
import com.utm.organization.model.enumeration.OrganizationType;
import com.utm.organization.viewmodel.OrganizationListGetVm;
import com.utm.organization.viewmodel.OrganizationPostVm;
import com.utm.organization.viewmodel.OrganizationPutVm;
import com.utm.organization.viewmodel.OrganizationVm;

public interface OrganizationService {

    OrganizationListGetVm getOrganizations(
            String search,
            OrganizationType type,
            OrganizationStatus status,
            int limit,
            int offset
    );

    OrganizationVm getOrganizationById(String id);

    OrganizationVm createOrganization(OrganizationPostVm organizationPostVm);

    OrganizationVm updateOrganization(String id, OrganizationPutVm organizationPutVm);

    void deleteOrganization(String id);
}
