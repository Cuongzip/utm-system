package com.utm.mission.service.client;

import com.utm.mission.config.ServiceUrlConfig;
import com.utm.mission.viewmodel.client.FlightBriefVm;
import com.utm.mission.viewmodel.client.FlightCreateRequestVm;
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
public class FlightClientServiceImpl implements FlightClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public Optional<FlightBriefVm> createFlight(FlightCreateRequestVm requestVm) {
        String flightUrl = serviceUrlConfig.getFlightUrl();
        try {
            FlightBriefVm createdFlight = restClient.post()
                    .uri(flightUrl + "/api/v1/flights")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestVm)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, resp) ->
                            log.error("Flight service returned error code {} when creating flight", resp.getStatusCode()))
                    .body(FlightBriefVm.class);

            return Optional.ofNullable(createdFlight);
        } catch (Exception e) {
            log.error("Failed to call Flight service to create flight plan at {}: {}", flightUrl, e.getMessage());
            return Optional.empty();
        }
    }
}
