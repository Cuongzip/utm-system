package com.utm.drone.viewmodel.drone;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.utm.drone.model.enumeration.CommunicationProtocol;
import com.utm.drone.model.enumeration.DroneStatus;
import com.utm.drone.viewmodel.client.DeviceRegistrationBriefVm;
import com.utm.drone.viewmodel.client.HubBriefVm;
import com.utm.drone.viewmodel.client.OrganizationBriefVm;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@Schema(description = "Detailed profile and specifications of a Drone / UAS")
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DroneVm(
        String id,
        String registrationNumber,
        String serialNumber,
        String manufacturer,
        String model,
        String ownerId,
        String homeHubId,
        String currentHubId,
        Double batteryCapacityWh,
        Double currentBatteryPct,
        Double maxPayload,
        Double maxAltitude,
        Double maxSpeed,
        Double hoverPowerW,
        Double cruisePowerW,
        Double cruiseSpeedMs,
        Double batteryHealthPct,
        Double windToleranceMs,
        Integer maxFlightTimeMin,
        Double maxRangeM,
        CommunicationProtocol communicationProtocol,
        String remoteId,
        List<String> capabilities,
        Map<String, Object> specifications,
        Map<String, Object> telemetryConfig,
        ZonedDateTime lastMaintenance,
        ZonedDateTime nextMaintenance,
        Double totalFlightHours,
        Integer totalFlights,
        DroneStatus status,
        OrganizationBriefVm owner,
        HubBriefVm homeHub,
        DeviceRegistrationBriefVm deviceRegistration,
        ZonedDateTime createdOn,
        String createdBy,
        ZonedDateTime lastModifiedOn,
        String lastModifiedBy
) {
    public DroneVm(
            String id,
            String registrationNumber,
            String manufacturer,
            String model,
            String ownerId,
            String homeHubId,
            Double batteryCapacityWh,
            Double maxPayload,
            DroneStatus status,
            OrganizationBriefVm owner,
            HubBriefVm homeHub,
            DeviceRegistrationBriefVm deviceRegistration,
            ZonedDateTime createdOn,
            String createdBy,
            ZonedDateTime lastModifiedOn,
            String lastModifiedBy
    ) {
        this(id, registrationNumber, null, manufacturer, model, ownerId, homeHubId, homeHubId, batteryCapacityWh,
                100.0, maxPayload, 120.0, 20.0, 350.0, 280.0, 15.0, 100.0, 12.0, 40, 25000.0,
                CommunicationProtocol.WEBSOCKET, null, null, null, null, null, null, 0.0, 0,
                status, owner, homeHub, deviceRegistration, createdOn, createdBy, lastModifiedOn, lastModifiedBy);
    }

    public DroneVm(
            String id,
            String registrationNumber,
            String serialNumber,
            String manufacturer,
            String model,
            String ownerId,
            String homeHubId,
            String currentHubId,
            Double batteryCapacityWh,
            Double currentBatteryPct,
            Double maxPayload,
            Double hoverPowerW,
            Double cruisePowerW,
            Double cruiseSpeedMs,
            Double batteryHealthPct,
            Double windToleranceMs,
            Integer maxFlightTimeMin,
            Double maxRangeM,
            Double totalFlightHours,
            Integer totalFlights,
            DroneStatus status,
            OrganizationBriefVm owner,
            HubBriefVm homeHub,
            DeviceRegistrationBriefVm deviceRegistration,
            ZonedDateTime createdOn,
            String createdBy,
            ZonedDateTime lastModifiedOn,
            String lastModifiedBy
    ) {
        this(id, registrationNumber, serialNumber, manufacturer, model, ownerId, homeHubId, currentHubId,
                batteryCapacityWh, currentBatteryPct, maxPayload, 120.0, 20.0, hoverPowerW, cruisePowerW,
                cruiseSpeedMs, batteryHealthPct, windToleranceMs, maxFlightTimeMin, maxRangeM,
                CommunicationProtocol.WEBSOCKET, null, null, null, null, null, null, totalFlightHours, totalFlights,
                status, owner, homeHub, deviceRegistration, createdOn, createdBy, lastModifiedOn, lastModifiedBy);
    }
}
