package com.utm.drone.service;

import com.utm.drone.config.ServiceUrlConfig;
import com.utm.drone.viewmodel.OrganizationBriefVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrganizationClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    public boolean checkOrganizationExists(String organizationId) {
        if (organizationId == null || organizationId.isBlank()) {
            return true;
        }

        String orgUrl = serviceUrlConfig.organization();
        if (orgUrl == null || orgUrl.isBlank()) {
            orgUrl = "http://organization:8083";
        }
        String basePath = orgUrl.endsWith("/organization") ? "" : "/organization";
        try {
            return Boolean.TRUE.equals(restClient.get()
                    .uri(orgUrl + basePath + "/api/v1/organizations/{id}", organizationId.trim())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) ->
                            log.warn("Organization {} check returned {}", organizationId, res.getStatusCode()))
                    .toBodilessEntity()
                    .getStatusCode()
                    .is2xxSuccessful());
        } catch (Exception e) {
            log.error("Failed to verify organization ID {} at url {}: {}", organizationId, orgUrl, e.getMessage());
            return false;
        }
    }

    public Optional<OrganizationBriefVm> getOrganizationById(String organizationId) {
        if (organizationId == null || organizationId.isBlank()) {
            return Optional.empty();
        }

        String orgUrl = serviceUrlConfig.organization();
        if (orgUrl == null || orgUrl.isBlank()) {
            orgUrl = "http://organization:8083";
        }
        String basePath = orgUrl.endsWith("/organization") ? "" : "/organization";
        try {
            OrganizationBriefVm org = restClient.get()
                    .uri(orgUrl + basePath + "/api/v1/organizations/{id}", organizationId.trim())
                    .retrieve()
                    .body(OrganizationBriefVm.class);
            return Optional.ofNullable(org);
        } catch (Exception e) {
            log.warn("Failed to fetch organization ID {} at url {}: {}", organizationId, orgUrl, e.getMessage());
            return Optional.empty();
        }
    }
}
