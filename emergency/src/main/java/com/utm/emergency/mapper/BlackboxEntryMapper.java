package com.utm.emergency.mapper;

import com.utm.emergency.model.BlackboxEntry;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.viewmodel.blackbox.BlackboxEntryPostVm;
import com.utm.emergency.viewmodel.blackbox.BlackboxEntryVm;
import com.utm.emergency.viewmodel.client.TelemetryStreamVm;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        builder = @Builder(disableBuilder = true),
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface BlackboxEntryMapper {

    @Mapping(target = "isEmergencyRecording", source = "emergencyRecording")
    BlackboxEntryVm toVm(BlackboxEntry entity);

    List<BlackboxEntryVm> toVmList(List<BlackboxEntry> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "flightId", source = "flightId", qualifiedByName = "blackboxBlankToNull")
    @Mapping(target = "incidentId", source = "incidentId", qualifiedByName = "blackboxBlankToNull")
    @Mapping(target = "emergencyActive", source = "emergencyActive", defaultValue = "false")
    @Mapping(target = "emergencyRecording", source = "isEmergencyRecording", defaultValue = "false")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    BlackboxEntry toEntity(BlackboxEntryPostVm postVm);

    default BlackboxEntry toEmergencyEntity(EmergencyIncident incident, ResponseAction action) {
        return toEmergencyEntity(incident, action, null);
    }

    default BlackboxEntry toEmergencyEntity(
            EmergencyIncident incident,
            ResponseAction action,
            TelemetryStreamVm telemetry
    ) {
        String resolvedFlightId = blankToNull(incident.getFlightId());
        if (resolvedFlightId == null && telemetry != null) {
            resolvedFlightId = blankToNull(telemetry.flightId());
        }

        double lat = telemetry != null && telemetry.latitude() != null
                ? telemetry.latitude()
                : (incident.getLatitude() != null ? incident.getLatitude() : 0.0);
        double lon = telemetry != null && telemetry.longitude() != null
                ? telemetry.longitude()
                : (incident.getLongitude() != null ? incident.getLongitude() : 0.0);
        double alt = telemetry != null && telemetry.altitude() != null
                ? telemetry.altitude()
                : (incident.getAltitude() != null ? incident.getAltitude() : 0.0);
        double speed = telemetry != null && telemetry.speed() != null ? telemetry.speed() : 0.0;
        double heading = telemetry != null && telemetry.heading() != null ? telemetry.heading() : 0.0;
        double battery = telemetry != null && telemetry.batteryPercentage() != null
                ? telemetry.batteryPercentage()
                : extractBattery(incident.getDetectionData());
        double signal = incident.getEmergencyType() == EmergencyType.SIGNAL_LOST
                ? 0.0
                : (incident.getEmergencyType() == EmergencyType.SIGNAL_WEAK ? 35.0 : 100.0);

        return BlackboxEntry.builder()
                .droneId(incident.getDroneId())
                .flightId(resolvedFlightId)
                .incidentId(incident.getId())
                .timestamp(telemetry != null && telemetry.timestamp() != null
                        ? telemetry.timestamp()
                        : ZonedDateTime.now())
                .latitude(lat)
                .longitude(lon)
                .altitudeMsl(alt)
                .groundSpeed(speed)
                .heading(heading)
                .batteryLevel(battery)
                .signalStrength(signal)
                .commandExecuted(action != null ? action.name() : null)
                .emergencyActive(true)
                .emergencyType(incident.getEmergencyType())
                .emergencySeverity(incident.getSeverity())
                .isEmergencyRecording(true)
                .build();
    }

    @Named("blackboxBlankToNull")
    default String blankToNull(String value) {
        return (value == null || value.isBlank()) ? null : value.trim();
    }

    private static double extractBattery(Map<String, Object> detectionData) {
        if (detectionData == null) {
            return 0.0;
        }
        for (String key : List.of("batteryPercentage", "batteryPercent", "batteryLevel", "batteryPct")) {
            Object val = detectionData.get(key);
            if (val instanceof Number n) {
                return n.doubleValue();
            }
            if (val instanceof String s) {
                try {
                    return Double.parseDouble(s.trim());
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return 0.0;
    }
}
