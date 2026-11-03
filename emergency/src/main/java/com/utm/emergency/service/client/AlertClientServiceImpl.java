package com.utm.emergency.service.client;

import com.utm.emergency.config.ServiceUrlConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertClientServiceImpl implements AlertClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public void publishAlert(AlertPostVm alertPostVm) {
        try {
            var url = (serviceUrlConfig.alert() != null ? serviceUrlConfig.alert() : "http://alert:8093") + "/alert/api/v1/alerts";
            restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(alertPostVm)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Failed to notify Alert Service of emergency alert: {}", e.getMessage());
        }
    }
}