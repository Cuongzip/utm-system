package com.utm.mission.service;

import com.utm.mission.config.ServiceUrlConfig;
import com.utm.mission.viewmodel.FlightBriefVm;
import com.utm.mission.viewmodel.FlightCreateRequestVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class FlightClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    public Optional<FlightBriefVm> createFlight(FlightCreateRequestVm requestVm) {
        try {
            String baseUrl = serviceUrlConfig.flight() != null ? serviceUrlConfig.flight() : "http://flight:8086";
            String url = baseUrl + "/flight/api/v1/flights";

            FlightBriefVm createdFlight = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestVm)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, resp) -> {
                        log.error("Flight service returned error code {} when creating flight", resp.getStatusCode());
                    })
                    .body(FlightBriefVm.class);

            return Optional.ofNullable(createdFlight);
        } catch (Exception e) {
            log.error("Failed to call Flight service to create flight plan. Error: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
