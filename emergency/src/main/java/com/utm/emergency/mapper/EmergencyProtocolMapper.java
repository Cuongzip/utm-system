package com.utm.emergency.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.emergency.model.EmergencyProtocol;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolPostVm;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolPutVm;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolVm;
import org.mapstruct.BeanMapping;
import org.mapstruct.Builder;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingConstants;
import org.mapstruct.MappingTarget;
import org.mapstruct.Named;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

import java.util.List;

@Mapper(
        componentModel = MappingConstants.ComponentModel.SPRING,
        builder = @Builder(disableBuilder = true),
        unmappedTargetPolicy = ReportingPolicy.IGNORE
)
public interface EmergencyProtocolMapper {

    ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    @Mapping(target = "thresholds", source = "thresholds", qualifiedByName = "stringToJsonNode")
    @Mapping(target = "conditions", source = "conditions", qualifiedByName = "stringToJsonNode")
    @Mapping(target = "isActive", source = "active")
    @Mapping(target = "isSystemDefault", source = "systemDefault")
    EmergencyProtocolVm toVm(EmergencyProtocol entity);

    List<EmergencyProtocolVm> toVmList(List<EmergencyProtocol> entities);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "systemDefault", constant = "false")
    @Mapping(target = "active", source = "isActive", defaultValue = "true")
    @Mapping(target = "requiresConfirmation", source = "requiresConfirmation", defaultValue = "true")
    @Mapping(target = "confirmationTimeoutSeconds", source = "confirmationTimeoutSeconds", defaultValue = "30")
    @Mapping(target = "autoExecuteOnTimeout", source = "autoExecuteOnTimeout", defaultValue = "true")
    @Mapping(target = "priority", source = "priority", defaultValue = "50")
    @Mapping(target = "notifyPilot", source = "notifyPilot", defaultValue = "true")
    @Mapping(target = "notifySupervisor", source = "notifySupervisor", defaultValue = "true")
    @Mapping(target = "notifyOpsCenter", source = "notifyOpsCenter", defaultValue = "true")
    @Mapping(target = "sendSms", source = "sendSms", defaultValue = "false")
    @Mapping(target = "sendEmail", source = "sendEmail", defaultValue = "true")
    @Mapping(target = "playAudioAlarm", source = "playAudioAlarm", defaultValue = "true")
    @Mapping(target = "thresholds", source = "thresholds", qualifiedByName = "jsonNodeToString")
    @Mapping(target = "conditions", source = "conditions", qualifiedByName = "jsonNodeToString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    EmergencyProtocol toEntity(EmergencyProtocolPostVm postVm);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "systemDefault", ignore = true)
    @Mapping(target = "active", source = "isActive")
    @Mapping(target = "thresholds", source = "thresholds", qualifiedByName = "jsonNodeToString")
    @Mapping(target = "conditions", source = "conditions", qualifiedByName = "jsonNodeToString")
    @Mapping(target = "createdOn", ignore = true)
    @Mapping(target = "createdBy", ignore = true)
    @Mapping(target = "lastModifiedOn", ignore = true)
    @Mapping(target = "lastModifiedBy", ignore = true)
    void updateEntityFromPutVm(EmergencyProtocolPutVm putVm, @MappingTarget EmergencyProtocol entity);

    @Named("stringToJsonNode")
    default JsonNode stringToJsonNode(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return OBJECT_MAPPER.readTree(json);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    @Named("jsonNodeToString")
    default String jsonNodeToString(JsonNode node) {
        if (node == null || node.isNull()) return null;
        return node.toString();
    }
}