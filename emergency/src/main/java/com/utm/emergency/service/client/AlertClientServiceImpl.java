package com.utm.emergency.service.client;

import com.utm.emergency.config.ServiceUrlConfig;
import com.utm.emergency.viewmodel.client.AlertPostVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertClientServiceImpl implements AlertClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public void publishAlert(AlertPostVm alertPostVm) {
        try {
            var url = serviceUrlConfig.getAlertUrl() + "/api/v1/alerts";
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

    @Override
    public void resolveAlertsByIncident(String incidentId, String resolutionNotes) {
        if (incidentId == null || incidentId.isBlank()) {
            return;
        }
        try {
            var url = serviceUrlConfig.getAlertUrl() + "/api/v1/alerts/resolve-by-incident/" + incidentId.trim();
            restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("resolutionNotes",
                            resolutionNotes != null && !resolutionNotes.isBlank()
                                    ? resolutionNotes
                                    : "Linked emergency incident resolved"))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception e) {
            log.warn("Failed to auto-resolve alerts for emergency incident {}: {}", incidentId, e.getMessage());
        }
    }
}
