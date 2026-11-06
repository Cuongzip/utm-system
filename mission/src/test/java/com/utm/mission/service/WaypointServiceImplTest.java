package com.utm.mission.service;

import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.mission.mapper.WaypointMapper;
import com.utm.mission.model.Mission;
import com.utm.mission.model.Waypoint;
import com.utm.mission.model.enumeration.MissionStatus;
import com.utm.mission.repository.MissionRepository;
import com.utm.mission.repository.WaypointRepository;
import com.utm.mission.service.client.AirspaceClientService;
import com.utm.mission.viewmodel.waypoint.WaypointPostVm;
import com.utm.mission.viewmodel.waypoint.WaypointPutVm;
import com.utm.mission.viewmodel.waypoint.WaypointReorderItemVm;
import com.utm.mission.viewmodel.waypoint.WaypointReorderVm;
import com.utm.mission.viewmodel.waypoint.WaypointVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: WaypointServiceImpl (Specification-Driven)")
class WaypointServiceImplTest {

        @Mock
        private MissionRepository missionRepository;

        @Mock
        private WaypointRepository waypointRepository;

        @Mock
        private WaypointMapper waypointMapper;

        @Mock
        private AirspaceClientService airspaceClientService;

        @InjectMocks
        private WaypointServiceImpl waypointService;

        private static final String MISSION_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
        private static final String WAYPOINT_ID_1 = "wp-1111-uuid";
        private static final String WAYPOINT_ID_2 = "wp-2222-uuid";

        private Mission draftMission;
        private Waypoint waypoint1;
        private Waypoint waypoint2;

        @BeforeEach
        void setUp() {
                draftMission = Mission.builder()
                                .id(MISSION_ID)
                                .name("Delivery Mission")
                                .status(MissionStatus.DRAFT)
                                .waypoints(new ArrayList<>())
                                .build();

                waypoint1 = Waypoint.builder()
                                .id(WAYPOINT_ID_1)
                                .mission(draftMission)
                                .sequence(1)
                                .name("Waypoint 1")
                                .latitude(10.7769)
                                .longitude(106.7009)
                                .altitude(50.0)
                                .actions(Map.of("type", "hover"))
                                .conditions(Map.of("speed", 15))
                                .build();

                waypoint2 = Waypoint.builder()
                                .id(WAYPOINT_ID_2)
                                .mission(draftMission)
                                .sequence(2)
                                .name("Waypoint 2")
                                .latitude(10.7554)
                                .longitude(106.6598)
                                .altitude(60.0)
                                .build();
        }

        @Test
        @DisplayName("addWaypoint - appends waypoint with next sequence and airspace warning check")
        void addWaypoint_whenMissionInDraft_shouldAppendWithNextSequenceAndSafetyWarning() {
                WaypointPostVm postVm = new WaypointPostVm(
                                "Waypoint 1",
                                10.7769,
                                106.7009,
                                50.0,
                                Map.of("type", "hover"),
                                Map.of("speed", 15));

                when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));
                when(waypointRepository.findMaxSequenceByMissionId(MISSION_ID)).thenReturn(0);
                when(airspaceClientService.checkPointSafety(10.7769, 106.7009, 50.0))
                                .thenReturn(Optional.of("Warning: proximity to restricted airspace"));
                when(waypointMapper.toEntity(postVm)).thenReturn(waypoint1);
                when(waypointRepository.save(waypoint1)).thenReturn(waypoint1);

                WaypointVm expectedVm = createWaypointVm(waypoint1, "Warning: proximity to restricted airspace");
                when(waypointMapper.toVm(waypoint1, "Warning: proximity to restricted airspace"))
                                .thenReturn(expectedVm);

                WaypointVm result = waypointService.addWaypoint(MISSION_ID, postVm);

                assertThat(result).isNotNull();
                assertThat(result.id()).isEqualTo(WAYPOINT_ID_1);
                assertThat(result.sequence()).isEqualTo(1);
                assertThat(result.warning()).isEqualTo("Warning: proximity to restricted airspace");
                assertThat(result.latitude()).isEqualTo(10.7769);
                assertThat(result.longitude()).isEqualTo(106.7009);

                verify(waypointRepository).save(waypoint1);
        }

        @Test
        @DisplayName("addWaypoint - when mission is not in draft status throws BadRequestException")
        void addWaypoint_whenMissionNotInDraft_shouldThrowBadRequestException() {
                draftMission.setStatus(MissionStatus.EXECUTING);
                when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));

                WaypointPostVm postVm = new WaypointPostVm("WP", 10.0, 106.0, 50.0, null, null);

                assertThatThrownBy(() -> waypointService.addWaypoint(MISSION_ID, postVm))
                                .isInstanceOf(BadRequestException.class);

                verify(waypointRepository, never()).save(any());
        }

        @Test
        @DisplayName("addWaypoint - when mission not found throws NotFoundException")
        void addWaypoint_whenMissionNotFound_shouldThrowNotFoundException() {
                when(missionRepository.findById("unknown-mission")).thenReturn(Optional.empty());

                WaypointPostVm postVm = new WaypointPostVm("WP", 10.0, 106.0, 50.0, null, null);

                assertThatThrownBy(() -> waypointService.addWaypoint("unknown-mission", postVm))
                                .isInstanceOf(NotFoundException.class);
        }

        @Test
        @DisplayName("getWaypoints - when mission exists returns ordered waypoints list")
        void getWaypoints_whenMissionExists_shouldReturnOrderedList() {
                when(missionRepository.existsById(MISSION_ID)).thenReturn(true);
                when(waypointRepository.findByMissionIdOrderBySequenceAsc(MISSION_ID))
                                .thenReturn(List.of(waypoint1, waypoint2));

                WaypointVm vm1 = createWaypointVm(waypoint1, null);
                WaypointVm vm2 = createWaypointVm(waypoint2, null);
                when(waypointMapper.toVmList(List.of(waypoint1, waypoint2))).thenReturn(List.of(vm1, vm2));

                List<WaypointVm> result = waypointService.getWaypoints(MISSION_ID);

                assertThat(result).hasSize(2);
                assertThat(result.get(0).sequence()).isEqualTo(1);
                assertThat(result.get(1).sequence()).isEqualTo(2);
        }

        @Test
        @DisplayName("getWaypoints - when mission not found throws NotFoundException")
        void getWaypoints_whenMissionNotFound_shouldThrowNotFoundException() {
                when(missionRepository.existsById("unknown-mission")).thenReturn(false);

                assertThatThrownBy(() -> waypointService.getWaypoints("unknown-mission"))
                                .isInstanceOf(NotFoundException.class);
        }

        @Test
        @DisplayName("updateWaypoint - updates waypoint fields and re-evaluates airspace safety")
        void updateWaypoint_whenValidInDraftMission_shouldUpdateAndCheckSafety() {
                WaypointPutVm putVm = new WaypointPutVm("Updated WP", 10.7780, 106.7020, 65.0, null, null);

                when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));
                when(waypointRepository.findByIdAndMissionId(WAYPOINT_ID_1, MISSION_ID))
                                .thenReturn(Optional.of(waypoint1));
                when(airspaceClientService.checkPointSafety(anyDouble(), anyDouble(), anyDouble()))
                                .thenReturn(Optional.empty());
                when(waypointRepository.save(waypoint1)).thenReturn(waypoint1);

                WaypointVm expectedVm = createWaypointVm(waypoint1, null);
                when(waypointMapper.toVm(waypoint1, null)).thenReturn(expectedVm);

                WaypointVm result = waypointService.updateWaypoint(MISSION_ID, WAYPOINT_ID_1, putVm);

                assertThat(result).isNotNull();
                verify(waypointMapper).updateEntityFromVm(putVm, waypoint1);
                verify(waypointRepository).save(waypoint1);
        }

        @Test
        @DisplayName("updateWaypoint - when waypoint not found throws NotFoundException")
        void updateWaypoint_whenWaypointNotFound_shouldThrowNotFoundException() {
                when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));
                when(waypointRepository.findByIdAndMissionId("unknown-wp", MISSION_ID))
                                .thenReturn(Optional.empty());

                WaypointPutVm putVm = new WaypointPutVm("Updated", 10.0, 106.0, 50.0, null, null);

                assertThatThrownBy(() -> waypointService.updateWaypoint(MISSION_ID, "unknown-wp", putVm))
                                .isInstanceOf(NotFoundException.class);
        }

        @Test
        @DisplayName("updateWaypoint - when mission is not in draft status throws BadRequestException")
        void updateWaypoint_whenMissionNotInDraft_shouldThrowBadRequestException() {
                draftMission.setStatus(MissionStatus.COMPLETED);
                when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));

                WaypointPutVm putVm = new WaypointPutVm("Updated", 10.0, 106.0, 50.0, null, null);

                assertThatThrownBy(() -> waypointService.updateWaypoint(MISSION_ID, WAYPOINT_ID_1, putVm))
                                .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("deleteWaypoint - deletes target waypoint and re-indexes remaining sequences sequentially")
        void deleteWaypoint_whenValid_shouldDeleteAndReindexSequences() {
                when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));
                when(waypointRepository.findByIdAndMissionId(WAYPOINT_ID_1, MISSION_ID))
                                .thenReturn(Optional.of(waypoint1));
                when(waypointRepository.findByMissionIdOrderBySequenceAsc(MISSION_ID))
                                .thenReturn(List.of(waypoint2));

                waypointService.deleteWaypoint(MISSION_ID, WAYPOINT_ID_1);

                verify(waypointRepository).delete(waypoint1);
                assertThat(waypoint2.getSequence()).isEqualTo(1);
                verify(waypointRepository).saveAll(List.of(waypoint2));
        }

        @Test
        @DisplayName("deleteWaypoint - when waypoint not found throws NotFoundException")
        void deleteWaypoint_whenWaypointNotFound_shouldThrowNotFoundException() {
                when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));
                when(waypointRepository.findByIdAndMissionId("unknown-wp", MISSION_ID))
                                .thenReturn(Optional.empty());

                assertThatThrownBy(() -> waypointService.deleteWaypoint(MISSION_ID, "unknown-wp"))
                                .isInstanceOf(NotFoundException.class);

                verify(waypointRepository, never()).delete(any(Waypoint.class));
        }

        @Test
        @DisplayName("reorderWaypoints - when payload is valid updates sequence numbers atomically")
        void reorderWaypoints_whenValid_shouldUpdateSequencesAndReturnSortedList() {
                WaypointReorderVm reorderVm = new WaypointReorderVm(List.of(
                                new WaypointReorderItemVm(WAYPOINT_ID_2, 1),
                                new WaypointReorderItemVm(WAYPOINT_ID_1, 2)));

                List<Waypoint> existing = List.of(waypoint1, waypoint2);
                when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));
                when(waypointRepository.findByMissionIdOrderBySequenceAsc(MISSION_ID))
                                .thenReturn(existing)
                                .thenReturn(List.of(waypoint2, waypoint1));

                WaypointVm vm1 = createWaypointVm(waypoint2, null);
                WaypointVm vm2 = createWaypointVm(waypoint1, null);
                when(waypointMapper.toVmList(any())).thenReturn(List.of(vm1, vm2));

                List<WaypointVm> result = waypointService.reorderWaypoints(MISSION_ID, reorderVm);

                assertThat(result).hasSize(2);
                assertThat(waypoint2.getSequence()).isEqualTo(1);
                assertThat(waypoint1.getSequence()).isEqualTo(2);
                verify(waypointRepository).saveAll(existing);
        }

        @Test
        @DisplayName("reorderWaypoints - when item count does not match existing waypoints throws BadRequestException")
        void reorderWaypoints_whenItemCountMismatch_shouldThrowBadRequestException() {
                WaypointReorderVm reorderVm = new WaypointReorderVm(List.of(
                                new WaypointReorderItemVm(WAYPOINT_ID_1, 1)));

                when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));
                when(waypointRepository.findByMissionIdOrderBySequenceAsc(MISSION_ID))
                                .thenReturn(List.of(waypoint1, waypoint2));

                assertThatThrownBy(() -> waypointService.reorderWaypoints(MISSION_ID, reorderVm))
                                .isInstanceOf(BadRequestException.class);

                verify(waypointRepository, never()).saveAll(any());
        }

        @Test
        @DisplayName("reorderWaypoints - when payload contains unknown waypoint ID throws BadRequestException")
        void reorderWaypoints_whenUnknownWaypointId_shouldThrowBadRequestException() {
                WaypointReorderVm reorderVm = new WaypointReorderVm(List.of(
                                new WaypointReorderItemVm(WAYPOINT_ID_1, 1),
                                new WaypointReorderItemVm("foreign-wp-id", 2)));

                when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));
                when(waypointRepository.findByMissionIdOrderBySequenceAsc(MISSION_ID))
                                .thenReturn(List.of(waypoint1, waypoint2));

                assertThatThrownBy(() -> waypointService.reorderWaypoints(MISSION_ID, reorderVm))
                                .isInstanceOf(BadRequestException.class);
        }

        @Test
        @DisplayName("reorderWaypoints - when duplicate sequences are assigned throws BadRequestException")
        void reorderWaypoints_whenDuplicateSequenceProvided_shouldThrowBadRequestException() {
                WaypointReorderVm reorderVm = new WaypointReorderVm(List.of(
                                new WaypointReorderItemVm(WAYPOINT_ID_1, 1),
                                new WaypointReorderItemVm(WAYPOINT_ID_2, 1)));

                when(missionRepository.findById(MISSION_ID)).thenReturn(Optional.of(draftMission));
                when(waypointRepository.findByMissionIdOrderBySequenceAsc(MISSION_ID))
                                .thenReturn(List.of(waypoint1, waypoint2));

                assertThatThrownBy(() -> waypointService.reorderWaypoints(MISSION_ID, reorderVm))
                                .isInstanceOf(BadRequestException.class);
        }

        private WaypointVm createWaypointVm(Waypoint waypoint, String warning) {
                return new WaypointVm(
                                waypoint.getId(),
                                waypoint.getMission() != null ? waypoint.getMission().getId() : null,
                                waypoint.getSequence(),
                                waypoint.getName(),
                                waypoint.getLatitude(),
                                waypoint.getLongitude(),
                                waypoint.getAltitude(),
                                waypoint.getActions(),
                                waypoint.getConditions(),
                                warning,
                                waypoint.getCreatedOn(),
                                waypoint.getCreatedBy(),
                                waypoint.getLastModifiedOn(),
                                waypoint.getLastModifiedBy());
        }
}
