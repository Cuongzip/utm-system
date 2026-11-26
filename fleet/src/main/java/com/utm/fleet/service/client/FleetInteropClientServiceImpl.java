package com.utm.fleet.service.client;

import com.utm.fleet.config.ServiceUrlConfig;
import com.utm.fleet.viewmodel.FleetDtos.DroneClientVm;
import com.utm.fleet.viewmodel.FleetDtos.DroneListClientVm;
import com.utm.fleet.viewmodel.FleetDtos.HubClientVm;
import com.utm.fleet.viewmodel.FleetDtos.HubListClientVm;
import com.utm.fleet.viewmodel.FleetDtos.MissionClientVm;
import com.utm.fleet.viewmodel.FleetDtos.MissionListClientVm;
import com.utm.fleet.viewmodel.FleetDtos.TelemetryClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class FleetInteropClientServiceImpl implements FleetInteropClientService {

    private final RestClient restClient;
    private final ServiceUrlConfig serviceUrlConfig;

    @Override
    public List<HubClientVm> getAllHubs() {
        try {
            HubListClientVm res = restClient.get()
                    .uri(serviceUrlConfig.getHubUrl() + "/api/v1/hubs?limit=0")
                    .retrieve()
                    .body(HubListClientVm.class);
            return res != null && res.items() != null ? res.items() : Collections.emptyList();
        } catch (Exception ex) {
            log.warn("Failed to list hubs in fleet service: {}", ex.getMessage());
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
            log.warn("Failed to fetch hub {} in fleet service: {}", hubId, ex.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public List<DroneClientVm> getAllDrones(String hubId) {
        try {
            String uri = serviceUrlConfig.getDroneUrl() + "/api/v1/drones?limit=0"
                    + (hubId != null && !hubId.isBlank() ? "&hubId=" + hubId.trim() : "");
            DroneListClientVm res = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(DroneListClientVm.class);
            return res != null && res.items() != null ? res.items() : Collections.emptyList();
        } catch (Exception ex) {
            log.warn("Failed to list drones in fleet service: {}", ex.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public Optional<DroneClientVm> getDroneById(String droneId) {
        if (droneId == null || droneId.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.ofNullable(restClient.get()
                    .uri(serviceUrlConfig.getDroneUrl() + "/api/v1/drones/{id}", droneId.trim())
                    .retrieve()
                    .body(DroneClientVm.class));
        } catch (Exception ex) {
            log.warn("Failed to fetch drone {} in fleet service: {}", droneId, ex.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public List<MissionClientVm> getMissionsByStatus(String status) {
        try {
            String uri = serviceUrlConfig.getMissionUrl() + "/api/v1/missions?size=200"
                    + (status != null && !status.isBlank() ? "&status=" + status.trim() : "");
            MissionListClientVm res = restClient.get()
                    .uri(uri)
                    .retrieve()
                    .body(MissionListClientVm.class);
            return res != null && res.items() != null ? res.items() : Collections.emptyList();
        } catch (Exception ex) {
            log.warn("Failed to list missions (status={}) in fleet service: {}", status, ex.getMessage());
            return Collections.emptyList();
        }
    }

    @Override
    public Optional<MissionClientVm> getMissionById(String missionId) {
        if (missionId == null || missionId.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.ofNullable(restClient.get()
                    .uri(serviceUrlConfig.getMissionUrl() + "/api/v1/missions/{id}", missionId.trim())
                    .retrieve()
                    .body(MissionClientVm.class));
        } catch (Exception ex) {
            log.warn("Failed to fetch mission {} in fleet service: {}", missionId, ex.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public Optional<Double> getLatestBatteryLevel(String droneId) {
        if (droneId == null || droneId.isBlank()) {
            return Optional.empty();
        }
        try {
            TelemetryClientVm res = restClient.get()
                    .uri(serviceUrlConfig.getTelemetryUrl() + "/api/v1/telemetry/drone/{droneId}/latest", droneId.trim())
                    .retrieve()
                    .body(TelemetryClientVm.class);
            return res != null && res.batteryLevel() != null ? Optional.of(res.batteryLevel()) : Optional.empty();
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    @Override
    public void updateDroneStatus(String droneId, String status) {
        if (droneId == null || droneId.isBlank() || status == null || status.isBlank()) {
            return;
        }
        try {
            restClient.put()
                    .uri(serviceUrlConfig.getDroneUrl() + "/api/v1/drones/{id}/status", droneId.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("status", status))
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.warn("Failed to update drone {} status to {}: {}", droneId, status, ex.getMessage());
        }
    }

    @Override
    public void updateDroneHub(String droneId, String hubId) {
        if (droneId == null || droneId.isBlank()) {
            return;
        }
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("currentHubId", hubId);
            restClient.put()
                    .uri(serviceUrlConfig.getDroneUrl() + "/api/v1/drones/{id}/hub", droneId.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.warn("Failed to update drone {} hub to {}: {}", droneId, hubId, ex.getMessage());
        }
    }

    @Override
    public void updateMissionDrone(String missionId, String droneId) {
        if (missionId == null || missionId.isBlank()) {
            return;
        }
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("droneId", droneId);
            restClient.put()
                    .uri(serviceUrlConfig.getMissionUrl() + "/api/v1/missions/{id}", missionId.trim())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .toBodilessEntity();
        } catch (Exception ex) {
            log.warn("Failed to update mission {} assigned drone to {}: {}", missionId, droneId, ex.getMessage());
        }
    }

    @Override
    public Optional<String> createRepositioningMission(String droneId, HubClientVm sourceHub, HubClientVm targetHub) {
        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("name", "Reposition: " + droneId + " (" + sourceHub.name() + " -> " + targetHub.name() + ")");
            payload.put("description", "Automated fleet rebalancing transfer from " + sourceHub.name() + " to " + targetHub.name());
            payload.put("departureHubId", sourceHub.id());
            payload.put("arrivalHubId", targetHub.id());
            payload.put("droneId", droneId);
            payload.put("payloadWeightKg", 0.0);
            payload.put("scheduleType", "manual");

            MissionClientVm created = restClient.post()
                    .uri(serviceUrlConfig.getMissionUrl() + "/api/v1/missions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(MissionClientVm.class);
            return created != null ? Optional.ofNullable(created.id()) : Optional.empty();
        } catch (Exception ex) {
            log.warn("Failed to create repositioning mission via mission service: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public Optional<String> createRepositioningFlight(
            String missionId, String droneId, HubClientVm sourceHub, HubClientVm targetHub) {
        if (sourceHub.latitude() == null || sourceHub.longitude() == null
                || targetHub.latitude() == null || targetHub.longitude() == null) {
            return Optional.empty();
        }
        try {
            ZonedDateTime depTime = ZonedDateTime.now().plusMinutes(2);
            ZonedDateTime arrTime = depTime.plusMinutes(25);
            Map<String, Object> route = Map.of(
                    "type", "LineString",
                    "coordinates", List.of(
                            List.of(sourceHub.longitude(), sourceHub.latitude()),
                            List.of(targetHub.longitude(), targetHub.latitude())));

            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("droneId", droneId);
            payload.put("departureHubId", sourceHub.id());
            payload.put("arrivalHubId", targetHub.id());
            payload.put("scheduledDeparture", depTime.toString());
            payload.put("scheduledArrival", arrTime.toString());
            payload.put("cruisingAltitudeM", 60.0);
            payload.put("plannedRoute", route);
            payload.put("flightType", "repositioning");
            payload.put("operationMode", "autonomous");
            payload.put("payloadWeightKg", 0.0);
            if (missionId != null) {
                payload.put("missionId", missionId);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> created = restClient.post()
                    .uri(serviceUrlConfig.getFlightUrl() + "/api/v1/flights")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(Map.class);
            Object id = created != null ? created.get("id") : null;
            return id != null ? Optional.of(String.valueOf(id)) : Optional.empty();
        } catch (Exception ex) {
            log.warn("Failed to create repositioning flight via flight service: {}", ex.getMessage());
            return Optional.empty();
        }
    }
}
