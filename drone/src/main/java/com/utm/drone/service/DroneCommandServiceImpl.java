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
import com.utm.drone.viewmodel.command.DroneCommandListVm;
import com.utm.drone.viewmodel.command.DroneCommandPostVm;
import com.utm.drone.viewmodel.command.DroneCommandVm;
import jakarta.annotation.PreDestroy;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class DroneCommandServiceImpl implements DroneCommandService {

    private final DroneRepository droneRepository;
    private final DroneCommandRepository droneCommandRepository;
    private final DroneCommandMapper droneCommandMapper;
    private final ScheduledExecutorService commandScheduler = Executors.newScheduledThreadPool(2,
            Thread.ofVirtual().name("drone-cmd-sim-", 0).factory());

    @Override
    @Transactional
    public DroneCommandVm sendCommand(String droneId, DroneCommandPostVm postVm) {
        Drone drone = droneRepository.findById(droneId)
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", droneId));

        if (postVm.commandType() == CommandType.TAKEOFF
                && (drone.getStatus() == DroneStatus.MAINTENANCE || drone.getStatus() == DroneStatus.OFFLINE)) {
            throw new BadRequestException(MessageCode.DRONE_NOT_AVAILABLE, "registrationNumber",
                    drone.getRegistrationNumber() != null ? drone.getRegistrationNumber() : droneId);
        }

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
                maxRetries);

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

        scheduleSimulationAfterCommit(saved.getId(), saved.getCommandType());

        return droneCommandMapper.toVm(saved);
    }

    private void scheduleSimulationAfterCommit(String commandId, CommandType commandType) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    simulateExecution(commandId, commandType);
                }
            });
        } else {
            simulateExecution(commandId, commandType);
        }
    }

    private void simulateExecution(String commandId, CommandType commandType) {
        long ackDelay = Math.min(500, getAckDelay(commandType));
        long execDelay = Math.min(1000, getExecuteDelay(commandType));
        long completeDelay = Math.min(2000, getCompleteDelay(commandType));

        commandScheduler.schedule(() -> {
            try {
                boolean acked = advanceCommandStatus(commandId, CommandStatus.ACKNOWLEDGED);
                if (!acked) {
                    return;
                }
                commandScheduler.schedule(() -> {
                    try {
                        boolean executing = advanceCommandStatus(commandId, CommandStatus.EXECUTING);
                        if (!executing) {
                            return;
                        }
                        commandScheduler.schedule(() -> {
                            try {
                                advanceCommandStatus(commandId, CommandStatus.COMPLETED);
                            } catch (Exception e) {
                                log.error("Error completing simulated command {}: {}", commandId, e.getMessage());
                            }
                        }, completeDelay, TimeUnit.MILLISECONDS);
                    } catch (Exception e) {
                        log.error("Error executing simulated command {}: {}", commandId, e.getMessage());
                    }
                }, execDelay, TimeUnit.MILLISECONDS);
            } catch (Exception e) {
                log.error("Error acknowledging simulated command {}: {}", commandId, e.getMessage());
            }
        }, ackDelay, TimeUnit.MILLISECONDS);
    }

    private boolean advanceCommandStatus(String commandId, CommandStatus targetStatus) {
        return droneCommandRepository.findById(commandId).map(cmd -> {
            if (targetStatus == CommandStatus.ACKNOWLEDGED
                    && (cmd.getStatus() == CommandStatus.PENDING || cmd.getStatus() == CommandStatus.SENT)) {
                cmd.setStatus(CommandStatus.ACKNOWLEDGED);
                cmd.setAcknowledgedAt(Instant.now());
                droneCommandRepository.save(cmd);
                return true;
            }
            if (targetStatus == CommandStatus.EXECUTING && cmd.getStatus() == CommandStatus.ACKNOWLEDGED) {
                cmd.setStatus(CommandStatus.EXECUTING);
                droneCommandRepository.save(cmd);
                return true;
            }
            if (targetStatus == CommandStatus.COMPLETED && cmd.getStatus() == CommandStatus.EXECUTING) {
                cmd.setStatus(CommandStatus.COMPLETED);
                cmd.setCompletedAt(Instant.now());
                droneCommandRepository.save(cmd);
                if (cmd.getCommandType() == CommandType.LAND || cmd.getCommandType() == CommandType.RTL) {
                    droneRepository.findById(cmd.getDroneId()).ifPresent(drone -> {
                        if (drone.getStatus() == DroneStatus.IN_FLIGHT) {
                            drone.setStatus(DroneStatus.AVAILABLE);
                            droneRepository.save(drone);
                        }
                    });
                }
                log.info("Command {} ({}) completed successfully", cmd.getId(), cmd.getCommandType());
                return true;
            }
            return false;
        }).orElse(false);
    }

    @PreDestroy
    public void destroy() {
        commandScheduler.shutdownNow();
    }

    @Override
    @Transactional(readOnly = true)
    public DroneCommandListVm getCommands(String droneId, CommandStatus status, CommandType commandType, int limit,
            int offset) {
        if (!droneRepository.existsById(droneId)) {
            throw new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", droneId);
        }

        int pageSize = limit > 0 ? limit : 20;
        int pageIndex = Math.max(0, offset) / pageSize;
        Pageable pageable = PageRequest.of(pageIndex, pageSize, Sort.by(Sort.Direction.DESC, "issuedAt"));

        Specification<DroneCommand> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("droneId"), droneId));
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (commandType != null) {
                predicates.add(cb.equal(root.get("commandType"), commandType));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<DroneCommand> pageResult = droneCommandRepository.findAll(spec, pageable);
        List<DroneCommandVm> items = droneCommandMapper.toVmList(pageResult.getContent());
        return DroneCommandListVm.of(items, pageResult.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public DroneCommandVm getCommandById(String droneId, String commandId) {
        DroneCommand cmd = droneCommandRepository.findByIdAndDroneId(commandId, droneId)
                .orElseThrow(() -> new NotFoundException(MessageCode.COMMAND_NOT_FOUND, "id", commandId));
        return droneCommandMapper.toVm(cmd);
    }

    @Override
    @Transactional
    public DroneCommandVm cancelCommand(String droneId, String commandId) {
        DroneCommand cmd = droneCommandRepository.findByIdAndDroneId(commandId, droneId)
                .orElseThrow(() -> new NotFoundException(MessageCode.COMMAND_NOT_FOUND, "id", commandId));

        if (cmd.getStatus() != CommandStatus.PENDING && cmd.getStatus() != CommandStatus.SENT) {
            throw new BadRequestException(MessageCode.CANNOT_CANCEL_EXECUTING_COMMAND,
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
            throw new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", droneId);
        }

        List<CommandStatus> activeStatuses = List.of(
                CommandStatus.PENDING,
                CommandStatus.SENT,
                CommandStatus.ACKNOWLEDGED,
                CommandStatus.EXECUTING);

        List<DroneCommand> commands = droneCommandRepository.findByDroneIdAndStatusInOrderByIssuedAtDesc(droneId,
                activeStatuses);
        return droneCommandMapper.toVmList(commands);
    }

    private int getPriorityForCommand(CommandType commandType) {
        if (commandType == null)
            return 2;
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
        if (commandType == CommandType.EMERGENCY_STOP)
            return 100;
        return 300;
    }

    private long getExecuteDelay(CommandType commandType) {
        if (commandType == CommandType.EMERGENCY_STOP)
            return 200;
        return 800;
    }

    private long getCompleteDelay(CommandType commandType) {
        if (commandType == CommandType.EMERGENCY_STOP)
            return 500;
        return 2000;
    }
}
