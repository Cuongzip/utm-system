package com.utm.mission.service;

import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.mission.mapper.MissionMapper;
import com.utm.mission.mapper.WaypointMapper;
import com.utm.mission.model.Mission;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.MissionScheduleType;
import com.utm.mission.model.enumeration.MissionStatus;
import com.utm.mission.repository.MissionRepository;
import com.utm.mission.repository.WaypointRepository;
import com.utm.mission.service.client.HubClientService;
import com.utm.mission.viewmodel.client.HubBriefVm;
import com.utm.mission.viewmodel.mission.MissionListVm;
import com.utm.mission.viewmodel.mission.MissionPostVm;
import com.utm.mission.viewmodel.mission.MissionPutVm;
import com.utm.mission.viewmodel.mission.MissionVm;
import com.utm.mission.viewmodel.waypoint.WaypointVm;
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
import org.springframework.data.jpa.domain.Specification;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
@DisplayName("Unit Tests: MissionServiceImpl (Specification-Driven)")
class MissionServiceImplTest {

    @Mock
    private MissionRepository missionRepository;

    @Mock
    private WaypointRepository waypointRepository;

    @Mock
    private MissionMapper missionMapper;

    @Mock
    private WaypointMapper waypointMapper;

    @Mock
    private HubClientService hubClientService;

    @InjectMocks
    private MissionServiceImpl missionService;

    private static final String MISSION_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
    private static final String DEP_HUB_ID = "550e8400-e29b-41d4-a716-446655440000";
    private static final String ARR_HUB_ID = "660e8400-e29b-41d4-a716-446655440001";

    private Mission testMission;
    private HubBriefVm departureHubVm;
    private HubBriefVm arrivalHubVm;

    @BeforeEach
    void setUp() {
        departureHubVm = new HubBriefVm(DEP_HUB_ID, "HUB-DEP", "Departure Hub", 10.7769, 106.7009, null);
        arrivalHubVm = new HubBriefVm(ARR_HUB_ID, "HUB-ARR", "Arrival Hub", 10.7554, 106.6598, null);

        testMission = Mission.builder()
                .id(MISSION_ID)
                .name("Medical Supply Transport")
                .description("Urgent blood delivery")
                .departureHubId(DEP_HUB_ID)
                .arrivalHubId(ARR_HUB_ID)
                .scheduleType(MissionScheduleType.IMMEDIATE)
                .scheduledAt(null)
                .status(MissionStatus.DRAFT)
                .waypoints(new ArrayList<>())
                .build();
    }

    @Test
    @DisplayName("createMission - with valid immediate schedule creates and returns mission")
    void createMission_withValidImmediateSchedule_shouldCreateAndReturnMission() {
        MissionPostVm postVm = new MissionPostVm(
                "Medical Supply Transport",
                "Urgent blood delivery",
                DEP_HUB_ID,
                ARR_HUB_ID,
                MissionScheduleType.IMMEDIATE,
                null
        );

        when(hubClientService.checkHubExists(DEP_HUB_ID)).thenReturn(true);
        when(hubClientService.checkHubExists(ARR_HUB_ID)).thenReturn(true);
        when(missionMapper.toEntity(postVm)).thenReturn(testMission);
        when(missionRepository.save(testMission)).thenReturn(testMission);
        when(hubClientService.getHubById(DEP_HUB_ID)).thenReturn(Optional.of(departureHubVm));
        when(hubClientService.getHubById(ARR_HUB_ID)).thenReturn(Optional.of(arrivalHubVm));

        MissionVm expectedVm = createMissionVm(testMission, 0, 0.0, List.of(), departureHubVm, arrivalHubVm);
        when(missionMapper.toVm(eq(testMission), eq(0), eq(0.0), anyList(), eq(departureHubVm), eq(arrivalHubVm)))
                .thenReturn(expectedVm);

        MissionVm result = missionService.createMission(postVm);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(MISSION_ID);
        assertThat(result.name()).isEqualTo("Medical Supply Transport");
        assertThat(result.status()).isEqualTo(MissionStatus.DRAFT);
        assertThat(result.scheduleType()).isEqualTo(MissionScheduleType.IMMEDIATE);
        assertThat(result.departureHub().code()).isEqualTo("HUB-DEP");
        assertThat(result.arrivalHub().code()).isEqualTo("HUB-ARR");

        verify(missionRepository).save(testMission);
    }

    @Test
    @DisplayName("createMission - with future scheduled time creates mission successfully")
    void createMission_withFutureScheduledTime_shouldCreateMissionSuccessfully() {
        ZonedDateTime futureTime = ZonedDateTime.now().plusDays(1);
        MissionPostVm postVm = new MissionPostVm(
                "Scheduled Inspection Mission",
                "Bridge structural inspection",
                DEP_HUB_ID,
                ARR_HUB_ID,
                MissionScheduleType.SCHEDULED,
                futureTime
        );

        Mission scheduledMission = Mission.builder()
                .id(MISSION_ID)
                .name(postVm.name())
                .description(postVm.description())
                .departureHubId(DEP_HUB_ID)
                .arrivalHubId(ARR_HUB_ID)
                .scheduleType(MissionScheduleType.SCHEDULED)
                .scheduledAt(futureTime)
                .status(MissionStatus.DRAFT)
                .waypoints(new ArrayList<>())
                .build();

        when(hubClientService.checkHubExists(DEP_HUB_ID)).thenReturn(true);
        when(hubClientService.checkHubExists(ARR_HUB_ID)).thenReturn(true);
        when(missionMapper.toEntity(postVm)).thenReturn(scheduledMission);
        when(missionRepository.save(scheduledMission)).thenReturn(scheduledMission);
        when(hubClientService.getHubById(DEP_HUB_ID)).thenReturn(Optional.of(departureHubVm));
        when(hubClientService.getHubById(ARR_HUB_ID)).thenReturn(Optional.of(arrivalHubVm));

        MissionVm expectedVm = createMissionVm(scheduledMission, 0, 0.0, List.of(), departureHubVm, arrivalHubVm);
        when(missionMapper.toVm(eq(scheduledMission), eq(0), eq(0.0), anyList(), eq(departureHubVm), eq(arrivalHubVm)))
                .thenReturn(expectedVm);

        MissionVm result = missionService.createMission(postVm);

        assertThat(result).isNotNull();
        assertThat(result.scheduleType()).isEqualTo(MissionScheduleType.SCHEDULED);
        assertThat(result.scheduledAt()).isEqualTo(futureTime);
    }

    @Test
    @DisplayName("createMission - when departure hub does not exist throws NotFoundException")
    void createMission_whenDepartureHubNotFound_shouldThrowNotFoundException() {
        MissionPostVm postVm = new MissionPostVm(
                "Test Mission", "Desc", "non-existent-dep", ARR_HUB_ID, MissionScheduleType.IMMEDIATE, null
        );
        when(hubClientService.checkHubExists("non-existent-dep")).thenReturn(false);

        assertThatThrownBy(() -> missionService.createMission(postVm))
                .isInstanceOf(NotFoundException.class);

        verify(missionRepository, never()).save(any());
    }

    @Test
    @DisplayName("createMission - when arrival hub does not exist throws NotFoundException")
    void createMission_whenArrivalHubNotFound_shouldThrowNotFoundException() {
        MissionPostVm postVm = new MissionPostVm(
                "Test Mission", "Desc", DEP_HUB_ID, "non-existent-arr", MissionScheduleType.IMMEDIATE, null
        );
        when(hubClientService.checkHubExists(DEP_HUB_ID)).thenReturn(true);
        when(hubClientService.checkHubExists("non-existent-arr")).thenReturn(false);

        assertThatThrownBy(() -> missionService.createMission(postVm))
                .isInstanceOf(NotFoundException.class);

        verify(missionRepository, never()).save(any());
    }

    @Test
    @DisplayName("createMission - when scheduled type has null scheduledAt throws BadRequestException")
    void createMission_whenScheduledAtIsNull_shouldThrowBadRequestException() {
        MissionPostVm postVm = new MissionPostVm(
                "Test Mission", "Desc", DEP_HUB_ID, ARR_HUB_ID, MissionScheduleType.SCHEDULED, null
        );
        when(hubClientService.checkHubExists(DEP_HUB_ID)).thenReturn(true);
        when(hubClientService.checkHubExists(ARR_HUB_ID)).thenReturn(true);

        assertThatThrownBy(() -> missionService.createMission(postVm))
                .isInstanceOf(BadRequestException.class);

        verify(missionRepository, never()).save(any());
    }

    @Test
    @DisplayName("createMission - when scheduledAt is in the past throws BadRequestException")
    void createMission_whenScheduledAtIsInPast_shouldThrowBadRequestException() {
        MissionPostVm postVm = new MissionPostVm(
                "Test Mission", "Desc", DEP_HUB_ID, ARR_HUB_ID, MissionScheduleType.SCHEDULED, ZonedDateTime.now().minusHours(2)
        );
        when(hubClientService.checkHubExists(DEP_HUB_ID)).thenReturn(true);
        when(hubClientService.checkHubExists(ARR_HUB_ID)).thenReturn(true);

        assertThatThrownBy(() -> missionService.createMission(postVm))
                .isInstanceOf(BadRequestException.class);

        verify(missionRepository, never()).save(any());
    }

    @Test
    @DisplayName("getMissions - with filters and pagination returns paginated list with enriched hubs")
    void getMissions_withFiltersAndPagination_shouldReturnPaginatedList() {
        Page<Mission> page = new PageImpl<>(List.of(testMission));
        when(missionRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        when(hubClientService.getHubsByIds(Set.of(DEP_HUB_ID, ARR_HUB_ID)))
                .thenReturn(Map.of(DEP_HUB_ID, departureHubVm, ARR_HUB_ID, arrivalHubVm));
        when(waypointRepository.countByMissionId(MISSION_ID)).thenReturn(3L);

        MissionVm vm = createMissionVm(testMission, 3, null, null, departureHubVm, arrivalHubVm);
        when(missionMapper.toVm(eq(testMission), eq(3), eq(null), eq(null), eq(departureHubVm), eq(arrivalHubVm)))
                .thenReturn(vm);

        MissionListVm result = missionService.getMissions("draft", DEP_HUB_ID, ARR_HUB_ID, "immediate", 10, 0);

        assertThat(result).isNotNull();
        assertThat(result.total()).isEqualTo(1L);
        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0).waypointCount()).isEqualTo(3);
        assertThat(result.items().get(0).departureHub().id()).isEqualTo(DEP_HUB_ID);
    }

    @Test
    @DisplayName("getMissions - with invalid enum strings falls back gracefully without throwing")
    void getMissions_withInvalidEnumStrings_shouldHandleGracefully() {
        Page<Mission> page = new PageImpl<>(List.of());
        when(missionRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);
        when(hubClientService.getHubsByIds(any())).thenReturn(Map.of());

        MissionListVm result = missionService.getMissions("UNKNOWN_STATUS", null, null, "UNKNOWN_SCHEDULE", null, null);

        assertThat(result).isNotNull();
        assertThat(result.total()).isZero();
        assertThat(result.items()).isEmpty();
    }

    @Test
    @DisplayName("getMissionById - when found calculates Haversine distance and returns enriched VM")
    void getMissionById_whenFound_shouldCalculateHaversineDistance() {
        Waypoint w1 = Waypoint.builder()
                .id("wp-1")
                .latitude(10.7769)
                .longitude(106.7009)
                .altitude(50.0)
                .sequence(1)
                .build();
        Waypoint w2 = Waypoint.builder()
                .id("wp-2")
                .latitude(10.7554)
                .longitude(106.6598)
                .altitude(60.0)
                .sequence(2)
                .build();

        testMission.setWaypoints(List.of(w1, w2));

        when(missionRepository.findByIdWithWaypoints(MISSION_ID)).thenReturn(Optional.of(testMission));
        when(hubClientService.getHubById(DEP_HUB_ID)).thenReturn(Optional.of(departureHubVm));
        when(hubClientService.getHubById(ARR_HUB_ID)).thenReturn(Optional.of(arrivalHubVm));

        WaypointVm wVm1 = new WaypointVm("wp-1", MISSION_ID, 1, "WP1", 10.7769, 106.7009, 50.0, null, null, null, null, null, null, null);
        WaypointVm wVm2 = new WaypointVm("wp-2", MISSION_ID, 2, "WP2", 10.7554, 106.6598, 60.0, null, null, null, null, null, null, null);
        when(waypointMapper.toVmList(testMission.getWaypoints())).thenReturn(List.of(wVm1, wVm2));

        MissionVm vm = createMissionVm(testMission, 2, 5100.25, List.of(wVm1, wVm2), departureHubVm, arrivalHubVm);
        when(missionMapper.toVm(eq(testMission), eq(2), anyDouble(), anyList(), eq(departureHubVm), eq(arrivalHubVm)))
                .thenReturn(vm);

        MissionVm result = missionService.getMissionById(MISSION_ID);

        assertThat(result).isNotNull();
        assertThat(result.id()).isEqualTo(MISSION_ID);
        assertThat(result.waypointCount()).isEqualTo(2);
        assertThat(result.estimatedDistanceMeters()).isGreaterThan(0.0);
    }

    @Test
    @DisplayName("getMissionById - when mission not found throws NotFoundException")
    void getMissionById_whenNotFound_shouldThrowNotFoundException() {
        when(missionRepository.findByIdWithWaypoints("non-existent")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> missionService.getMissionById("non-existent"))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("updateMission - when valid draft mission updates and recalculates distance")
    void updateMission_whenValidDraftMission_shouldUpdateSuccessfully() {
        MissionPutVm putVm = new MissionPutVm(
                "Updated Mission Name",
                "Updated Description",
                null,
                null,
                null,
                null
        );

        when(missionRepository.findByIdWithWaypoints(MISSION_ID)).thenReturn(Optional.of(testMission));
        when(missionRepository.save(testMission)).thenReturn(testMission);
        when(hubClientService.getHubById(DEP_HUB_ID)).thenReturn(Optional.of(departureHubVm));
        when(hubClientService.getHubById(ARR_HUB_ID)).thenReturn(Optional.of(arrivalHubVm));

        MissionVm vm = createMissionVm(testMission, 0, 0.0, List.of(), departureHubVm, arrivalHubVm);
        when(missionMapper.toVm(eq(testMission), anyInt(), anyDouble(), anyList(), eq(departureHubVm), eq(arrivalHubVm)))
                .thenReturn(vm);

        MissionVm result = missionService.updateMission(MISSION_ID, putVm);

        assertThat(result).isNotNull();
        verify(missionMapper).updateEntityFromVm(putVm, testMission);
        verify(missionRepository).save(testMission);
    }

    @Test
    @DisplayName("updateMission - when mission is executing throws BadRequestException")
    void updateMission_whenMissionIsExecuting_shouldThrowBadRequestException() {
        testMission.setStatus(MissionStatus.EXECUTING);
        when(missionRepository.findByIdWithWaypoints(MISSION_ID)).thenReturn(Optional.of(testMission));

        MissionPutVm putVm = new MissionPutVm("New Name", null, null, null, null, null);

        assertThatThrownBy(() -> missionService.updateMission(MISSION_ID, putVm))
                .isInstanceOf(BadRequestException.class);

        verify(missionRepository, never()).save(any());
    }

    @Test
    @DisplayName("updateMission - when mission is not in draft status throws BadRequestException")
    void updateMission_whenMissionNotInDraft_shouldThrowBadRequestException() {
        testMission.setStatus(MissionStatus.SCHEDULED);
        when(missionRepository.findByIdWithWaypoints(MISSION_ID)).thenReturn(Optional.of(testMission));

        MissionPutVm putVm = new MissionPutVm("New Name", null, null, null, null, null);

        assertThatThrownBy(() -> missionService.updateMission(MISSION_ID, putVm))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("updateMission - when changed departure hub does not exist throws NotFoundException")
    void updateMission_whenNewDepartureHubNotFound_shouldThrowNotFoundException() {
        when(missionRepository.findByIdWithWaypoints(MISSION_ID)).thenReturn(Optional.of(testMission));
        when(hubClientService.checkHubExists("new-dep-hub")).thenReturn(false);

        MissionPutVm putVm = new MissionPutVm(null, null, "new-dep-hub", null, null, null);

        assertThatThrownBy(() -> missionService.updateMission(MISSION_ID, putVm))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("updateMission - when changed arrival hub does not exist throws NotFoundException")
    void updateMission_whenNewArrivalHubNotFound_shouldThrowNotFoundException() {
        when(missionRepository.findByIdWithWaypoints(MISSION_ID)).thenReturn(Optional.of(testMission));
        when(hubClientService.checkHubExists("new-arr-hub")).thenReturn(false);

        MissionPutVm putVm = new MissionPutVm(null, null, null, "new-arr-hub", null, null);

        assertThatThrownBy(() -> missionService.updateMission(MISSION_ID, putVm))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("updateMission - when scheduleType is scheduled and scheduledAt is in past throws BadRequestException")
    void updateMission_whenScheduledAtInPast_shouldThrowBadRequestException() {
        when(missionRepository.findByIdWithWaypoints(MISSION_ID)).thenReturn(Optional.of(testMission));

        MissionPutVm putVm = new MissionPutVm(
                null, null, null, null,
                MissionScheduleType.SCHEDULED,
                ZonedDateTime.now().minusDays(1)
        );

        assertThatThrownBy(() -> missionService.updateMission(MISSION_ID, putVm))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("deleteMission - when mission exists and is not executing deletes successfully")
    void deleteMission_whenDraftMission_shouldDeleteSuccessfully() {
        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(testMission));

        missionService.deleteMission(MISSION_ID);

        verify(missionRepository).delete(testMission);
    }

    @Test
    @DisplayName("deleteMission - when mission is executing throws BadRequestException")
    void deleteMission_whenExecuting_shouldThrowBadRequestException() {
        testMission.setStatus(MissionStatus.EXECUTING);
        when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(testMission));

        assertThatThrownBy(() -> missionService.deleteMission(MISSION_ID))
                .isInstanceOf(BadRequestException.class);

        verify(missionRepository, never()).delete(any(Mission.class));
    }

    @Test
    @DisplayName("deleteMission - when mission not found throws NotFoundException")
    void deleteMission_whenNotFound_shouldThrowNotFoundException() {
        when(missionRepository.findById("unknown-id")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> missionService.deleteMission("unknown-id"))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("duplicateMission - clones mission and copies all waypoints as draft")
    void duplicateMission_whenValid_shouldCloneMissionAndWaypoints() {
        Waypoint origWp = Waypoint.builder()
                .id("wp-orig")
                .sequence(1)
                .name("Orig WP")
                .latitude(10.77)
                .longitude(106.70)
                .altitude(50.0)
                .actions(new HashMap<>(Map.of("type", "hover")))
                .conditions(new HashMap<>(Map.of("speed", 10)))
                .build();
        testMission.setWaypoints(new ArrayList<>(List.of(origWp)));

        String copyId = "copy-id-uuid";
        Mission copyMission = Mission.builder()
                .id(copyId)
                .name("Medical Supply Transport (Bản sao)")
                .departureHubId(DEP_HUB_ID)
                .arrivalHubId(ARR_HUB_ID)
                .scheduleType(MissionScheduleType.IMMEDIATE)
                .status(MissionStatus.DRAFT)
                .waypoints(new ArrayList<>())
                .build();

        Waypoint clonedWp = Waypoint.builder()
                .sequence(1)
                .name("Orig WP")
                .latitude(10.77)
                .longitude(106.70)
                .altitude(50.0)
                .build();

        when(missionRepository.findByIdWithWaypoints(MISSION_ID)).thenReturn(Optional.of(testMission));
        when(missionMapper.cloneEntity(testMission)).thenReturn(copyMission);
        when(missionRepository.save(copyMission)).thenReturn(copyMission);
        when(waypointMapper.cloneEntity(origWp)).thenReturn(clonedWp);

        when(missionRepository.findByIdWithWaypoints(copyId)).thenReturn(Optional.of(copyMission));
        when(hubClientService.getHubById(DEP_HUB_ID)).thenReturn(Optional.of(departureHubVm));
        when(hubClientService.getHubById(ARR_HUB_ID)).thenReturn(Optional.of(arrivalHubVm));

        MissionVm copyVm = createMissionVm(copyMission, 1, 0.0, List.of(), departureHubVm, arrivalHubVm);
        when(missionMapper.toVm(eq(copyMission), anyInt(), anyDouble(), anyList(), eq(departureHubVm), eq(arrivalHubVm)))
                .thenReturn(copyVm);

        MissionVm result = missionService.duplicateMission(MISSION_ID);

        assertThat(result).isNotNull();
        assertThat(result.name()).contains("(Bản sao)");
        verify(missionRepository, times(2)).save(copyMission);
    }

    @Test
    @DisplayName("duplicateMission - when source mission not found throws NotFoundException")
    void duplicateMission_whenNotFound_shouldThrowNotFoundException() {
        when(missionRepository.findByIdWithWaypoints("unknown-id")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> missionService.duplicateMission("unknown-id"))
                .isInstanceOf(NotFoundException.class);
    }

    private MissionVm createMissionVm(Mission mission, Integer waypointCount, Double estimatedDistance,
                                      List<WaypointVm> waypoints, HubBriefVm depHub, HubBriefVm arrHub) {
        return new MissionVm(
                mission.getId(),
                mission.getName(),
                mission.getDescription(),
                mission.getDepartureHubId(),
                mission.getArrivalHubId(),
                mission.getScheduleType(),
                mission.getScheduledAt(),
                mission.getStatus(),
                waypointCount,
                estimatedDistance,
                waypoints,
                depHub,
                arrHub,
                mission.getCreatedOn(),
                mission.getCreatedBy(),
                mission.getLastModifiedOn(),
                mission.getLastModifiedBy()
        );
    }
}
