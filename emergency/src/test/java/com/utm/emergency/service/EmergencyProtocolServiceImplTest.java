package com.utm.emergency.service;

import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.emergency.mapper.EmergencyProtocolMapper;
import com.utm.emergency.model.EmergencyProtocol;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.repository.EmergencyProtocolRepository;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolPostVm;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolPutVm;
import com.utm.emergency.viewmodel.protocol.EmergencyProtocolVm;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: EmergencyProtocolServiceImpl (Specification-Driven)")
class EmergencyProtocolServiceImplTest {

    @Mock
    private EmergencyProtocolRepository protocolRepo;

    @Mock
    private EmergencyProtocolMapper protocolMapper;

    @Mock
    private DecisionEngineService decisionEngineService;

    @InjectMocks
    private EmergencyProtocolServiceImpl protocolService;

    @Captor
    private ArgumentCaptor<EmergencyProtocol> protocolCaptor;

    @Captor
    private ArgumentCaptor<EmergencyProtocolPutVm> putVmCaptor;

    private EmergencyProtocol createSampleProtocol(String id, String name, EmergencyType type, ResponseAction action,
            boolean isDefault) {
        EmergencyProtocol protocol = EmergencyProtocol.builder()
                .id(id)
                .name(name)
                .description("Sample protocol description for unit testing")
                .emergencyType(type)
                .severity(EmergencySeverity.critical)
                .responseAction(action)
                .fallbackAction(ResponseAction.HOVER)
                .requiresConfirmation(true)
                .confirmationTimeoutSeconds(30)
                .autoExecuteOnTimeout(true)
                .priority(10)
                .thresholds("{\"battery\": 10}")
                .conditions("{\"altitude\": 100}")
                .notifyPilot(true)
                .notifySupervisor(true)
                .notifyOpsCenter(true)
                .sendSms(false)
                .sendEmail(true)
                .playAudioAlarm(true)
                .isActive(true)
                .isSystemDefault(isDefault)
                .build();
        protocol.setCreatedOn(ZonedDateTime.now(ZoneOffset.UTC));
        protocol.setCreatedBy("admin");
        protocol.setLastModifiedOn(ZonedDateTime.now(ZoneOffset.UTC));
        protocol.setLastModifiedBy("admin");
        return protocol;
    }

    private EmergencyProtocolVm createSampleProtocolVm(String id, String name, EmergencyType type,
            ResponseAction action, boolean isDefault) {
        return new EmergencyProtocolVm(
                id,
                name,
                "Sample protocol description for unit testing",
                type,
                EmergencySeverity.critical,
                action,
                ResponseAction.HOVER,
                true,
                30,
                true,
                10,
                null,
                null,
                true,
                true,
                true,
                false,
                true,
                true,
                true,
                isDefault,
                ZonedDateTime.now(ZoneOffset.UTC),
                ZonedDateTime.now(ZoneOffset.UTC));
    }

    @Nested
    @DisplayName("getProtocols Endpoint Tests")
    class GetProtocolsTests {

        @Test
        @DisplayName("getProtocols with active=true queries active protocols ordered by priority and type")
        void getProtocols_withActiveTrue_queriesActiveProtocols() {
            EmergencyProtocol protocol = createSampleProtocol("proto-1", "Critical Battery Auto-Land",
                    EmergencyType.battery_critical, ResponseAction.LAND, true);
            EmergencyProtocolVm vm = createSampleProtocolVm("proto-1", "Critical Battery Auto-Land",
                    EmergencyType.battery_critical, ResponseAction.LAND, true);

            when(protocolRepo.findByIsActiveOrderByPriorityAscEmergencyTypeAsc(true)).thenReturn(List.of(protocol));
            when(protocolMapper.toVmList(List.of(protocol))).thenReturn(List.of(vm));

            List<EmergencyProtocolVm> results = protocolService.getProtocols(true);

            assertThat(results).hasSize(1);
            assertThat(results.get(0).name()).isEqualTo("Critical Battery Auto-Land");
            verify(protocolRepo).findByIsActiveOrderByPriorityAscEmergencyTypeAsc(true);
        }

        @Test
        @DisplayName("getProtocols with active=null queries all protocols ordered by priority and type")
        void getProtocols_withActiveNull_queriesAllProtocols() {
            EmergencyProtocol protocol = createSampleProtocol("proto-2", "C2 Link Lost Failsafe RTH",
                    EmergencyType.signal_lost, ResponseAction.RTH, false);
            EmergencyProtocolVm vm = createSampleProtocolVm("proto-2", "C2 Link Lost Failsafe RTH",
                    EmergencyType.signal_lost, ResponseAction.RTH, false);

            when(protocolRepo.findAllByOrderByPriorityAscEmergencyTypeAsc()).thenReturn(List.of(protocol));
            when(protocolMapper.toVmList(List.of(protocol))).thenReturn(List.of(vm));

            List<EmergencyProtocolVm> results = protocolService.getProtocols(null);

            assertThat(results).hasSize(1);
            verify(protocolRepo).findAllByOrderByPriorityAscEmergencyTypeAsc();
        }
    }

    @Nested
    @DisplayName("getProtocolById Endpoint Tests")
    class GetProtocolByIdTests {

        @Test
        @DisplayName("getProtocolById returns mapped VM when protocol exists")
        void getProtocolById_whenFound_returnsMappedVm() {
            EmergencyProtocol protocol = createSampleProtocol("proto-3", "Collision Imminent Descend",
                    EmergencyType.collision_aircraft, ResponseAction.DESCEND, true);
            EmergencyProtocolVm vm = createSampleProtocolVm("proto-3", "Collision Imminent Descend",
                    EmergencyType.collision_aircraft, ResponseAction.DESCEND, true);

            when(protocolRepo.findById("proto-3")).thenReturn(Optional.of(protocol));
            when(protocolMapper.toVm(protocol)).thenReturn(vm);

            EmergencyProtocolVm result = protocolService.getProtocolById("proto-3");

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo("proto-3");
            assertThat(result.responseAction()).isEqualTo(ResponseAction.DESCEND);
        }

        @Test
        @DisplayName("getProtocolById throws NotFoundException when protocol does not exist")
        void getProtocolById_whenNotFound_throwsNotFoundException() {
            when(protocolRepo.findById("unknown-proto")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> protocolService.getProtocolById("unknown-proto"))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("unknown-proto");
        }
    }

    @Nested
    @DisplayName("createProtocol Endpoint Tests")
    class CreateProtocolTests {

        @Test
        @DisplayName("createProtocol persists protocol, sets systemDefault=false and reloads decision engine")
        void createProtocol_whenValid_persistsProtocolAndReloadsEngine() {
            EmergencyProtocolPostVm postVm = new EmergencyProtocolPostVm(
                    "Custom Severe Wind Divert",
                    "Custom protocol for severe wind",
                    EmergencyType.weather_wind,
                    EmergencySeverity.critical,
                    ResponseAction.DIVERT,
                    ResponseAction.LAND,
                    true,
                    45,
                    true,
                    20,
                    null,
                    null,
                    true,
                    true,
                    true,
                    false,
                    true,
                    true,
                    true);

            EmergencyProtocol mappedEntity = createSampleProtocol(null, "Custom Severe Wind Divert",
                    EmergencyType.weather_wind, ResponseAction.DIVERT, true);
            EmergencyProtocol savedEntity = createSampleProtocol("proto-new", "Custom Severe Wind Divert",
                    EmergencyType.weather_wind, ResponseAction.DIVERT, false);
            EmergencyProtocolVm expectedVm = createSampleProtocolVm("proto-new", "Custom Severe Wind Divert",
                    EmergencyType.weather_wind, ResponseAction.DIVERT, false);

            when(protocolRepo.findByName("Custom Severe Wind Divert")).thenReturn(Optional.empty());
            when(protocolMapper.toEntity(postVm)).thenReturn(mappedEntity);
            when(protocolRepo.save(mappedEntity)).thenReturn(savedEntity);
            when(protocolMapper.toVm(savedEntity)).thenReturn(expectedVm);

            EmergencyProtocolVm result = protocolService.createProtocol(postVm);

            assertThat(result).isNotNull();
            assertThat(result.id()).isEqualTo("proto-new");
            assertThat(result.isSystemDefault()).isFalse();

            verify(protocolRepo).save(protocolCaptor.capture());
            assertThat(protocolCaptor.getValue().isSystemDefault()).isFalse();
            verify(decisionEngineService).reloadProtocols();
        }

        @Test
        @DisplayName("createProtocol throws BadRequestException when protocol name already exists")
        void createProtocol_whenDuplicateName_throwsBadRequestException() {
            EmergencyProtocolPostVm postVm = new EmergencyProtocolPostVm(
                    "Existing Protocol Name",
                    null,
                    EmergencyType.battery_low,
                    EmergencySeverity.warning,
                    ResponseAction.RTH,
                    null,
                    true,
                    30,
                    true,
                    50,
                    null,
                    null,
                    true,
                    true,
                    true,
                    false,
                    true,
                    true,
                    true);

            EmergencyProtocol existing = createSampleProtocol("proto-old", "Existing Protocol Name",
                    EmergencyType.battery_low, ResponseAction.RTH, false);
            when(protocolRepo.findByName("Existing Protocol Name")).thenReturn(Optional.of(existing));

            assertThatThrownBy(() -> protocolService.createProtocol(postVm))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Existing Protocol Name");

            verify(protocolRepo, never()).save(any(EmergencyProtocol.class));
            verify(decisionEngineService, never()).reloadProtocols();
        }
    }

    @Nested
    @DisplayName("updateProtocol Endpoint Tests")
    class UpdateProtocolTests {

        @Test
        @DisplayName("updateProtocol for system default protects emergencyType and responseAction from modification")
        void updateProtocol_whenSystemDefault_protectsCoreActionAndType() {
            String protoId = "proto-sys-def";
            EmergencyProtocol existing = createSampleProtocol(protoId, "System Default Battery Land",
                    EmergencyType.battery_critical, ResponseAction.LAND, true);

            EmergencyProtocolPutVm putVm = new EmergencyProtocolPutVm(
                    "System Default Battery Land",
                    "Updated description for system default protocol",
                    EmergencyType.motor_failure,
                    EmergencySeverity.critical,
                    ResponseAction.ESTOP,
                    ResponseAction.HOVER,
                    false,
                    15,
                    false,
                    5,
                    null,
                    null,
                    true,
                    true,
                    true,
                    false,
                    true,
                    true,
                    true);

            when(protocolRepo.findById(protoId)).thenReturn(Optional.of(existing));
            when(protocolRepo.save(existing)).thenReturn(existing);
            when(protocolMapper.toVm(existing)).thenReturn(createSampleProtocolVm(protoId,
                    "System Default Battery Land", EmergencyType.battery_critical, ResponseAction.LAND, true));

            EmergencyProtocolVm result = protocolService.updateProtocol(protoId, putVm);

            assertThat(result).isNotNull();
            verify(protocolMapper).updateEntityFromPutVm(eq(existing), putVmCaptor.capture());
            EmergencyProtocolPutVm capturedSafeVm = putVmCaptor.getValue();
            assertThat(capturedSafeVm.emergencyType()).isNull();
            assertThat(capturedSafeVm.responseAction()).isNull();
            assertThat(capturedSafeVm.confirmationTimeoutSeconds()).isEqualTo(15);

            verify(decisionEngineService).reloadProtocols();
        }

        @Test
        @DisplayName("updateProtocol for non-system default updates all fields including emergencyType and responseAction")
        void updateProtocol_whenNotSystemDefault_updatesAllFields() {
            String protoId = "proto-custom-1";
            EmergencyProtocol existing = createSampleProtocol(protoId, "Custom Protocol 1", EmergencyType.weather_wind,
                    ResponseAction.HOVER, false);

            EmergencyProtocolPutVm putVm = new EmergencyProtocolPutVm(
                    "Custom Protocol 1 Renamed",
                    "Updated description",
                    EmergencyType.weather_visibility,
                    EmergencySeverity.critical,
                    ResponseAction.DIVERT,
                    ResponseAction.LAND,
                    true,
                    25,
                    true,
                    15,
                    null,
                    null,
                    true,
                    true,
                    true,
                    false,
                    true,
                    true,
                    true);

            when(protocolRepo.findById(protoId)).thenReturn(Optional.of(existing));
            when(protocolRepo.findByName("Custom Protocol 1 Renamed")).thenReturn(Optional.empty());
            when(protocolRepo.save(existing)).thenReturn(existing);
            when(protocolMapper.toVm(existing)).thenReturn(createSampleProtocolVm(protoId, "Custom Protocol 1 Renamed",
                    EmergencyType.weather_visibility, ResponseAction.DIVERT, false));

            EmergencyProtocolVm result = protocolService.updateProtocol(protoId, putVm);

            assertThat(result).isNotNull();
            verify(protocolMapper).updateEntityFromPutVm(existing, putVm);
            verify(decisionEngineService).reloadProtocols();
        }

        @Test
        @DisplayName("updateProtocol throws BadRequestException when new name collides with another protocol")
        void updateProtocol_whenNameCollidesWithDifferentProtocol_throwsBadRequestException() {
            String protoId = "proto-target";
            EmergencyProtocol existing = createSampleProtocol(protoId, "Original Name", EmergencyType.battery_low,
                    ResponseAction.RTH, false);
            EmergencyProtocol other = createSampleProtocol("proto-other", "Conflicting Name", EmergencyType.battery_low,
                    ResponseAction.RTH, false);

            EmergencyProtocolPutVm putVm = new EmergencyProtocolPutVm(
                    "Conflicting Name",
                    null,
                    EmergencyType.battery_low,
                    EmergencySeverity.warning,
                    ResponseAction.RTH,
                    null,
                    true,
                    30,
                    true,
                    50,
                    null,
                    null,
                    true,
                    true,
                    true,
                    false,
                    true,
                    true,
                    true);

            when(protocolRepo.findById(protoId)).thenReturn(Optional.of(existing));
            when(protocolRepo.findByName("Conflicting Name")).thenReturn(Optional.of(other));

            assertThatThrownBy(() -> protocolService.updateProtocol(protoId, putVm))
                    .isInstanceOf(BadRequestException.class)
                    .hasMessageContaining("Conflicting Name");

            verify(protocolRepo, never()).save(any(EmergencyProtocol.class));
            verify(decisionEngineService, never()).reloadProtocols();
        }

        @Test
        @DisplayName("updateProtocol throws NotFoundException when protocol does not exist")
        void updateProtocol_whenNotFound_throwsNotFoundException() {
            when(protocolRepo.findById("unknown-id")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> protocolService.updateProtocol("unknown-id",
                    new EmergencyProtocolPutVm("name", null, null, null, null, null, null, null, null, null, null, null,
                            null, null, null, null, null, null, null)))
                    .isInstanceOf(NotFoundException.class)
                    .hasMessageContaining("unknown-id");
        }
    }
}
