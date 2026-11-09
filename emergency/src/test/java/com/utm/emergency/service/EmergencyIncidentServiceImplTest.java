package com.utm.emergency.service;

import com.utm.commonlibrary.exception.DuplicatedException;
import com.utm.commonlibrary.exception.NotFoundException;
import com.utm.emergency.mapper.EmergencyIncidentMapper;
import com.utm.emergency.model.EmergencyIncident;
import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.model.enumeration.IncidentStatus;
import com.utm.emergency.model.enumeration.OperationMode;
import com.utm.emergency.model.enumeration.ResponseAction;
import com.utm.emergency.model.enumeration.RootCause;
import com.utm.emergency.repository.EmergencyIncidentRepository;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentPostVm;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentVm;
import com.utm.emergency.viewmodel.incident.IncidentPageVm;
import com.utm.emergency.viewmodel.incident.RootCauseVm;
import com.utm.emergency.viewmodel.stats.EmergencyStatsVm;
import com.utm.emergency.viewmodel.stats.EmergencyTrendVm;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: EmergencyIncidentServiceImpl (Specification-Driven)")
class EmergencyIncidentServiceImplTest {

        @Mock
        private EmergencyIncidentRepository incidentRepo;

        @Mock
        private EmergencyIncidentMapper incidentMapper;

        @Mock
        private SimpMessagingTemplate messagingTemplate;

        @Mock
        private DecisionEngineService decisionEngine;

        @InjectMocks
        private EmergencyIncidentServiceImpl incidentService;

        @Captor
        private ArgumentCaptor<EmergencyIncident> incidentCaptor;

        @Captor
        private ArgumentCaptor<PageRequest> pageRequestCaptor;

        @Captor
        private ArgumentCaptor<Specification<EmergencyIncident>> specCaptor;

        private EmergencyIncident createSampleIncident(String id, EmergencyType type, EmergencySeverity severity,
                        IncidentStatus status) {
                EmergencyIncident incident = new EmergencyIncident();
                incident.setId(id);
                incident.setIncidentNumber("INC-20261107-" + id);
                incident.setDroneId("drone-001");
                incident.setFlightId("flight-001");
                incident.setEmergencyType(type);
                incident.setSeverity(severity);
                incident.setStatus(status);
                incident.setMessage("Sample emergency alert for unit testing");
                incident.setLatitude(10.762622);
                incident.setLongitude(106.660172);
                incident.setAltitude(120.0);
                incident.setDetectedAt(ZonedDateTime.now(ZoneOffset.UTC));
                incident.setCreatedBy("operator-sarah");
                incident.setCreatedOn(ZonedDateTime.now(ZoneOffset.UTC));
                return incident;
        }

        private EmergencyIncidentVm createSampleIncidentVm(String id, EmergencyType type, EmergencySeverity severity,
                        IncidentStatus status) {
                return new EmergencyIncidentVm(
                                id,
                                "INC-20261107-" + id,
                                "drone-001",
                                "flight-001",
                                type,
                                severity,
                                status,
                                "Sample emergency alert for unit testing",
                                null,
                                10.762622,
                                106.660172,
                                120.0,
                                ResponseAction.LAND,
                                false,
                                true,
                                null,
                                null,
                                ZonedDateTime.now(ZoneOffset.UTC).plusSeconds(30),
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                ZonedDateTime.now(ZoneOffset.UTC),
                                ZonedDateTime.now(ZoneOffset.UTC),
                                ZonedDateTime.now(ZoneOffset.UTC));
        }

        @Nested
        @DisplayName("createIncident Endpoint Tests")
        class CreateIncidentTests {

                @Test
                @DisplayName("createIncident in supervised mode sets status to pending_confirmation and broadcasts to topics")
                void createIncident_whenSupervisedMode_setsStatusPendingConfirmation() {
                        EmergencyIncidentPostVm postVm = new EmergencyIncidentPostVm(
                                        null,
                                        "drone-001",
                                        "flight-001",
                                        EmergencyType.battery_critical,
                                        EmergencySeverity.critical,
                                        "Battery level critical: 9.5%",
                                        "{\"batteryPct\": 9.5}",
                                        10.762622,
                                        106.660172,
                                        120.0);

                        EmergencyIncident entity = createSampleIncident("inc-001", EmergencyType.battery_critical,
                                        EmergencySeverity.critical, IncidentStatus.active);
                        EmergencyIncident savedEntity = createSampleIncident("inc-001", EmergencyType.battery_critical,
                                        EmergencySeverity.critical, IncidentStatus.pending_confirmation);
                        EmergencyIncidentVm expectedVm = createSampleIncidentVm("inc-001",
                                        EmergencyType.battery_critical,
                                        EmergencySeverity.critical, IncidentStatus.pending_confirmation);

                        when(incidentMapper.toEntity(postVm)).thenReturn(entity);
                        when(decisionEngine.getMode()).thenReturn(OperationMode.supervised);
                        when(incidentRepo.save(entity)).thenReturn(savedEntity);
                        when(incidentMapper.toVm(savedEntity)).thenReturn(expectedVm);

                        EmergencyIncidentVm result = incidentService.createIncident(postVm, "pilot-dave");

                        assertThat(result).isNotNull();
                        assertThat(result.id()).isEqualTo("inc-001");
                        assertThat(result.status()).isEqualTo(IncidentStatus.pending_confirmation);

                        verify(incidentRepo).save(incidentCaptor.capture());
                        EmergencyIncident captured = incidentCaptor.getValue();
                        assertThat(captured.getStatus()).isEqualTo(IncidentStatus.pending_confirmation);
                        assertThat(captured.getCreatedBy()).isEqualTo("pilot-dave");

                        verify(decisionEngine).processEmergency(savedEntity);
                        verify(messagingTemplate).convertAndSend(eq("/topic/emergency/incidents"), eq(expectedVm));
                        verify(messagingTemplate).convertAndSend(eq("/topic/emergency/drone/drone-001"),
                                        eq(expectedVm));
                        verify(messagingTemplate).convertAndSend(eq("/topic/emergency/flight/flight-001"),
                                        eq(expectedVm));
                }

                @Test
                @DisplayName("createIncident with manual incident number uses manual number")
                void createIncident_whenManualIncidentNumber_usesManualNumber() {
                        EmergencyIncidentPostVm postVm = new EmergencyIncidentPostVm(
                                        "INC-20261107-MANU",
                                        "drone-001",
                                        "flight-001",
                                        EmergencyType.battery_critical,
                                        EmergencySeverity.critical,
                                        "Battery level critical: 9.5%",
                                        null,
                                        10.762622,
                                        106.660172,
                                        120.0);

                        EmergencyIncident entity = createSampleIncident("inc-001", EmergencyType.battery_critical,
                                        EmergencySeverity.critical, IncidentStatus.active);
                        EmergencyIncident savedEntity = createSampleIncident("inc-001", EmergencyType.battery_critical,
                                        EmergencySeverity.critical, IncidentStatus.active);
                        savedEntity.setIncidentNumber("INC-20261107-MANU");
                        EmergencyIncidentVm expectedVm = createSampleIncidentVm("inc-001",
                                        EmergencyType.battery_critical,
                                        EmergencySeverity.critical, IncidentStatus.active);

                        when(incidentRepo.existsByIncidentNumber("INC-20261107-MANU")).thenReturn(false);
                        when(incidentMapper.toEntity(postVm)).thenReturn(entity);
                        when(decisionEngine.getMode()).thenReturn(OperationMode.auto);
                        when(incidentRepo.save(entity)).thenReturn(savedEntity);
                        when(incidentMapper.toVm(savedEntity)).thenReturn(expectedVm);

                        EmergencyIncidentVm result = incidentService.createIncident(postVm, "pilot-dave");

                        assertThat(result).isNotNull();
                        assertThat(entity.getIncidentNumber()).isEqualTo("INC-20261107-MANU");
                }

                @Test
                @DisplayName("createIncident with duplicate manual incident number throws DuplicatedException")
                void createIncident_whenDuplicateIncidentNumber_throwsDuplicatedException() {
                        EmergencyIncidentPostVm postVm = new EmergencyIncidentPostVm(
                                        "INC-20261107-DUPL",
                                        "drone-001",
                                        "flight-001",
                                        EmergencyType.battery_critical,
                                        EmergencySeverity.critical,
                                        "Battery level critical: 9.5%",
                                        null,
                                        10.762622,
                                        106.660172,
                                        120.0);

                        when(incidentRepo.existsByIncidentNumber("INC-20261107-DUPL")).thenReturn(true);

                        assertThatThrownBy(() -> incidentService.createIncident(postVm, "pilot-dave"))
                                        .isInstanceOf(DuplicatedException.class);

                        verify(incidentRepo, never()).save(any());
                }

                @Test
                @DisplayName("createIncident in auto mode sets status to active and handles null reporter by defaulting to system")
                void createIncident_whenAutoMode_setsStatusActiveAndDefaultsReporterToSystem() {
                        EmergencyIncidentPostVm postVm = new EmergencyIncidentPostVm(
                                        null,
                                        "drone-002",
                                        null,
                                        EmergencyType.collision_aircraft,
                                        EmergencySeverity.emergency,
                                        "TCPA breach with aircraft",
                                        null,
                                        null,
                                        null,
                                        null);

                        EmergencyIncident entity = new EmergencyIncident();
                        entity.setDroneId("drone-002");
                        EmergencyIncident savedEntity = createSampleIncident("inc-002",
                                        EmergencyType.collision_aircraft,
                                        EmergencySeverity.emergency, IncidentStatus.active);
                        savedEntity.setDroneId("drone-002");
                        savedEntity.setFlightId(null);
                        EmergencyIncidentVm expectedVm = createSampleIncidentVm("inc-002",
                                        EmergencyType.collision_aircraft,
                                        EmergencySeverity.emergency, IncidentStatus.active);

                        when(incidentMapper.toEntity(postVm)).thenReturn(entity);
                        when(decisionEngine.getMode()).thenReturn(OperationMode.auto);
                        when(incidentRepo.save(entity)).thenReturn(savedEntity);
                        when(incidentMapper.toVm(savedEntity)).thenReturn(expectedVm);

                        EmergencyIncidentVm result = incidentService.createIncident(postVm, "   ");

                        assertThat(result).isNotNull();
                        verify(incidentRepo).save(incidentCaptor.capture());
                        EmergencyIncident captured = incidentCaptor.getValue();
                        assertThat(captured.getStatus()).isEqualTo(IncidentStatus.active);
                        assertThat(captured.getCreatedBy()).isEqualTo("system");

                        verify(messagingTemplate).convertAndSend(eq("/topic/emergency/incidents"), eq(expectedVm));
                        verify(messagingTemplate).convertAndSend(eq("/topic/emergency/drone/drone-002"),
                                        eq(expectedVm));
                        verify(messagingTemplate, never()).convertAndSend(eq("/topic/emergency/flight/null"),
                                        any(EmergencyIncidentVm.class));
                }
        }

        @Nested
        @DisplayName("searchIncidents Endpoint Tests")
        class SearchIncidentsTests {

                @Test
                @DisplayName("searchIncidents applies multiple filters and calculates page index correctly")
                @SuppressWarnings("unchecked")
                void searchIncidents_withMultiFilters_constructsSpecificationAndReturnsPage() {
                        EmergencyIncident incident = createSampleIncident("inc-010", EmergencyType.geofence_breach,
                                        EmergencySeverity.critical, IncidentStatus.active);
                        EmergencyIncidentVm vm = createSampleIncidentVm("inc-010", EmergencyType.geofence_breach,
                                        EmergencySeverity.critical, IncidentStatus.active);
                        Page<EmergencyIncident> page = new PageImpl<>(List.of(incident), PageRequest.of(2, 10), 25);

                        when(incidentRepo.findAll(any(Specification.class), any(PageRequest.class))).thenReturn(page);
                        when(incidentMapper.toVmList(page.getContent())).thenReturn(List.of(vm));

                        ZonedDateTime from = ZonedDateTime.now(ZoneOffset.UTC).minusHours(2);
                        ZonedDateTime to = ZonedDateTime.now(ZoneOffset.UTC);

                        IncidentPageVm result = incidentService.searchIncidents(
                                        "active, executing",
                                        EmergencySeverity.critical,
                                        EmergencyType.geofence_breach,
                                        "drone-001",
                                        from,
                                        to,
                                        10,
                                        20);

                        assertThat(result).isNotNull();
                        assertThat(result.data()).hasSize(1);
                        assertThat(result.total()).isEqualTo(page.getTotalElements());
                        assertThat(result.limit()).isEqualTo(10);
                        assertThat(result.offset()).isEqualTo(20);

                        verify(incidentRepo).findAll(specCaptor.capture(), pageRequestCaptor.capture());
                        assertThat(pageRequestCaptor.getValue().getPageNumber()).isEqualTo(2);
                        assertThat(pageRequestCaptor.getValue().getPageSize()).isEqualTo(10);
                        assertThat(pageRequestCaptor.getValue().getSort().getOrderFor("detectedAt")).isNotNull();

                        Specification<EmergencyIncident> spec = specCaptor.getValue();
                        Root<EmergencyIncident> root = mock(Root.class);
                        CriteriaQuery<?> query = mock(CriteriaQuery.class);
                        CriteriaBuilder cb = mock(CriteriaBuilder.class);

                        Path<Object> statusPath = mock(Path.class);
                        Path<Object> severityPath = mock(Path.class);
                        Path<Object> typePath = mock(Path.class);
                        Path<Object> dronePath = mock(Path.class);
                        Path<ZonedDateTime> detectedPath = mock(Path.class);

                        when(root.get("status")).thenReturn(statusPath);
                        when(root.get("severity")).thenReturn(severityPath);
                        when(root.get("emergencyType")).thenReturn(typePath);
                        when(root.get("droneId")).thenReturn(dronePath);
                        when(root.<ZonedDateTime>get("detectedAt")).thenReturn(detectedPath);

                        Predicate p1 = mock(Predicate.class);
                        when(statusPath.in(any(List.class))).thenReturn(p1);
                        when(cb.equal(severityPath, EmergencySeverity.critical)).thenReturn(p1);
                        when(cb.equal(typePath, EmergencyType.geofence_breach)).thenReturn(p1);
                        when(cb.equal(dronePath, "drone-001")).thenReturn(p1);
                        when(cb.greaterThanOrEqualTo(detectedPath, from)).thenReturn(p1);
                        when(cb.lessThanOrEqualTo(detectedPath, to)).thenReturn(p1);
                        when(cb.and(any(Predicate[].class))).thenReturn(p1);

                        Predicate predicateResult = spec.toPredicate(root, query, cb);
                        assertThat(predicateResult).isNotNull();
                }

                @Test
                @DisplayName("searchIncidents with default limit and negative offset falls back to defaults")
                @SuppressWarnings("unchecked")
                void searchIncidents_withInvalidPagination_fallsBackToDefaults() {
                        Page<EmergencyIncident> emptyPage = new PageImpl<>(Collections.emptyList(),
                                        PageRequest.of(0, 50), 0);
                        when(incidentRepo.findAll(any(Specification.class), any(PageRequest.class)))
                                        .thenReturn(emptyPage);
                        when(incidentMapper.toVmList(Collections.emptyList())).thenReturn(Collections.emptyList());

                        IncidentPageVm result = incidentService.searchIncidents(null, null, null, null, null, null, 0,
                                        -5);

                        assertThat(result.limit()).isEqualTo(50);
                        assertThat(result.offset()).isEqualTo(-5);
                        verify(incidentRepo).findAll(any(Specification.class), pageRequestCaptor.capture());
                        assertThat(pageRequestCaptor.getValue().getPageNumber()).isZero();
                        assertThat(pageRequestCaptor.getValue().getPageSize()).isEqualTo(50);
                }
        }

        @Nested
        @DisplayName("getActiveIncidents Endpoint Tests")
        class GetActiveIncidentsTests {

                @Test
                @DisplayName("getActiveIncidents queries active, pending_confirmation, and executing statuses")
                void getActiveIncidents_queriesCorrectLifecycleStatuses() {
                        EmergencyIncident incident = createSampleIncident("inc-020", EmergencyType.motor_failure,
                                        EmergencySeverity.emergency, IncidentStatus.executing);
                        EmergencyIncidentVm vm = createSampleIncidentVm("inc-020", EmergencyType.motor_failure,
                                        EmergencySeverity.emergency, IncidentStatus.executing);

                        List<IncidentStatus> expectedStatuses = List.of(IncidentStatus.active,
                                        IncidentStatus.pending_confirmation,
                                        IncidentStatus.executing);
                        when(incidentRepo.findByStatusInOrderByDetectedAtDesc(expectedStatuses))
                                        .thenReturn(List.of(incident));
                        when(incidentMapper.toVmList(List.of(incident))).thenReturn(List.of(vm));

                        List<EmergencyIncidentVm> results = incidentService.getActiveIncidents();

                        assertThat(results).hasSize(1);
                        assertThat(results.get(0).status()).isEqualTo(IncidentStatus.executing);
                        verify(incidentRepo).findByStatusInOrderByDetectedAtDesc(expectedStatuses);
                }
        }

        @Nested
        @DisplayName("getIncidentById Endpoint Tests")
        class GetIncidentByIdTests {

                @Test
                @DisplayName("getIncidentById returns mapped VM when incident exists")
                void getIncidentById_whenFound_returnsMappedVm() {
                        EmergencyIncident incident = createSampleIncident("inc-030", EmergencyType.battery_low,
                                        EmergencySeverity.warning, IncidentStatus.active);
                        EmergencyIncidentVm vm = createSampleIncidentVm("inc-030", EmergencyType.battery_low,
                                        EmergencySeverity.warning, IncidentStatus.active);

                        when(incidentRepo.findById("inc-030")).thenReturn(Optional.of(incident));
                        when(incidentMapper.toVm(incident)).thenReturn(vm);

                        EmergencyIncidentVm result = incidentService.getIncidentById("inc-030");

                        assertThat(result).isNotNull();
                        assertThat(result.id()).isEqualTo("inc-030");
                        assertThat(result.emergencyType()).isEqualTo(EmergencyType.battery_low);
                }

                @Test
                @DisplayName("getIncidentById returns mapped VM when looked up by incidentNumber")
                void getIncidentById_whenFoundByIncidentNumber_returnsMappedVm() {
                        EmergencyIncident incident = createSampleIncident("inc-030", EmergencyType.battery_low,
                                        EmergencySeverity.warning, IncidentStatus.active);
                        incident.setIncidentNumber("INC-20261107-1234");
                        EmergencyIncidentVm vm = createSampleIncidentVm("inc-030", EmergencyType.battery_low,
                                        EmergencySeverity.warning, IncidentStatus.active);

                        when(incidentRepo.findById("INC-20261107-1234")).thenReturn(Optional.empty());
                        when(incidentRepo.findByIncidentNumber("INC-20261107-1234")).thenReturn(Optional.of(incident));
                        when(incidentMapper.toVm(incident)).thenReturn(vm);

                        EmergencyIncidentVm result = incidentService.getIncidentById("INC-20261107-1234");

                        assertThat(result).isNotNull();
                        assertThat(result.id()).isEqualTo("inc-030");
                }

                @Test
                @DisplayName("getIncidentById throws NotFoundException when incident does not exist")
                void getIncidentById_whenNotFound_throwsNotFoundException() {
                        when(incidentRepo.findById("inc-unknown")).thenReturn(Optional.empty());

                        assertThatThrownBy(() -> incidentService.getIncidentById("inc-unknown"))
                                        .isInstanceOf(NotFoundException.class)
                                        .hasMessage("Emergency incident is not found")
                                        .extracting(ex -> ((NotFoundException) ex).getParams().get("id"))
                                        .isEqualTo("inc-unknown");
                }
        }

        @Nested
        @DisplayName("updateRootCause Endpoint Tests")
        class UpdateRootCauseTests {

                @Test
                @DisplayName("updateRootCause updates incident entity and broadcasts to WebSocket topics")
                void updateRootCause_whenFound_updatesEntityAndBroadcasts() {
                        EmergencyIncident incident = createSampleIncident("inc-040", EmergencyType.battery_critical,
                                        EmergencySeverity.critical, IncidentStatus.resolved);
                        RootCauseVm rootCauseVm = new RootCauseVm(
                                        RootCause.equipment,
                                        "Cell degraded under cold ambient conditions",
                                        "Mandate pre-flight battery temperature verification");

                        EmergencyIncident saved = createSampleIncident("inc-040", EmergencyType.battery_critical,
                                        EmergencySeverity.critical, IncidentStatus.resolved);
                        saved.setRootCause(RootCause.equipment);
                        saved.setRootCauseNotes(rootCauseVm.notes());
                        saved.setLessonsLearned(rootCauseVm.lessonsLearned());

                        EmergencyIncidentVm expectedVm = createSampleIncidentVm("inc-040",
                                        EmergencyType.battery_critical,
                                        EmergencySeverity.critical, IncidentStatus.resolved);

                        when(incidentRepo.findById("inc-040")).thenReturn(Optional.of(incident));
                        doAnswer(invocation -> {
                                EmergencyIncident target = invocation.getArgument(0);
                                RootCauseVm source = invocation.getArgument(1);
                                target.setRootCause(source.rootCause());
                                target.setRootCauseNotes(source.notes());
                                target.setLessonsLearned(source.lessonsLearned());
                                return null;
                        }).when(incidentMapper).updateEntityFromRootCauseVm(incident, rootCauseVm);

                        when(incidentRepo.save(incident)).thenReturn(saved);
                        when(incidentMapper.toVm(saved)).thenReturn(expectedVm);

                        EmergencyIncidentVm result = incidentService.updateRootCause("inc-040", rootCauseVm);

                        assertThat(result).isNotNull();
                        verify(incidentRepo).save(incident);
                        verify(messagingTemplate).convertAndSend(eq("/topic/emergency/incidents"), eq(expectedVm));
                        verify(messagingTemplate).convertAndSend(eq("/topic/emergency/drone/drone-001"),
                                        eq(expectedVm));
                        verify(messagingTemplate).convertAndSend(eq("/topic/emergency/flight/flight-001"),
                                        eq(expectedVm));
                }

                @Test
                @DisplayName("updateRootCause throws NotFoundException when incident does not exist")
                void updateRootCause_whenNotFound_throwsNotFoundException() {
                        when(incidentRepo.findById("inc-missing")).thenReturn(Optional.empty());

                        assertThatThrownBy(() -> incidentService.updateRootCause("inc-missing",
                                        new RootCauseVm(RootCause.weather, "Wind", "None")))
                                        .isInstanceOf(NotFoundException.class)
                                        .hasMessage("Emergency incident is not found")
                                        .extracting(ex -> ((NotFoundException) ex).getParams().get("id"))
                                        .isEqualTo("inc-missing");

                        verify(incidentRepo, never()).save(any(EmergencyIncident.class));
                }
        }

        @Nested
        @DisplayName("getStats Endpoint Tests")
        class GetStatsTests {

                @Test
                @DisplayName("getStats maps grouped repository aggregations to EmergencyStatsVm")
                void getStats_withProvidedDateRange_mapsAggregations() {
                        ZonedDateTime from = ZonedDateTime.now(ZoneOffset.UTC).minusDays(7);
                        ZonedDateTime to = ZonedDateTime.now(ZoneOffset.UTC);

                        List<Object[]> statusRows = List.of(new Object[] { "resolved", 14L },
                                        new Object[] { "active", 2L });
                        List<Object[]> typeRows = List.of(new Object[] { "battery_critical", 8L },
                                        new Object[] { "collision_aircraft", 1L });
                        List<Object[]> severityRows = List.of(new Object[] { "critical", 10L },
                                        new Object[] { "warning", 6L });
                        List<Object[]> droneRows = List.of(new Object[] { "drone-001", 5L },
                                        new Object[] { "drone-002", 3L });
                        List<Object[]> resolutionRows = List.of(new Object[] { Boolean.TRUE, 14L },
                                        new Object[] { Boolean.FALSE, 2L });

                        when(incidentRepo.countByStatusGrouped(from, to)).thenReturn(statusRows);
                        when(incidentRepo.countByTypeGrouped(from, to)).thenReturn(typeRows);
                        when(incidentRepo.countBySeverityGrouped(from, to)).thenReturn(severityRows);
                        when(incidentRepo.countByDroneGrouped(from, to)).thenReturn(droneRows);
                        when(incidentRepo.countByResolutionGrouped(from, to)).thenReturn(resolutionRows);

                        EmergencyStatsVm result = incidentService.getStats(from, to);

                        assertThat(result).isNotNull();
                        assertThat(result.byStatus()).hasSize(2);
                        assertThat(result.byStatus().get(0).status()).isEqualTo("resolved");
                        assertThat(result.byStatus().get(0).count()).isEqualTo(14L);

                        assertThat(result.byType()).hasSize(2);
                        assertThat(result.bySeverity()).hasSize(2);
                        assertThat(result.byDrone()).hasSize(2);
                        assertThat(result.resolutionStats()).hasSize(2);
                        assertThat(result.avgResponseTimeSeconds()).isEqualTo(2.4);
                }

                @Test
                @DisplayName("getStats with null date range defaults from to epoch and to to now")
                void getStats_withNullDateRange_defaultsDates() {
                        when(incidentRepo.countByStatusGrouped(any(ZonedDateTime.class), any(ZonedDateTime.class)))
                                        .thenReturn(Collections.emptyList());
                        when(incidentRepo.countByTypeGrouped(any(ZonedDateTime.class), any(ZonedDateTime.class)))
                                        .thenReturn(Collections.emptyList());
                        when(incidentRepo.countBySeverityGrouped(any(ZonedDateTime.class), any(ZonedDateTime.class)))
                                        .thenReturn(Collections.emptyList());
                        when(incidentRepo.countByDroneGrouped(any(ZonedDateTime.class), any(ZonedDateTime.class)))
                                        .thenReturn(Collections.emptyList());
                        when(incidentRepo.countByResolutionGrouped(any(ZonedDateTime.class), any(ZonedDateTime.class)))
                                        .thenReturn(Collections.emptyList());

                        EmergencyStatsVm result = incidentService.getStats(null, null);

                        assertThat(result).isNotNull();
                        assertThat(result.byStatus()).isEmpty();
                        verify(incidentRepo).countByStatusGrouped(
                                        eq(ZonedDateTime.of(1970, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC)),
                                        any(ZonedDateTime.class));
                }
        }

        @Nested
        @DisplayName("getTrends Endpoint Tests")
        class GetTrendsTests {

                @Test
                @DisplayName("getTrends with day interval groups incidents by day and aggregates severities")
                @SuppressWarnings("unchecked")
                void getTrends_withDayInterval_groupsByDay() {
                        ZonedDateTime from = ZonedDateTime.of(2026, 11, 1, 0, 0, 0, 0, ZoneOffset.UTC);
                        ZonedDateTime to = ZonedDateTime.of(2026, 11, 3, 23, 59, 59, 0, ZoneOffset.UTC);

                        EmergencyIncident inc1 = createSampleIncident("inc-t1", EmergencyType.battery_low,
                                        EmergencySeverity.warning, IncidentStatus.resolved);
                        inc1.setDetectedAt(ZonedDateTime.of(2026, 11, 1, 10, 0, 0, 0, ZoneOffset.UTC));

                        EmergencyIncident inc2 = createSampleIncident("inc-t2", EmergencyType.battery_critical,
                                        EmergencySeverity.critical, IncidentStatus.resolved);
                        inc2.setDetectedAt(ZonedDateTime.of(2026, 11, 1, 14, 0, 0, 0, ZoneOffset.UTC));

                        EmergencyIncident inc3 = createSampleIncident("inc-t3", EmergencyType.collision_aircraft,
                                        EmergencySeverity.emergency, IncidentStatus.active);
                        inc3.setDetectedAt(ZonedDateTime.of(2026, 11, 2, 8, 30, 0, 0, ZoneOffset.UTC));

                        when(incidentRepo.findAll(any(Specification.class), any(Sort.class)))
                                        .thenReturn(List.of(inc1, inc2, inc3));

                        List<EmergencyTrendVm> trends = incidentService.getTrends(from, to, "day");

                        assertThat(trends).hasSize(2);

                        EmergencyTrendVm day1 = trends.get(0);
                        assertThat(day1.period()).isEqualTo("2026-11-01");
                        assertThat(day1.total()).isEqualTo(2);
                        assertThat(day1.warnings()).isEqualTo(1);
                        assertThat(day1.critical()).isEqualTo(1);
                        assertThat(day1.emergencies()).isZero();

                        EmergencyTrendVm day2 = trends.get(1);
                        assertThat(day2.period()).isEqualTo("2026-11-02");
                        assertThat(day2.total()).isEqualTo(1);
                        assertThat(day2.warnings()).isZero();
                        assertThat(day2.critical()).isZero();
                        assertThat(day2.emergencies()).isEqualTo(1);
                }

                @Test
                @DisplayName("getTrends with month interval formats timestamps by month")
                @SuppressWarnings("unchecked")
                void getTrends_withMonthInterval_formatsByMonth() {
                        EmergencyIncident inc = createSampleIncident("inc-m1", EmergencyType.battery_critical,
                                        EmergencySeverity.critical, IncidentStatus.resolved);
                        inc.setDetectedAt(ZonedDateTime.of(2026, 11, 5, 12, 0, 0, 0, ZoneOffset.UTC));

                        when(incidentRepo.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(inc));

                        List<EmergencyTrendVm> trends = incidentService.getTrends(null, null, "month");

                        assertThat(trends).hasSize(1);
                        assertThat(trends.get(0).period()).isEqualTo("2026-11");
                        assertThat(trends.get(0).critical()).isEqualTo(1);
                }

                @Test
                @DisplayName("getTrends with week interval formats timestamps by week")
                @SuppressWarnings("unchecked")
                void getTrends_withWeekInterval_formatsByWeek() {
                        EmergencyIncident inc = createSampleIncident("inc-w1", EmergencyType.motor_anomaly,
                                        EmergencySeverity.warning, IncidentStatus.resolved);
                        inc.setDetectedAt(ZonedDateTime.of(2026, 11, 5, 12, 0, 0, 0, ZoneOffset.UTC));

                        when(incidentRepo.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of(inc));

                        List<EmergencyTrendVm> trends = incidentService.getTrends(null, null, "week");

                        assertThat(trends).hasSize(1);
                        assertThat(trends.get(0).period()).contains("2026-W");
                        assertThat(trends.get(0).warnings()).isEqualTo(1);
                }
        }
}
