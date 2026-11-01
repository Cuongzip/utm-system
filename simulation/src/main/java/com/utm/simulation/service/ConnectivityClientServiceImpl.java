package com.utm.simulation.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.simulation.config.ServiceUrlConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConnectivityClientServiceImpl implements ConnectivityClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public boolean sendHeartbeat(String deviceId) {
        if (deviceId == null || deviceId.isBlank()) {
            return false;
        }

        if (serviceUrlConfig.connectivity() == null || serviceUrlConfig.connectivity().url() == null
                || serviceUrlConfig.connectivity().url().isBlank()) {
            log.warn("Connectivity service URL is not configured");
            return false;
        }

        String baseUrl = serviceUrlConfig.connectivity().url().replaceAll("/+$", "");
        String basePath = baseUrl.endsWith("/connectivity") ? "" : "/connectivity";
        String endpoint = baseUrl + basePath + "/api/v1/connectivity/devices/" + deviceId.trim() + "/heartbeat";

        try {
            var response = restClient.post()
                    .uri(endpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{}")
                    .retrieve()
                    .toBodilessEntity();

            return response.getStatusCode().is2xxSuccessful();
        } catch (HttpClientErrorException.NotFound ex) {
            log.warn("Device registration not found in connectivity service: {}", deviceId);
            throw new NotFoundException(MessageCode.DEVICE_REGISTRATION_NOT_FOUND, deviceId);
        } catch (Exception ex) {
            log.warn("Failed to send heartbeat to connectivity service for device '{}': {}", deviceId, ex.getMessage());
            return false;
        }
    }
}

