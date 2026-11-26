package com.utm.flight.service.client;

import com.utm.flight.config.ServiceUrlConfig;
import com.utm.flight.viewmodel.client.WeatherGoNoGoClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeatherAisClientServiceImpl implements WeatherAisClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public Optional<WeatherGoNoGoClientVm> getWeatherGoNoGo(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return Optional.empty();
        }
        try {
            WeatherGoNoGoClientVm resp = restClient.get()
                    .uri(serviceUrlConfig.getWeatherAisUrl() + "/api/v1/weather/go-no-go/{hubId}", hubId.trim())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    })
                    .body(WeatherGoNoGoClientVm.class);
            return (resp != null && resp.verdict() != null) ? Optional.of(resp) : Optional.empty();
        } catch (Exception ex) {
            log.debug("Weather Go/No-Go unavailable for hub {}: {}", hubId, ex.getMessage());
            return Optional.empty();
        }
    }
}
