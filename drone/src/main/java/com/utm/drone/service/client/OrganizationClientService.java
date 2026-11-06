package com.utm.drone.service.client;

import com.utm.drone.viewmodel.client.OrganizationBriefVm;

import java.util.Optional;

public interface OrganizationClientService {

    boolean checkOrganizationExists(String organizationId);

    Optional<OrganizationBriefVm> getOrganizationById(String organizationId);
}
