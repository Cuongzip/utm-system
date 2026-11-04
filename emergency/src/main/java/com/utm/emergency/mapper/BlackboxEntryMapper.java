package com.utm.emergency.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.emergency.model.BlackboxEntry;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.viewmodel.blackbox.BlackboxEntryPostVm;
import com.utm.emergency.viewmodel.blackbox.BlackboxEntryVm;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.Named;
import org.mapstruct.ReportingPolicy;

import java.util.Collections;
import java.util.List;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        builder = @Builder(disableBuilder = true),
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface BlackboxEntryMapper {

    ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Mapping(target = "motorRpm", source = "motorRpm", qualifiedByName = "stringToDoubleList")
    @Mapping(target = "motorTemps", source = "motorTemps", qualifiedByName = "stringToDoubleList")
    BlackboxEntryVm toVm(BlackboxEntry entity);

    List<BlackboxEntryVm> toVmList(List<BlackboxEntry> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "motorRpm", source = "motorRpm", qualifiedByName = "doubleListToString")
    @Mapping(target = "motorTemps", source = "motorTemps", qualifiedByName = "doubleListToString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    BlackboxEntry toEntity(BlackboxEntryPostVm postVm);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "droneId", source = "incident.droneId")
    @Mapping(target = "flightId", source = "incident.flightId", defaultExpression = "java(\"FLIGHT-EMERGENCY\")")
    @Mapping(target = "incidentId", source = "incident.id")
    @Mapping(target = "timestamp", expression = "java(java.time.ZonedDateTime.now())")
    @Mapping(target = "latitude", source = "incident.latitude", defaultValue = "0.0")
    @Mapping(target = "longitude", source = "incident.longitude", defaultValue = "0.0")
    @Mapping(target = "altitudeMsl", source = "incident.altitude", defaultValue = "0.0")
    @Mapping(target = "altitudeAgl", ignore = true)
    @Mapping(target = "roll", ignore = true)
    @Mapping(target = "pitch", ignore = true)
    @Mapping(target = "yaw", ignore = true)
    @Mapping(target = "verticalSpeed", ignore = true)
    @Mapping(target = "groundSpeed", constant = "0.0")
    @Mapping(target = "heading", constant = "0.0")
    @Mapping(target = "batteryLevel", constant = "15.0")
    @Mapping(target = "batteryVoltage", ignore = true)
    @Mapping(target = "batteryCurrent", ignore = true)
    @Mapping(target = "signalStrength", constant = "90.0")
    @Mapping(target = "gpsSatellites", ignore = true)
    @Mapping(target = "gpsHdop", ignore = true)
    @Mapping(target = "motorRpm", ignore = true)
    @Mapping(target = "motorTemps", ignore = true)
    @Mapping(target = "commandReceived", expression = "java(action != null ? action.name() : null)")
    @Mapping(target = "commandExecuted", expression = "java(action != null ? action.name() : null)")
    @Mapping(target = "emergencyActive", constant = "true")
    @Mapping(target = "emergencyType", source = "incident.emergencyType")
    @Mapping(target = "emergencySeverity", source = "incident.severity")
    @Mapping(target = "flightMode", ignore = true)
    @Mapping(target = "windSpeed", ignore = true)
    @Mapping(target = "windDirection", ignore = true)
    @Mapping(target = "temperature", ignore = true)
    @Mapping(target = "humidity", ignore = true)
    @Mapping(target = "emergencyRecording", constant = "true")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    BlackboxEntry toEmergencyEntity(EmergencyIncident incident, ResponseAction action);

    @Named("stringToDoubleList")
    default List<Double> stringToDoubleList(String json) {
        if (json == null || json.isBlank()) return Collections.emptyList();
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<List<Double>>() {});
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    @Named("doubleListToString")
    default String doubleListToString(List<Double> list) {
        if (list == null || list.isEmpty()) return null;
        try {
            return OBJECT_MAPPER.writeValueAsString(list);
        } catch (JsonProcessingException e) {
            return null;
        }
    }
}
