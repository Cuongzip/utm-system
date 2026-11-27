package com.utm.drone.service;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.commonlibrary.utils.AuthenticationUtils;
import com.utm.drone.kafka.DroneCommandEventPublisher;
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
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class DroneCommandServiceImpl implements DroneCommandService {

    private static final long DEFAULT_UNACKED_COMMAND_TIMEOUT_MS = 15_000L;

    private final DroneRepository droneRepository;
    private final DroneCommandRepository droneCommandRepository;
    private final DroneCommandMapper droneCommandMapper;
    private final DroneCommandEventPublisher commandEventPublisher;
    private final TransactionTemplate transactionTemplate;
    private volatile long unackedCommandTimeoutMs = DEFAULT_UNACKED_COMMAND_TIMEOUT_MS;
    private final ScheduledExecutorService commandScheduler = Executors.newScheduledThreadPool(2,
            Thread.ofVirtual().name("drone-cmd-sim-", 0).factory());

    public DroneCommandServiceImpl(
            DroneRepository droneRepository,
            DroneCommandRepository droneCommandRepository,
            DroneCommandMapper droneCommandMapper,
            DroneCommandEventPublisher commandEventPublisher) {
        this(droneRepository, droneCommandRepository, droneCommandMapper, commandEventPublisher, null);
    }

    @Autowired
    public DroneCommandServiceImpl(
            DroneRepository droneRepository,
            DroneCommandRepository droneCommandRepository,
            DroneCommandMapper droneCommandMapper,
            @Autowired(required = false) DroneCommandEventPublisher commandEventPublisher,
            @Autowired(required = false) TransactionTemplate transactionTemplate) {
        this.droneRepository = droneRepository;
        this.droneCommandRepository = droneCommandRepository;
        this.droneCommandMapper = droneCommandMapper;
        this.commandEventPublisher = commandEventPublisher;
        this.transactionTemplate = transactionTemplate;
    }

    @Override
    @Transactional
    public DroneCommandVm sendCommand(String droneId, DroneCommandPostVm postVm) {
        Drone drone = droneRepository.findById(droneId)
                .orElseThrow(() -> new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", droneId));

        if (postVm.commandType() == CommandType.TAKEOFF
                && (drone.getStatus() == DroneStatus.MAINTENANCE
                        || drone.getStatus() == DroneStatus.OFFLINE
                        || drone.getStatus() == DroneStatus.RETIRED)) {
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

        if (priority <= 1) {
            List<DroneCommand> pendingCommands = droneCommandRepository.findByDroneIdAndStatusInOrderByIssuedAtDesc(
                    droneId, List.of(CommandStatus.PENDING, CommandStatus.SENT));
            if (pendingCommands != null && !pendingCommands.isEmpty()) {
                List<DroneCommand> preempted = new ArrayList<>();
                ZonedDateTime now = ZonedDateTime.now();
                for (DroneCommand existing : pendingCommands) {
                    if (existing != null
                            && !Objects.equals(existing.getId(), saved.getId())
                            && existing.getPriority() != null
                            && existing.getPriority() > priority) {
                        existing.setStatus(CommandStatus.CANCELLED);
                        existing.setCompletedAt(now);
                        preempted.add(existing);
                    }
                }
                if (!preempted.isEmpty()) {
                    droneCommandRepository.saveAll(preempted);
                    log.info("Preempted {} lower-priority command(s) for drone {} due to priority-{} command {}",
                            preempted.size(), droneId, priority, saved.getCommandType());
                }
            }
        }

        if (postVm.commandType() == CommandType.EMERGENCY_STOP) {
            drone.setStatus(DroneStatus.MAINTENANCE);
            droneRepository.save(drone);
            log.warn("Emergency stop command issued for drone {}, setting status to MAINTENANCE", droneId);
        } else if (postVm.commandType() == CommandType.TAKEOFF) {
            drone.setStatus(DroneStatus.IN_FLIGHT);
            drone.setCurrentHubId(null);
            droneRepository.save(drone);
        }

        if (commandEventPublisher != null) {
            commandEventPublisher.publishAfterCommit(saved);
        }

        scheduleLifecycleAfterCommit(saved.getId(), saved.getCommandType());

        return droneCommandMapper.toVm(saved);
    }

    void setUnackedCommandTimeoutMs(long timeoutMs) {
        this.unackedCommandTimeoutMs = Math.max(50L, timeoutMs);
    }

    private void scheduleLifecycleAfterCommit(String commandId, CommandType commandType) {
        Runnable task = () -> {
            if (isConfigOnlyCommand(commandType)) {
                simulateConfigCommandExecution(commandId);
            } else {
                scheduleUnackedWatchdog(commandId);
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    task.run();
                }
            });
        } else {
            task.run();
        }
    }

    private boolean isConfigOnlyCommand(CommandType commandType) {
        return commandType == CommandType.UPDATE_MISSION
                || commandType == CommandType.SET_HOME
                || commandType == CommandType.CONFIGURE;
    }

    private void scheduleUnackedWatchdog(String commandId) {
        commandScheduler.schedule(() -> {
            try {
                markFailedIfUnacknowledged(commandId);
            } catch (Exception e) {
                log.error("Error evaluating command ACK timeout for {}: {}", commandId, e.getMessage());
            }
        }, unackedCommandTimeoutMs, TimeUnit.MILLISECONDS);
    }

    void markFailedIfUnacknowledged(String commandId) {
        try {
            droneCommandRepository.findById(commandId).ifPresent(cmd -> {
                if (cmd.getStatus() == CommandStatus.PENDING || cmd.getStatus() == CommandStatus.SENT) {
                    cmd.setStatus(CommandStatus.FAILED);
                    cmd.setCompletedAt(ZonedDateTime.now());
                    cmd.setErrorMessage("No active aircraft or simulation runtime acknowledged command");
                    droneCommandRepository.save(cmd);
                    log.warn("Command {} ({}) timed out without runtime/device ACK", cmd.getId(), cmd.getCommandType());
                }
            });
        } catch (OptimisticLockingFailureException ex) {
            log.debug("Command {} updated concurrently during timeout check: {}", commandId, ex.getMessage());
        }
    }

    private void simulateConfigCommandExecution(String commandId) {
        commandScheduler.schedule(() -> {
            try {
                if (!advanceCommandStatus(commandId, CommandStatus.ACKNOWLEDGED)) {
                    return;
                }
                commandScheduler.schedule(() -> {
                    try {
                        if (!advanceCommandStatus(commandId, CommandStatus.EXECUTING)) {
                            return;
                        }
                        commandScheduler.schedule(() -> {
                            try {
                                advanceCommandStatus(commandId, CommandStatus.COMPLETED);
                            } catch (Exception e) {
                                log.error("Error completing config command {}: {}", commandId, e.getMessage());
                            }
                        }, 500L, TimeUnit.MILLISECONDS);
                    } catch (Exception e) {
                        log.error("Error executing config command {}: {}", commandId, e.getMessage());
                    }
                }, 300L, TimeUnit.MILLISECONDS);
            } catch (Exception e) {
                log.error("Error acknowledging config command {}: {}", commandId, e.getMessage());
            }
        }, 200L, TimeUnit.MILLISECONDS);
    }

    private boolean advanceCommandStatus(String commandId, CommandStatus targetStatus) {
        try {
            return droneCommandRepository.findById(commandId).map(cmd -> {
                if (targetStatus == CommandStatus.ACKNOWLEDGED) {
                    if (cmd.getStatus() == CommandStatus.ACKNOWLEDGED) {
                        return true;
                    }
                    if (cmd.getStatus() == CommandStatus.PENDING || cmd.getStatus() == CommandStatus.SENT) {
                        cmd.setStatus(CommandStatus.ACKNOWLEDGED);
                        if (cmd.getAcknowledgedAt() == null) {
                            cmd.setAcknowledgedAt(ZonedDateTime.now());
                        }
                        droneCommandRepository.save(cmd);
                        return true;
                    }
                    return false;
                }
                if (targetStatus == CommandStatus.EXECUTING && cmd.getStatus() == CommandStatus.ACKNOWLEDGED) {
                    cmd.setStatus(CommandStatus.EXECUTING);
                    droneCommandRepository.save(cmd);
                    return true;
                }
                if (targetStatus == CommandStatus.COMPLETED && cmd.getStatus() == CommandStatus.EXECUTING) {
                    cmd.setStatus(CommandStatus.COMPLETED);
                    cmd.setCompletedAt(ZonedDateTime.now());
                    droneCommandRepository.save(cmd);
                    log.info("Command {} ({}) completed successfully", cmd.getId(), cmd.getCommandType());
                    return true;
                }
                return false;
            }).orElse(false);
        } catch (OptimisticLockingFailureException ex) {
            log.debug("Command {} was updated concurrently while advancing to {}: {}",
                    commandId, targetStatus, ex.getMessage());
            return false;
        }
    }

    @PreDestroy
    public void destroy() {
        commandScheduler.shutdownNow();
    }

    @Override
    @Transactional(readOnly = true)
    public DroneCommandListVm getCommands(String droneId, CommandStatus status, CommandType commandType, int limit,
            int offset) {
        return getCommands(droneId, status, commandType, null, limit, offset);
    }

    @Override
    @Transactional(readOnly = true)
    public DroneCommandListVm getCommands(String droneId, CommandStatus status, CommandType commandType,
            String flightId, int limit, int offset) {
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
            if (flightId != null && !flightId.isBlank()) {
                predicates.add(cb.equal(root.get("flightId"), flightId.trim()));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<DroneCommand> pageResult = droneCommandRepository.findAll(spec, pageable);
        List<DroneCommandVm> items = droneCommandMapper.toVmList(pageResult.getContent());
        return DroneCommandListVm.of(items, pageResult.getTotalElements());
    }

    @Override
    @Transactional(readOnly = true)
    public List<DroneCommandVm> getCommandsByFlightId(String flightId) {
        if (flightId == null || flightId.isBlank()) {
            return List.of();
        }
        return droneCommandMapper.toVmList(droneCommandRepository.findByFlightIdOrderByIssuedAtDesc(flightId.trim()));
    }

    @Override
    @Transactional(readOnly = true)
    public DroneCommandVm getCommandById(String droneId, String commandId) {
        DroneCommand cmd = droneCommandRepository.findByIdAndDroneId(commandId, droneId)
                .orElseThrow(() -> new NotFoundException(MessageCode.COMMAND_NOT_FOUND, "id", commandId));
        return droneCommandMapper.toVm(cmd);
    }

    @Override
    public DroneCommandVm cancelCommand(String droneId, String commandId) {
        OptimisticLockingFailureException lastConflict = null;
        for (int attempt = 1; attempt <= 3; attempt++) {
            try {
                if (transactionTemplate != null) {
                    return transactionTemplate.execute(status -> cancelCommandOnce(droneId, commandId));
                }
                return cancelCommandOnce(droneId, commandId);
            } catch (OptimisticLockingFailureException ex) {
                lastConflict = ex;
                log.warn("Optimistic lock conflict cancelling command {} (attempt {}/3): {}",
                        commandId, attempt, ex.getMessage());
            }
        }
        throw new BadRequestException(MessageCode.CANNOT_CANCEL_EXECUTING_COMMAND,
                "Command state changed concurrently and can no longer be cancelled", lastConflict != null ? lastConflict.getMessage() : "");
    }

    private DroneCommandVm cancelCommandOnce(String droneId, String commandId) {
        DroneCommand cmd = droneCommandRepository.findByIdAndDroneId(commandId, droneId)
                .orElseThrow(() -> new NotFoundException(MessageCode.COMMAND_NOT_FOUND, "id", commandId));

        if (cmd.getStatus() != CommandStatus.PENDING && cmd.getStatus() != CommandStatus.SENT) {
            throw new BadRequestException(MessageCode.CANNOT_CANCEL_EXECUTING_COMMAND,
                    "Cannot cancel command that is already executing or completed");
        }

        cmd.setStatus(CommandStatus.CANCELLED);
        cmd.setCompletedAt(ZonedDateTime.now());
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
}
