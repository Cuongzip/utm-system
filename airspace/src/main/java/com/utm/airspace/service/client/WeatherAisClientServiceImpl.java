package com.utm.airspace.service.client;

import com.utm.airspace.config.ServiceUrlConfig;
import com.utm.airspace.viewmodel.client.OpenaipFeedClientVm;
import com.utm.airspace.viewmodel.client.OpenaipFeedClientVm.OpenaipAirspaceItemVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeatherAisClientServiceImpl implements WeatherAisClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public List<OpenaipAirspaceItemVm> getOpenaipAirspaces() {
        try {
            OpenaipFeedClientVm feed = restClient.get()
                    .uri(serviceUrlConfig.getWeatherAisUrl() + "/api/v1/openaip/airspaces")
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    })
                    .body(OpenaipFeedClientVm.class);
            if (feed == null || feed.airspaces() == null) {
                return List.of();
            }
            return feed.airspaces();
        } catch (Exception ex) {
            log.debug("OpenAIP feed unavailable from weather-ais, falling back to local zones only: {}", ex.getMessage());
            return List.of();
        }
    }
}
