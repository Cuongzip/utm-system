package com.utm.mission.service;

import com.utm.mission.model.Mission;
import com.utm.mission.model.enumeration.MissionScheduleType;
import com.utm.mission.model.enumeration.MissionStatus;
import com.utm.mission.repository.MissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.ZonedDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class ScheduledMissionDispatcher {

    private static final int DEFAULT_DISPATCH_GRACE_MINUTES = 30;

    private final MissionRepository missionRepository;
    private final MissionExecutionServiceImpl missionExecutionService;

    @Scheduled(fixedDelay = 30000)
    public void dispatchDueMissions() {
        ZonedDateTime now = ZonedDateTime.now();
        List<Mission> dueMissions = missionRepository.findByStatusAndScheduleTypeInAndScheduledAtLessThanEqual(
                MissionStatus.SCHEDULED,
                List.of(MissionScheduleType.SCHEDULED, MissionScheduleType.RECURRING),
                now);

        for (Mission mission : dueMissions) {
            int graceMinutes = mission.getDispatchGraceMinutes() != null && mission.getDispatchGraceMinutes() > 0
                    ? mission.getDispatchGraceMinutes()
                    : DEFAULT_DISPATCH_GRACE_MINUTES;
            ZonedDateTime deadline = mission.getScheduledAt() != null
                    ? mission.getScheduledAt().plusMinutes(graceMinutes)
                    : now.plusMinutes(graceMinutes);

            if (now.isAfter(deadline)) {
                mission.setStatus(MissionStatus.FAILED);
                missionRepository.save(mission);
                log.warn("Scheduled mission {} ({}) expired past dispatch grace window ({}m); marked FAILED",
                        mission.getCode(), mission.getId(), graceMinutes);
                continue;
            }

            try {
                String pilotId = (mission.getPilotId() != null && !mission.getPilotId().isBlank())
                        ? mission.getPilotId().trim()
                        : (mission.getCreatedBy() != null && !mission.getCreatedBy().isBlank()
                                ? mission.getCreatedBy()
                                : "SYSTEM_SCHEDULER");
                missionExecutionService.executeScheduledMission(mission.getId(), mission.getDroneId(), pilotId);
                log.info("Auto-dispatched scheduled mission {} ({})", mission.getCode(), mission.getId());
            } catch (Exception ex) {
                log.error("Failed to auto-dispatch scheduled mission {} ({}): {}",
                        mission.getCode(), mission.getId(), ex.getMessage());
            }
        }
    }
}
