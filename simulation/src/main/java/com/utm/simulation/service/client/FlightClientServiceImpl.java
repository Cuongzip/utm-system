package com.utm.simulation.service.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.utils.ClientUrlUtils;
import com.utm.simulation.config.ServiceUrlConfig;
import com.utm.simulation.viewmodel.client.FlightDetailVm;
import com.utm.simulation.viewmodel.client.WaypointVm;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@Slf4j
public class FlightClientServiceImpl implements FlightClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;
    private final ObjectMapper objectMapper;

    public FlightClientServiceImpl(RestClient restClient, ServiceUrlConfig serviceUrlConfig) {
        this(restClient, serviceUrlConfig, new ObjectMapper());
    }

    @org.springframework.beans.factory.annotation.Autowired
    public FlightClientServiceImpl(RestClient restClient, ServiceUrlConfig serviceUrlConfig, ObjectMapper objectMapper) {
        this.restClient = restClient;
        this.serviceUrlConfig = serviceUrlConfig;
        this.objectMapper = objectMapper != null ? objectMapper : new ObjectMapper();
    }

    @Override
    public FlightDetailVm getFlightDetail(String flightId) {
        if (flightId == null || flightId.isBlank()) {
            return null;
        }

        if (serviceUrlConfig.flight() == null || serviceUrlConfig.flight().url() == null
                || serviceUrlConfig.flight().url().isBlank()) {
            log.warn("Flight service URL is not configured");
            return null;
        }

        String baseUrl = ClientUrlUtils.normalizeBaseUrl(serviceUrlConfig.flight().url(), "http://flight:8086", "flight");
        String endpoint = baseUrl + "/api/v1/flights/" + flightId.trim();

        try {
            return restClient.get()
                    .uri(endpoint)
                    .retrieve()
                    .body(FlightDetailVm.class);
        } catch (Exception ex) {
            log.warn("Could not retrieve flight details for flight ID '{}' from flight service: {}", flightId,
                    ex.getMessage());
            return null;
        }
    }

    @Override
    public List<WaypointVm> getFlightWaypoints(String flightId) {
        FlightDetailVm detail = getFlightDetail(flightId);
        if (detail == null) {
            return Collections.emptyList();
        }
        if (detail.plannedRoute() != null && detail.plannedRoute().coordinates() != null) {
            double defaultAlt = detail.cruisingAltitudeM() != null ? detail.cruisingAltitudeM() : 50.0;
            return detail.plannedRoute().coordinates().stream()
                    .filter(c -> c != null && c.size() >= 2)
                    .map(c -> new WaypointVm(
                            c.get(1), // latitude
                            c.get(0), // longitude
                            c.size() > 2 && c.get(2) != null ? c.get(2) : defaultAlt
                    ))
                    .toList();
        }
        if (detail.waypoints() != null) {
            return detail.waypoints();
        }
        return Collections.emptyList();
    }

    @Override
    public boolean startFlight(String flightId) {
        if (flightId == null || flightId.isBlank() || !isFlightUrlConfigured()) {
            return false;
        }
        String endpoint = buildBaseUrl() + "/api/v1/flights/" + flightId.trim() + "/start";
        try {
            restClient.post().uri(endpoint).retrieve().toBodilessEntity();
            log.info("Synchronized flight '{}' -> ACTIVE from simulation start", flightId);
            return true;
        } catch (RestClientResponseException ex) {
            if (ex.getStatusCode().is4xxClientError() && isInvalidFlightStateError(ex)) {
                log.info("Flight '{}' already transitioned state during startFlight race (INVALID_FLIGHT_STATE); continuing",
                        flightId);
                return false;
            }
            log.warn("Flight service rejected startFlight for '{}': HTTP {} {}",
                    flightId, ex.getStatusCode().value(), ex.getResponseBodyAsString());
            if (ex.getStatusCode().is4xxClientError()) {
                rethrowUpstreamBadRequest(ex);
            }
            return false;
        } catch (Exception ex) {
            log.warn("Could not start flight '{}' from simulation: {}", flightId, ex.getMessage());
            return false;
        }
    }

    private boolean isInvalidFlightStateError(RestClientResponseException ex) {
        String rawBody = ex.getResponseBodyAsString();
        if (rawBody == null || rawBody.isBlank() || objectMapper == null) {
            return false;
        }
        try {
            JsonNode root = objectMapper.readTree(rawBody);
            JsonNode codeNode = root.get("errorCode");
            return codeNode != null && codeNode.isTextual()
                    && "INVALID_FLIGHT_STATE".equalsIgnoreCase(codeNode.asText().trim());
        } catch (Exception ignored) {
            return false;
        }
    }

    private void rethrowUpstreamBadRequest(RestClientResponseException ex) {
        String rawBody = ex.getResponseBodyAsString();
        if (rawBody == null || rawBody.isBlank() || objectMapper == null) {
            return;
        }
        try {
            JsonNode root = objectMapper.readTree(rawBody);
            JsonNode codeNode = root.get("errorCode");
            if (codeNode != null && codeNode.isTextual() && !codeNode.asText().isBlank()) {
                Map<String, Object> paramsMap = new java.util.LinkedHashMap<>();
                JsonNode paramsNode = root.get("params");
                if (paramsNode != null && paramsNode.isObject()) {
                    paramsNode.properties().forEach(entry -> paramsMap.put(
                            entry.getKey(),
                            entry.getValue().isValueNode() ? entry.getValue().asText() : entry.getValue().toString()));
                }
                throw new BadRequestException(codeNode.asText(), paramsMap);
            }
        } catch (BadRequestException bre) {
            throw bre;
        } catch (Exception ignored) {
        }
    }

    @Override
    public boolean completeFlight(String flightId) {
        return completeFlight(flightId, null);
    }

    @Override
    public boolean completeFlight(String flightId, String bearerToken) {
        return completeFlight(flightId, null, bearerToken);
    }

    @Override
    public boolean completeFlight(String flightId, String landingHubId, String bearerToken) {
        if (flightId == null || flightId.isBlank() || !isFlightUrlConfigured()) {
            return false;
        }
        String endpoint = buildBaseUrl() + "/api/v1/flights/" + flightId.trim() + "/complete";
        if (landingHubId != null && !landingHubId.isBlank()) {
            endpoint = endpoint + "?landingHubId=" + java.net.URLEncoder.encode(landingHubId.trim(), java.nio.charset.StandardCharsets.UTF_8);
        }
        try {
            var req = restClient.post().uri(endpoint);
            if (bearerToken != null && !bearerToken.isBlank()) {
                req.header("Authorization", "Bearer " + bearerToken.replace("Bearer ", "").trim());
            }
            req.retrieve().toBodilessEntity();
            log.info("Synchronized flight '{}' -> COMPLETED (landingHub={}) from simulation finish",
                    flightId, landingHubId != null ? landingHubId : "arrival");
            return true;
        } catch (Exception ex) {
            log.warn("Could not complete flight '{}' from simulation: {}", flightId, ex.getMessage());
            return false;
        }
    }

    @Override
    public FlightDetailVm findControllableFlightByDroneId(String droneId) {
        if (droneId == null || droneId.isBlank() || !isFlightUrlConfigured() || objectMapper == null) {
            return null;
        }
        String endpoint = buildBaseUrl() + "/api/v1/flights?droneId="
                + java.net.URLEncoder.encode(droneId.trim(), java.nio.charset.StandardCharsets.UTF_8)
                + "&limit=10";
        try {
            String rawJson = restClient.get().uri(endpoint).retrieve().body(String.class);
            if (rawJson == null || rawJson.isBlank()) {
                return null;
            }
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode items = root.get("items");
            if (items == null || !items.isArray()) {
                return null;
            }
            for (String preferredStatus : List.of("active", "diverted", "authorized")) {
                for (JsonNode node : items) {
                    JsonNode statusNode = node.get("status");
                    if (statusNode != null && preferredStatus.equalsIgnoreCase(statusNode.asText())) {
                        JsonNode idNode = node.get("id");
                        if (idNode != null && !idNode.asText().isBlank()) {
                            return getFlightDetail(idNode.asText());
                        }
                    }
                }
            }
        } catch (Exception ex) {
            log.debug("Could not look up controllable flight for drone '{}': {}", droneId, ex.getMessage());
        }
        return null;
    }

    @Override
    public boolean abortFlight(String flightId, String reason) {
        return abortFlight(flightId, reason, null);
    }

    @Override
    public boolean abortFlight(String flightId, String reason, String bearerToken) {
        if (flightId == null || flightId.isBlank() || !isFlightUrlConfigured()) {
            return false;
        }
        String endpoint = buildBaseUrl() + "/api/v1/flights/" + flightId.trim() + "/abort";
        try {
            var req = restClient.post()
                    .uri(endpoint)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("reason", reason != null && !reason.isBlank() ? reason : "Simulation aborted"));
            if (bearerToken != null && !bearerToken.isBlank()) {
                req.header("Authorization", "Bearer " + bearerToken.replace("Bearer ", "").trim());
            }
            req.retrieve().toBodilessEntity();
            log.info("Synchronized flight '{}' -> ABORTED from simulation ({})", flightId, reason);
            return true;
        } catch (Exception ex) {
            log.warn("Could not abort flight '{}' from simulation: {}", flightId, ex.getMessage());
            return false;
        }
    }

    private boolean isFlightUrlConfigured() {
        return serviceUrlConfig.flight() != null
                && serviceUrlConfig.flight().url() != null
                && !serviceUrlConfig.flight().url().isBlank();
    }

    private String buildBaseUrl() {
        return ClientUrlUtils.normalizeBaseUrl(serviceUrlConfig.flight().url(), "http://flight:8086", "flight");
    }
}
