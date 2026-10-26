package com.utm.drone.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.utils.AuthenticationUtils;
import com.utm.drone.mapper.DroneCommandMapper;
import com.utm.drone.model.Drone;
import com.utm.drone.model.DroneCommand;
import com.utm.drone.model.enumeration.CommandStatus;
import com.utm.drone.model.enumeration.CommandType;
import com.utm.drone.model.enumeration.DroneStatus;
import com.utm.drone.repository.DroneCommandRepository;
import com.utm.drone.repository.DroneRepository;
import com.utm.drone.viewmodel.DroneCommandListVm;
import com.utm.drone.viewmodel.DroneCommandPostVm;
import com.utm.drone.viewmodel.DroneCommandVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class DroneCommandServiceImpl implements DroneCommandService {

    private final DroneRepository droneRepository;
    private final DroneCommandRepository droneCommandRepository;
    private final DroneCommandMapper droneCommandMapper;

    @Override
    @Transactional
    public DroneCommandVm sendCommand(String droneId, DroneCommandPostVm postVm) {
        Drone drone = droneRepository.findById(droneId)
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, droneId));

        int priority = postVm.priority() != null ? postVm.priority() : getPriorityForCommand(postVm.commandType());
        int timeoutMs = postVm.timeoutMs() != null ? postVm.timeoutMs() : getTimeoutForPriority(priority);
        int maxRetries = getMaxRetriesForPriority(priority);

        String issuedBy;
        try {
            issuedBy = AuthenticationUtils.extractUserId();
        } catch (Exception e) {
            issuedBy = "operator";
        }

        DroneCommand entity = droneCommandMapper.toEntity(
                postVm,
                drone.getId(),
                issuedBy,
                priority,
                timeoutMs,
                maxRetries
        );

        DroneCommand saved = droneCommandRepository.save(entity);
        log.info("Issued command {} (type={}) to drone {}", saved.getId(), saved.getCommandType(), droneId);

        if (postVm.commandType() == CommandType.EMERGENCY_STOP) {
            drone.setStatus(DroneStatus.MAINTENANCE);
            droneRepository.save(drone);
            log.warn("Emergency stop command issued for drone {}, setting status to MAINTENANCE", droneId);
        } else if (postVm.commandType() == CommandType.TAKEOFF) {
            drone.setStatus(DroneStatus.IN_FLIGHT);
            droneRepository.save(drone);
        }

        simulateExecution(saved.getId(), saved.getCommandType());

        return droneCommandMapper.toVm(saved);
    }

    private void simulateExecution(String commandId, CommandType commandType) {
        CompletableFuture.runAsync(() -> {
            try {
                Thread.sleep(Math.min(500, getAckDelay(commandType)));
                droneCommandRepository.findById(commandId).ifPresent(cmd -> {
                    if (cmd.getStatus() == CommandStatus.PENDING || cmd.getStatus() == CommandStatus.SENT) {
                        cmd.setStatus(CommandStatus.ACKNOWLEDGED);
                        cmd.setAcknowledgedAt(Instant.now());
                        droneCommandRepository.save(cmd);
                    }
                });

                Thread.sleep(Math.min(1000, getExecuteDelay(commandType)));
                droneCommandRepository.findById(commandId).ifPresent(cmd -> {
                    if (cmd.getStatus() == CommandStatus.ACKNOWLEDGED) {
                        cmd.setStatus(CommandStatus.EXECUTING);
                        droneCommandRepository.save(cmd);
                    }
                });

                Thread.sleep(Math.min(2000, getCompleteDelay(commandType)));
                droneCommandRepository.findById(commandId).ifPresent(cmd -> {
                    if (cmd.getStatus() == CommandStatus.EXECUTING) {
                        cmd.setStatus(CommandStatus.COMPLETED);
                        cmd.setCompletedAt(Instant.now());
                        droneCommandRepository.save(cmd);
                        log.info("Command {} ({}) completed successfully", cmd.getId(), cmd.getCommandType());
                    }
                });
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                log.warn("Simulation interrupted for command {}", commandId);
            } catch (Exception e) {
                log.error("Error during simulation for command {}: {}", commandId, e.getMessage());
            }
        });
    }

    @Override
    @Transactional(readOnly = true)
    public DroneCommandListVm getCommands(String droneId, CommandStatus status, CommandType commandType, int limit, int offset) {
        if (!droneRepository.existsById(droneId)) {
            throw new NotFoundException(MessageCode.DRONE_NOT_FOUND, droneId);
        }

        int pageSize = limit > 0 ? limit : 20;
        int pageIndex = offset >= 0 ? offset / pageSize : 0;
        Pageable pageable = PageRequest.of(pageIndex, pageSize);

        Page<DroneCommand> pageResult;
        if (status != null && commandType != null) {
            pageResult = droneCommandRepository.findByDroneIdAndStatusAndCommandTypeOrderByIssuedAtDesc(droneId, status, commandType, pageable);
        } else if (status != null) {
            pageResult = droneCommandRepository.findByDroneIdAndStatusOrderByIssuedAtDesc(droneId, status, pageable);
        } else if (commandType != null) {
            pageResult = droneCommandRepository.findByDroneIdAndCommandTypeOrderByIssuedAtDesc(droneId, commandType, pageable);
        } else {
            pageResult = droneCommandRepository.findByDroneIdOrderByIssuedAtDesc(droneId, pageable);
        }

        List<DroneCommandVm> items = droneCommandMapper.toVmList(pageResult.getContent());
        return DroneCommandListVm.of(items, pageResult.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public DroneCommandVm getCommandById(String droneId, String commandId) {
        DroneCommand cmd = droneCommandRepository.findByIdAndDroneId(commandId, droneId)
                .orElseThrow(() -> new NotFoundException("COMMAND_NOT_FOUND", commandId));
        return droneCommandMapper.toVm(cmd);
    }

    @Override
    @Transactional
    public DroneCommandVm cancelCommand(String droneId, String commandId) {
        DroneCommand cmd = droneCommandRepository.findByIdAndDroneId(commandId, droneId)
                .orElseThrow(() -> new NotFoundException("COMMAND_NOT_FOUND", commandId));

        if (cmd.getStatus() != CommandStatus.PENDING && cmd.getStatus() != CommandStatus.SENT) {
            throw new BadRequestException("CANNOT_CANCEL_EXECUTING_COMMAND",
                    "Cannot cancel command that is already executing or completed");
        }

        cmd.setStatus(CommandStatus.CANCELLED);
        cmd.setCompletedAt(Instant.now());
        DroneCommand saved = droneCommandRepository.save(cmd);
        log.info("Command {} for drone {} has been cancelled by operator", commandId, droneId);
        return droneCommandMapper.toVm(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DroneCommandVm> getActiveCommands(String droneId) {
        if (!droneRepository.existsById(droneId)) {
            throw new NotFoundException(MessageCode.DRONE_NOT_FOUND, droneId);
        }

        List<CommandStatus> activeStatuses = List.of(
                CommandStatus.PENDING,
                CommandStatus.SENT,
                CommandStatus.ACKNOWLEDGED,
                CommandStatus.EXECUTING
        );

        List<DroneCommand> commands = droneCommandRepository.findByDroneIdAndStatusInOrderByIssuedAtDesc(droneId, activeStatuses);
        return droneCommandMapper.toVmList(commands);
    }

    private int getPriorityForCommand(CommandType commandType) {
        if (commandType == null) return 2;
        return switch (commandType) {
            case EMERGENCY_STOP, LAND -> 0;
            case RTL, HOVER, PAUSE -> 1;
            case TAKEOFF, GOTO, SET_ALTITUDE, RESUME -> 2;
            case UPDATE_MISSION, SET_HOME, CONFIGURE -> 3;
        };
    }

    private int getTimeoutForPriority(int priority) {
        return switch (priority) {
            case 0 -> 500;
            case 1 -> 1000;
            case 2 -> 2000;
            default -> 5000;
        };
    }

    private int getMaxRetriesForPriority(int priority) {
        return switch (priority) {
            case 0 -> 3;
            case 1, 2 -> 2;
            default -> 1;
        };
    }

    private long getAckDelay(CommandType commandType) {
        if (commandType == CommandType.EMERGENCY_STOP) return 100;
        return 300;
    }

    private long getExecuteDelay(CommandType commandType) {
        if (commandType == CommandType.EMERGENCY_STOP) return 200;
        return 800;
    }

    private long getCompleteDelay(CommandType commandType) {
        if (commandType == CommandType.EMERGENCY_STOP) return 500;
        return 2000;
    }
}
