package com.utm.intelligence.service.client;

import com.utm.intelligence.config.ServiceUrlConfig;
import com.utm.intelligence.viewmodel.IntelligenceDtos.AdsbAircraftClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.AdsbResponseClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.AirspaceCheckPathClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ConflictClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.DroneClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.DroneListClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.EmergencyIncidentClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.EmergencyPageClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.FlightClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.FlightListClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.HubClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.HubListClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.NotamItemClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.NotamResponseClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.RoutePointVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.TelemetryClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.WeatherGoNoGoClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class IntelligenceInteropClientServiceImpl implements IntelligenceInteropClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public Optional<FlightClientVm> getFlightById(String flightId) {
        if (flightId == null || flightId.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.ofNullable(restClient.get()
                    .uri(serviceUrlConfig.getFlightUrl() + "/api/v1/flights/{id}", flightId.trim())
                    .retrieve()
                    .body(FlightClientVm.class));
        } catch (Exception ex) {
            log.warn("Intelligence failed to fetch flight {}: {}", flightId, ex.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public List<FlightClientVm> getFlights(String status, String hubId) {
        try {
            StringBuilder uri = new StringBuilder(serviceUrlConfig.getFlightUrl() + "/api/v1/flights?limit=100");
            if (status != null && !status.isBlank()) {
                uri.append("&status=").append(status.trim());
            }
            if (hubId != null && !hubId.isBlank()) {
                uri.append("&hubId=").append(hubId.trim());
            }
            FlightListClientVm res = restClient.get().uri(uri.toString()).retrieve().body(FlightListClientVm.class);
            return res != null && res.items() != null ? res.items() : Collections.emptyList();
        } catch (Exception ex) {
            log.warn("Intelligence failed to list flights: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public Optional<HubClientVm> getHubById(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.ofNullable(restClient.get()
                    .uri(serviceUrlConfig.getHubUrl() + "/api/v1/hubs/{id}", hubId.trim())
                    .retrieve()
                    .body(HubClientVm.class));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    @Override
    public List<HubClientVm> getAllHubs() {
        try {
            HubListClientVm res = restClient.get()
                    .uri(serviceUrlConfig.getHubUrl() + "/api/v1/hubs?limit=0")
                    .retrieve()
                    .body(HubListClientVm.class);
            return res != null && res.items() != null ? res.items() : Collections.emptyList();
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }

    @Override
    public List<DroneClientVm> getAllDrones() {
        try {
            DroneListClientVm res = restClient.get()
                    .uri(serviceUrlConfig.getDroneUrl() + "/api/v1/drones?limit=0")
                    .retrieve()
                    .body(DroneListClientVm.class);
            return res != null && res.items() != null ? res.items() : Collections.emptyList();
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }

    @Override
    public Optional<TelemetryClientVm> getLatestTelemetryByFlight(String flightId) {
        if (flightId == null || flightId.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.ofNullable(restClient.get()
                    .uri(serviceUrlConfig.getTelemetryUrl() + "/api/v1/telemetry/flight/{id}/latest", flightId.trim())
                    .retrieve()
                    .body(TelemetryClientVm.class));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<WeatherGoNoGoClientVm> getWeatherGoNoGo(String hubId) {
        if (hubId == null || hubId.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.ofNullable(restClient.get()
                    .uri(serviceUrlConfig.getWeatherAisUrl() + "/api/v1/weather/go-no-go/{hubId}", hubId.trim())
                    .retrieve()
                    .body(WeatherGoNoGoClientVm.class));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    @Override
    public List<AdsbAircraftClientVm> getAdsbAircraft() {
        try {
            AdsbResponseClientVm res = restClient.get()
                    .uri(serviceUrlConfig.getWeatherAisUrl() + "/api/v1/adsb/aircraft")
                    .retrieve()
                    .body(AdsbResponseClientVm.class);
            return res != null && res.aircraft() != null ? res.aircraft() : Collections.emptyList();
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }

    @Override
    public List<NotamItemClientVm> getNotams() {
        try {
            NotamResponseClientVm res = restClient.get()
                    .uri(serviceUrlConfig.getWeatherAisUrl() + "/api/v1/notam")
                    .retrieve()
                    .body(NotamResponseClientVm.class);
            return res != null && res.items() != null ? res.items() : Collections.emptyList();
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }

    @Override
    public Optional<AirspaceCheckPathClientVm> checkAirspacePath(List<RoutePointVm> points) {
        if (points == null || points.size() < 2) {
            return Optional.empty();
        }
        try {
            List<Map<String, Double>> pathPoints = points.stream()
                    .map(p -> Map.of("lat", p.lat(), "lon", p.lon(), "alt", p.alt()))
                    .toList();
            return Optional.ofNullable(restClient.post()
                    .uri(serviceUrlConfig.getAirspaceUrl() + "/api/v1/airspace/check-path")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("points", pathPoints))
                    .retrieve()
                    .body(AirspaceCheckPathClientVm.class));
        } catch (Exception ex) {
            log.warn("Intelligence failed to check airspace path: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public List<ConflictClientVm> getActiveConflicts() {
        try {
            List<ConflictClientVm> res = restClient.get()
                    .uri(serviceUrlConfig.getConflictUrl() + "/api/v1/conflicts/active")
                    .retrieve()
                    .body(new ParameterizedTypeReference<List<ConflictClientVm>>() {
                    });
            return res != null ? res : Collections.emptyList();
        } catch (Exception ex) {
            log.warn("Intelligence failed to list active conflicts: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public List<EmergencyIncidentClientVm> getEmergencyIncidents(boolean activeOnly) {
        try {
            if (activeOnly) {
                List<EmergencyIncidentClientVm> list = restClient.get()
                        .uri(serviceUrlConfig.getEmergencyUrl() + "/api/v1/emergency/incidents/active")
                        .retrieve()
                        .body(new ParameterizedTypeReference<List<EmergencyIncidentClientVm>>() {
                        });
                return list != null ? list : Collections.emptyList();
            }
            EmergencyPageClientVm page = restClient.get()
                    .uri(serviceUrlConfig.getEmergencyUrl() + "/api/v1/emergency/incidents?limit=25")
                    .retrieve()
                    .body(EmergencyPageClientVm.class);
            return page != null && page.items() != null ? page.items() : new ArrayList<>();
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public Map<String, Object> getFleetOverview() {
        try {
            Map<String, Object> map = restClient.get()
                    .uri(serviceUrlConfig.getFleetUrl() + "/api/v1/fleet/overview")
                    .retrieve()
                    .body(Map.class);
            return map != null ? map : Map.of("status", "unavailable");
        } catch (Exception ex) {
            return Map.of("status", "unavailable");
        }
    }
}
