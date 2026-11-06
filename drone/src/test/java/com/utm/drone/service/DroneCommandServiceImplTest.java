package com.utm.drone.service;

import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.drone.mapper.DroneCommandMapper;
import com.utm.drone.model.Drone;
import com.utm.drone.model.DroneCommand;
import com.utm.drone.model.enumeration.CommandStatus;
import com.utm.drone.model.enumeration.CommandType;
import com.utm.drone.model.enumeration.DroneStatus;
import com.utm.drone.repository.DroneCommandRepository;
import com.utm.drone.repository.DroneRepository;
import com.utm.drone.viewmodel.command.DroneCommandListVm;
import com.utm.drone.viewmodel.command.DroneCommandPostVm;
import com.utm.drone.viewmodel.command.DroneCommandVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: DroneCommandServiceImpl (Specification-Driven)")
class DroneCommandServiceImplTest {

        @Mock
        private DroneRepository droneRepository;

        @Mock
        private DroneCommandRepository droneCommandRepository;

        @Mock
        private DroneCommandMapper droneCommandMapper;

        @InjectMocks
        private DroneCommandServiceImpl droneCommandService;

        private Drone sampleDrone;
        private DroneCommand sampleCommand;
        private DroneCommandVm sampleCommandVm;
        private DroneCommandPostVm samplePostVm;

        @BeforeEach
        void setUp() {
                sampleDrone = Drone.builder()
                                .id("d1b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .registrationNumber("VN-UAV-001")
                                .manufacturer("DJI")
                                .model("Matrice 350 RTK")
                                .status(DroneStatus.AVAILABLE)
                                .build();

                sampleCommand = DroneCommand.builder()
                                .id("c1b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .droneId(sampleDrone.getId())
                                .flightId("f1b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .commandType(CommandType.RTL)
                                .parameters("{\"reason\": \"BATTERY_LOW\"}")
                                .status(CommandStatus.PENDING)
                                .issuedBy("operator")
                                .issuedAt(Instant.parse("2026-10-10T08:00:00Z"))
                                .priority(1)
                                .timeoutMs(1000)
                                .retryCount(0)
                                .maxRetries(2)
                                .build();

                sampleCommandVm = createCommandVm("c1b2c3d4-e5f6-7890-abcd-ef1234567890", CommandType.RTL,
                                CommandStatus.PENDING, 1, 1000);

                samplePostVm = new DroneCommandPostVm(
                                CommandType.RTL,
                                "f1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "{\"reason\": \"BATTERY_LOW\"}",
                                null,
                                null);
        }

        private DroneCommandVm createCommandVm(String id, CommandType type, CommandStatus status, Integer priority,
                        Integer timeoutMs) {
                return new DroneCommandVm(
                                id,
                                sampleDrone.getId(),
                                "f1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                type,
                                "{}",
                                status,
                                "operator",
                                Instant.parse("2026-10-10T08:00:00Z"),
                                null,
                                null,
                                null,
                                priority,
                                timeoutMs,
                                0,
                                2,
                                null,
                                "operator",
                                null,
                                null);
        }

        @Test
        @DisplayName("sendCommand computes default priority and timeout based on command type")
        void sendCommand_standardCommandWithDefaultPriorityAndTimeout_savesCommand() {
                when(droneRepository.findById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleDrone));
                when(droneCommandMapper.toEntity(eq(samplePostVm), eq("d1b2c3d4-e5f6-7890-abcd-ef1234567890"),
                                anyString(), eq(1), eq(1000), eq(2)))
                                .thenReturn(sampleCommand);
                when(droneCommandRepository.save(sampleCommand)).thenReturn(sampleCommand);
                when(droneCommandMapper.toVm(sampleCommand)).thenReturn(sampleCommandVm);

                DroneCommandVm result = droneCommandService.sendCommand("d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                samplePostVm);

                assertThat(result).isNotNull();
                assertThat(result.id()).isEqualTo("c1b2c3d4-e5f6-7890-abcd-ef1234567890");
                assertThat(result.droneId()).isEqualTo("d1b2c3d4-e5f6-7890-abcd-ef1234567890");
                assertThat(result.commandType()).isEqualTo(CommandType.RTL);
                assertThat(result.status()).isEqualTo(CommandStatus.PENDING);
                assertThat(result.priority()).isEqualTo(1);
                assertThat(result.timeoutMs()).isEqualTo(1000);
                verify(droneCommandRepository).save(sampleCommand);
        }

        @Test
        @DisplayName("sendCommand uses explicitly provided priority and timeout when given")
        void sendCommand_explicitPriorityAndTimeout_usesCustomValues() {
                DroneCommandPostVm customVm = new DroneCommandPostVm(
                                CommandType.GOTO,
                                "f1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "{\"lat\": 10.7626, \"lng\": 106.6822}",
                                0,
                                3500);

                DroneCommand customCommand = DroneCommand.builder()
                                .id("c2b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .droneId("d1b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .commandType(CommandType.GOTO)
                                .priority(0)
                                .timeoutMs(3500)
                                .maxRetries(3)
                                .status(CommandStatus.PENDING)
                                .build();

                DroneCommandVm customResultVm = createCommandVm("c2b2c3d4-e5f6-7890-abcd-ef1234567890",
                                CommandType.GOTO, CommandStatus.PENDING, 0, 3500);

                when(droneRepository.findById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleDrone));
                when(droneCommandMapper.toEntity(eq(customVm), eq("d1b2c3d4-e5f6-7890-abcd-ef1234567890"), anyString(),
                                eq(0), eq(3500), eq(3)))
                                .thenReturn(customCommand);
                when(droneCommandRepository.save(customCommand)).thenReturn(customCommand);
                when(droneCommandMapper.toVm(customCommand)).thenReturn(customResultVm);

                DroneCommandVm result = droneCommandService.sendCommand("d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                customVm);

                assertThat(result).isNotNull();
                assertThat(result.priority()).isEqualTo(0);
                assertThat(result.timeoutMs()).isEqualTo(3500);
                verify(droneCommandRepository).save(customCommand);
        }

        @Test
        @DisplayName("sendCommand updates drone status to IN_FLIGHT when commandType is TAKEOFF")
        void sendCommand_takeoffCommand_updatesDroneStatusToInFlight() {
                DroneCommandPostVm takeoffVm = new DroneCommandPostVm(
                                CommandType.TAKEOFF,
                                "f1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "{\"altitude\": 50.0}",
                                null,
                                null);

                DroneCommand takeoffCommand = DroneCommand.builder()
                                .id("c3b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .droneId(sampleDrone.getId())
                                .commandType(CommandType.TAKEOFF)
                                .status(CommandStatus.PENDING)
                                .build();

                DroneCommandVm takeoffResultVm = createCommandVm("c3b2c3d4-e5f6-7890-abcd-ef1234567890",
                                CommandType.TAKEOFF, CommandStatus.PENDING, 2, 2000);

                when(droneRepository.findById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleDrone));
                when(droneCommandMapper.toEntity(eq(takeoffVm), eq(sampleDrone.getId()), anyString(), eq(2), eq(2000),
                                eq(2)))
                                .thenReturn(takeoffCommand);
                when(droneCommandRepository.save(takeoffCommand)).thenReturn(takeoffCommand);
                when(droneCommandMapper.toVm(takeoffCommand)).thenReturn(takeoffResultVm);

                DroneCommandVm result = droneCommandService.sendCommand("d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                takeoffVm);

                assertThat(result).isNotNull();
                assertThat(sampleDrone.getStatus()).isEqualTo(DroneStatus.IN_FLIGHT);
                verify(droneRepository).save(sampleDrone);
        }

        @Test
        @DisplayName("sendCommand updates drone status to MAINTENANCE when commandType is EMERGENCY_STOP")
        void sendCommand_emergencyStopCommand_updatesDroneStatusToMaintenance() {
                sampleDrone.setStatus(DroneStatus.IN_FLIGHT);

                DroneCommandPostVm stopVm = new DroneCommandPostVm(
                                CommandType.EMERGENCY_STOP,
                                "f1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "{\"reason\": \"MOTOR_FAIL\"}",
                                null,
                                null);

                DroneCommand stopCommand = DroneCommand.builder()
                                .id("c4b2c3d4-e5f6-7890-abcd-ef1234567890")
                                .droneId(sampleDrone.getId())
                                .commandType(CommandType.EMERGENCY_STOP)
                                .status(CommandStatus.PENDING)
                                .build();

                DroneCommandVm stopResultVm = createCommandVm("c4b2c3d4-e5f6-7890-abcd-ef1234567890",
                                CommandType.EMERGENCY_STOP, CommandStatus.PENDING, 0, 500);

                when(droneRepository.findById("d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleDrone));
                when(droneCommandMapper.toEntity(eq(stopVm), eq(sampleDrone.getId()), anyString(), eq(0), eq(500),
                                eq(3)))
                                .thenReturn(stopCommand);
                when(droneCommandRepository.save(stopCommand)).thenReturn(stopCommand);
                when(droneCommandMapper.toVm(stopCommand)).thenReturn(stopResultVm);

                DroneCommandVm result = droneCommandService.sendCommand("d1b2c3d4-e5f6-7890-abcd-ef1234567890", stopVm);

                assertThat(result).isNotNull();
                assertThat(sampleDrone.getStatus()).isEqualTo(DroneStatus.MAINTENANCE);
                verify(droneRepository).save(sampleDrone);
        }

        @Test
        @DisplayName("sendCommand throws NotFoundException when drone does not exist")
        void sendCommand_nonExistentDrone_throwsNotFoundException() {
                when(droneRepository.findById("unknown-id")).thenReturn(Optional.empty());

                assertThatThrownBy(() -> droneCommandService.sendCommand("unknown-id", samplePostVm))
                                .isInstanceOf(NotFoundException.class)
                                .hasMessageContaining("unknown-id");

                verify(droneCommandRepository, never()).save(any());
        }

        @Test
        @DisplayName("getCommands returns filtered list when both status and commandType are provided")
        void getCommands_bothStatusAndTypeProvided_callsSpecificQuery() {
                when(droneRepository.existsById("d1b2c3d4-e5f6-7890-abcd-ef1234567890")).thenReturn(true);
                Page<DroneCommand> page = new PageImpl<>(List.of(sampleCommand));
                when(droneCommandRepository.findByDroneIdAndStatusAndCommandTypeOrderByIssuedAtDesc(
                                eq("d1b2c3d4-e5f6-7890-abcd-ef1234567890"),
                                eq(CommandStatus.PENDING),
                                eq(CommandType.RTL),
                                any(Pageable.class))).thenReturn(page);
                when(droneCommandMapper.toVmList(List.of(sampleCommand))).thenReturn(List.of(sampleCommandVm));

                DroneCommandListVm result = droneCommandService.getCommands(
                                "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                CommandStatus.PENDING,
                                CommandType.RTL,
                                10,
                                0);

                assertThat(result).isNotNull();
                assertThat(result.total()).isEqualTo(1);
                assertThat(result.items()).hasSize(1);
                assertThat(result.items().get(0).commandType()).isEqualTo(CommandType.RTL);
                assertThat(result.items().get(0).status()).isEqualTo(CommandStatus.PENDING);
        }

        @Test
        @DisplayName("getCommands returns filtered list when status only is provided")
        void getCommands_statusOnlyProvided_callsStatusQuery() {
                when(droneRepository.existsById("d1b2c3d4-e5f6-7890-abcd-ef1234567890")).thenReturn(true);
                Page<DroneCommand> page = new PageImpl<>(List.of(sampleCommand));
                when(droneCommandRepository.findByDroneIdAndStatusOrderByIssuedAtDesc(
                                eq("d1b2c3d4-e5f6-7890-abcd-ef1234567890"),
                                eq(CommandStatus.PENDING),
                                any(Pageable.class))).thenReturn(page);
                when(droneCommandMapper.toVmList(List.of(sampleCommand))).thenReturn(List.of(sampleCommandVm));

                DroneCommandListVm result = droneCommandService.getCommands(
                                "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                CommandStatus.PENDING,
                                null,
                                10,
                                0);

                assertThat(result).isNotNull();
                assertThat(result.total()).isEqualTo(1);
                assertThat(result.items()).hasSize(1);
        }

        @Test
        @DisplayName("getCommands returns filtered list when commandType only is provided")
        void getCommands_commandTypeOnlyProvided_callsCommandTypeQuery() {
                when(droneRepository.existsById("d1b2c3d4-e5f6-7890-abcd-ef1234567890")).thenReturn(true);
                Page<DroneCommand> page = new PageImpl<>(List.of(sampleCommand));
                when(droneCommandRepository.findByDroneIdAndCommandTypeOrderByIssuedAtDesc(
                                eq("d1b2c3d4-e5f6-7890-abcd-ef1234567890"),
                                eq(CommandType.RTL),
                                any(Pageable.class))).thenReturn(page);
                when(droneCommandMapper.toVmList(List.of(sampleCommand))).thenReturn(List.of(sampleCommandVm));

                DroneCommandListVm result = droneCommandService.getCommands(
                                "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                null,
                                CommandType.RTL,
                                10,
                                0);

                assertThat(result).isNotNull();
                assertThat(result.total()).isEqualTo(1);
                assertThat(result.items()).hasSize(1);
        }

        @Test
        @DisplayName("getCommands returns all drone commands when no filters are provided")
        void getCommands_noFiltersProvided_callsAllForDroneQuery() {
                when(droneRepository.existsById("d1b2c3d4-e5f6-7890-abcd-ef1234567890")).thenReturn(true);
                Page<DroneCommand> page = new PageImpl<>(List.of(sampleCommand));
                when(droneCommandRepository.findByDroneIdOrderByIssuedAtDesc(
                                eq("d1b2c3d4-e5f6-7890-abcd-ef1234567890"),
                                any(Pageable.class))).thenReturn(page);
                when(droneCommandMapper.toVmList(List.of(sampleCommand))).thenReturn(List.of(sampleCommandVm));

                DroneCommandListVm result = droneCommandService.getCommands(
                                "d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                null,
                                null,
                                10,
                                0);

                assertThat(result).isNotNull();
                assertThat(result.total()).isEqualTo(1);
                assertThat(result.items()).hasSize(1);
        }

        @Test
        @DisplayName("getCommands throws NotFoundException when drone does not exist")
        void getCommands_nonExistentDrone_throwsNotFoundException() {
                when(droneRepository.existsById("unknown-id")).thenReturn(false);

                assertThatThrownBy(() -> droneCommandService.getCommands("unknown-id", null, null, 10, 0))
                                .isInstanceOf(NotFoundException.class)
                                .hasMessageContaining("unknown-id");
        }

        @Test
        @DisplayName("getCommandById returns command ViewModel when command exists for the drone")
        void getCommandById_existingCommand_returnsVm() {
                when(droneCommandRepository.findByIdAndDroneId("c1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleCommand));
                when(droneCommandMapper.toVm(sampleCommand)).thenReturn(sampleCommandVm);

                DroneCommandVm result = droneCommandService.getCommandById("d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "c1b2c3d4-e5f6-7890-abcd-ef1234567890");

                assertThat(result).isNotNull();
                assertThat(result.id()).isEqualTo("c1b2c3d4-e5f6-7890-abcd-ef1234567890");
                assertThat(result.droneId()).isEqualTo("d1b2c3d4-e5f6-7890-abcd-ef1234567890");
                assertThat(result.commandType()).isEqualTo(CommandType.RTL);
                assertThat(result.status()).isEqualTo(CommandStatus.PENDING);
        }

        @Test
        @DisplayName("getCommandById throws NotFoundException when command does not exist")
        void getCommandById_nonExistentCommand_throwsNotFoundException() {
                when(droneCommandRepository.findByIdAndDroneId("unknown-cmd", "d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.empty());

                assertThatThrownBy(() -> droneCommandService.getCommandById("d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "unknown-cmd"))
                                .isInstanceOf(NotFoundException.class)
                                .hasMessageContaining("COMMAND_NOT_FOUND");
        }

        @Test
        @DisplayName("cancelCommand cancels command when in PENDING status")
        void cancelCommand_pendingCommand_cancelsSuccessfully() {
                sampleCommand.setStatus(CommandStatus.PENDING);
                DroneCommandVm cancelledVm = createCommandVm("c1b2c3d4-e5f6-7890-abcd-ef1234567890", CommandType.RTL,
                                CommandStatus.CANCELLED, 1, 1000);

                when(droneCommandRepository.findByIdAndDroneId("c1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleCommand));
                when(droneCommandRepository.save(sampleCommand)).thenReturn(sampleCommand);
                when(droneCommandMapper.toVm(sampleCommand)).thenReturn(cancelledVm);

                DroneCommandVm result = droneCommandService.cancelCommand("d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "c1b2c3d4-e5f6-7890-abcd-ef1234567890");

                assertThat(result).isNotNull();
                assertThat(sampleCommand.getStatus()).isEqualTo(CommandStatus.CANCELLED);
                assertThat(sampleCommand.getCompletedAt()).isNotNull();
                verify(droneCommandRepository).save(sampleCommand);
        }

        @Test
        @DisplayName("cancelCommand cancels command when in SENT status")
        void cancelCommand_sentCommand_cancelsSuccessfully() {
                sampleCommand.setStatus(CommandStatus.SENT);
                DroneCommandVm cancelledVm = createCommandVm("c1b2c3d4-e5f6-7890-abcd-ef1234567890", CommandType.RTL,
                                CommandStatus.CANCELLED, 1, 1000);

                when(droneCommandRepository.findByIdAndDroneId("c1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleCommand));
                when(droneCommandRepository.save(sampleCommand)).thenReturn(sampleCommand);
                when(droneCommandMapper.toVm(sampleCommand)).thenReturn(cancelledVm);

                DroneCommandVm result = droneCommandService.cancelCommand("d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "c1b2c3d4-e5f6-7890-abcd-ef1234567890");

                assertThat(result).isNotNull();
                assertThat(sampleCommand.getStatus()).isEqualTo(CommandStatus.CANCELLED);
                verify(droneCommandRepository).save(sampleCommand);
        }

        @Test
        @DisplayName("cancelCommand throws BadRequestException when command is already EXECUTING")
        void cancelCommand_executingCommand_throwsBadRequestException() {
                sampleCommand.setStatus(CommandStatus.EXECUTING);
                when(droneCommandRepository.findByIdAndDroneId("c1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleCommand));

                assertThatThrownBy(() -> droneCommandService.cancelCommand("d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "c1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("CANNOT_CANCEL_EXECUTING_COMMAND");

                verify(droneCommandRepository, never()).save(any());
        }

        @Test
        @DisplayName("cancelCommand throws BadRequestException when command is already COMPLETED")
        void cancelCommand_completedCommand_throwsBadRequestException() {
                sampleCommand.setStatus(CommandStatus.COMPLETED);
                when(droneCommandRepository.findByIdAndDroneId("c1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.of(sampleCommand));

                assertThatThrownBy(() -> droneCommandService.cancelCommand("d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "c1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .isInstanceOf(BadRequestException.class)
                                .hasMessageContaining("CANNOT_CANCEL_EXECUTING_COMMAND");

                verify(droneCommandRepository, never()).save(any());
        }

        @Test
        @DisplayName("cancelCommand throws NotFoundException when command does not exist")
        void cancelCommand_nonExistentCommand_throwsNotFoundException() {
                when(droneCommandRepository.findByIdAndDroneId("unknown-cmd", "d1b2c3d4-e5f6-7890-abcd-ef1234567890"))
                                .thenReturn(Optional.empty());

                assertThatThrownBy(() -> droneCommandService.cancelCommand("d1b2c3d4-e5f6-7890-abcd-ef1234567890",
                                "unknown-cmd"))
                                .isInstanceOf(NotFoundException.class)
                                .hasMessageContaining("COMMAND_NOT_FOUND");

                verify(droneCommandRepository, never()).save(any());
        }

        @Test
        @DisplayName("getActiveCommands returns active commands for existing drone")
        void getActiveCommands_existingDrone_returnsActiveCommandList() {
                when(droneRepository.existsById("d1b2c3d4-e5f6-7890-abcd-ef1234567890")).thenReturn(true);
                when(droneCommandRepository.findByDroneIdAndStatusInOrderByIssuedAtDesc(
                                eq("d1b2c3d4-e5f6-7890-abcd-ef1234567890"), anyList()))
                                .thenReturn(List.of(sampleCommand));
                when(droneCommandMapper.toVmList(List.of(sampleCommand))).thenReturn(List.of(sampleCommandVm));

                List<DroneCommandVm> result = droneCommandService
                                .getActiveCommands("d1b2c3d4-e5f6-7890-abcd-ef1234567890");

                assertThat(result).isNotNull();
                assertThat(result).hasSize(1);
                assertThat(result.get(0).id()).isEqualTo("c1b2c3d4-e5f6-7890-abcd-ef1234567890");
                assertThat(result.get(0).status()).isEqualTo(CommandStatus.PENDING);
        }

        @Test
        @DisplayName("getActiveCommands throws NotFoundException when drone does not exist")
        void getActiveCommands_nonExistentDrone_throwsNotFoundException() {
                when(droneRepository.existsById("unknown-id")).thenReturn(false);

                assertThatThrownBy(() -> droneCommandService.getActiveCommands("unknown-id"))
                                .isInstanceOf(NotFoundException.class)
                                .hasMessageContaining("unknown-id");

                verify(droneCommandRepository, never()).findByDroneIdAndStatusInOrderByIssuedAtDesc(any(), any());
        }
}
