package com.utm.commonlibrary.exception;

import com.utm.commonlibrary.constants.MessageCode;
import java.util.Collections;
import java.util.Map;

final class LegacyParamResolver {

    private static final Map<String, String> EXACT_LEGACY_KEYS = Map.ofEntries(
            Map.entry(MessageCode.AIRSPACE_ZONE_NOT_FOUND, "id"),
            Map.entry(MessageCode.AIRSPACE_ZONE_NAME_ALREADY_EXISTED, "name"),
            Map.entry(MessageCode.AIRSPACE_ZONE_CODE_ALREADY_EXISTED, "code"),
            Map.entry(MessageCode.HUB_NOT_FOUND, "id"),
            Map.entry(MessageCode.HUB_CODE_ALREADY_EXISTED, "code"),
            Map.entry(MessageCode.DEPARTURE_HUB_NOT_FOUND, "id"),
            Map.entry(MessageCode.ARRIVAL_HUB_NOT_FOUND, "id"),
            Map.entry(MessageCode.DRONE_NOT_FOUND, "id"),
            Map.entry(MessageCode.REGISTRATION_NUMBER_ALREADY_EXISTED, "registrationNumber"),
            Map.entry(MessageCode.DRONE_ALREADY_HAS_DEVICE_REGISTRATION, "registrationNumber"),
            Map.entry(MessageCode.DEVICE_IDENTIFIER_ALREADY_EXISTED, "identifier"),
            Map.entry(MessageCode.DEVICE_REGISTRATION_NOT_FOUND, "id"),
            Map.entry(MessageCode.DRONE_IN_FLIGHT_CANNOT_REVOKE, "registrationNumber"),
            Map.entry(MessageCode.DRONE_IN_FLIGHT_CANNOT_UPDATE, "registrationNumber"),
            Map.entry(MessageCode.DRONE_IN_FLIGHT_CANNOT_DELETE, "registrationNumber"),
            Map.entry(MessageCode.DRONE_NOT_AVAILABLE, "registrationNumber"),
            Map.entry(MessageCode.FLIGHT_NOT_FOUND, "id"),
            Map.entry(MessageCode.FLIGHT_NUMBER_ALREADY_EXISTED, "flightNumber"),
            Map.entry(MessageCode.FLIGHT_REJECTED, "flightNumber"),
            Map.entry(MessageCode.MISSION_NOT_FOUND, "id"),
            Map.entry(MessageCode.MISSION_CODE_ALREADY_EXISTED, "code"),
            Map.entry(MessageCode.MISSION_EXECUTION_NOT_FOUND, "id"),
            Map.entry(MessageCode.WAYPOINT_NOT_FOUND, "id"),
            Map.entry(MessageCode.ORGANIZATION_NOT_FOUND, "id"),
            Map.entry(MessageCode.ORGANIZATION_REGISTRATION_NUMBER_ALREADY_EXISTED, "registrationNumber"),
            Map.entry(MessageCode.ALERT_NOT_FOUND, "id"),
            Map.entry(MessageCode.CONFLICT_NOT_FOUND, "id"),
            Map.entry(MessageCode.EMERGENCY_PROTOCOL_NOT_FOUND, "id"),
            Map.entry(MessageCode.EMERGENCY_INCIDENT_NOT_FOUND, "id"),
            Map.entry(MessageCode.INCIDENT_NUMBER_ALREADY_EXISTED, "incidentNumber"),
            Map.entry(MessageCode.PENDING_CONFIRMATION_NOT_FOUND, "id"),
            Map.entry(MessageCode.TELEMETRY_NOT_FOUND, "id"),
            Map.entry(MessageCode.SIMULATION_NOT_FOUND, "id"),
            Map.entry(MessageCode.SIMULATION_ALREADY_ACTIVE, "id"),
            Map.entry(MessageCode.COMMAND_NOT_FOUND, "id")
    );

    private LegacyParamResolver() {
    }

    static Map<String, Object> resolve(String errorCode, Object... legacyArgs) {
        if (legacyArgs == null || legacyArgs.length == 0 || legacyArgs[0] == null || errorCode == null) {
            return Collections.emptyMap();
        }
        String semanticKey = EXACT_LEGACY_KEYS.get(errorCode);
        if (semanticKey != null) {
            return Map.of(semanticKey, legacyArgs[0]);
        }
        return Collections.emptyMap();
    }
}

