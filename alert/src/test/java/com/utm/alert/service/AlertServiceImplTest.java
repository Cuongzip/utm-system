package com.utm.alert.service;

import com.utm.alert.mapper.AlertMapper;
import com.utm.alert.model.Alert;
import com.utm.alert.model.enumeration.AlertSeverity;
import com.utm.alert.model.enumeration.AlertStatus;
import com.utm.alert.model.enumeration.AlertType;
import com.utm.alert.repository.AlertRepository;
import com.utm.alert.viewmodel.alert.AlertAcknowledgePostVm;
import com.utm.alert.viewmodel.alert.AlertListVm;
import com.utm.alert.viewmodel.alert.AlertPostVm;
import com.utm.alert.viewmodel.alert.AlertResolvePostVm;
import com.utm.alert.viewmodel.alert.AlertVm;
import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.BadRequestException;
import com.utm.commonlibrary.exception.NotFoundException;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.AfterEach;
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
import org.springframework.data.jpa.domain.Specification;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.ZonedDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: AlertServiceImpl (Specification-Driven)")
class AlertServiceImplTest {

        @Mock
        private AlertRepository alertRepository;

        @Mock
        private AlertMapper alertMapper;

        @Mock
        private SimpMessagingTemplate messagingTemplate;

        @InjectMocks
        private AlertServiceImpl alertService;

        @Captor
        private ArgumentCaptor<Alert> alertCaptor;

        @Captor
        private ArgumentCaptor<PageRequest> pageRequestCaptor;

        @Captor
        private ArgumentCaptor<Specification<Alert>> specCaptor;

        @AfterEach
        void tearDown() {
                SecurityContextHolder.clearContext();
        }

        private Alert createSampleAlert(String id, AlertType alertType, AlertSeverity severity, AlertStatus status) {
                Alert alert = new Alert();
                alert.setId(id);
                alert.setAlertType(alertType);
                alert.setSeverity(severity);
                alert.setStatus(status);
                alert.setDroneId("drone-uuid-001");
                alert.setFlightId("flight-uuid-001");
                alert.setHubId("hub-uuid-001");
                alert.setMessage("Sample alert message for unit testing");
                alert.setDetailsJson(Map.of("riskScore", 88.5));
                alert.setCreatedBy("SYSTEM");
                alert.setCreatedOn(ZonedDateTime.now());
                return alert;
        }

        private AlertVm createSampleAlertVm(String id, AlertType alertType, AlertSeverity severity, AlertStatus status) {
                return new AlertVm(
                                id,
                                alertType,
                                severity,
                                status,
                                "drone-uuid-001",
                                "flight-uuid-001",
                                "hub-uuid-001",
                                null,
                                null,
                                "Sample alert message for unit testing",
                                Map.of("riskScore", 88.5),
                                null,
                                null,
                                null,
                                null,
                                null,
                                ZonedDateTime.now(),
                                "SYSTEM",
                                ZonedDateTime.now(),
                                "SYSTEM");
        }

        @Nested
        @DisplayName("createAlert Endpoint Tests")
        class CreateAlertTests {

                @Test
                @DisplayName("createAlert with CRITICAL severity should persist alert and broadcast to all four topics")
                void createAlert_withCriticalSeverity_persistsAndBroadcastsToAllTopics() {
                        AlertPostVm postVm = new AlertPostVm(
                                        "CONFLICT_PROXIMITY",
                                        "CRITICAL",
                                        "flight-uuid-001",
                                        "drone-uuid-001",
                                        "hub-uuid-001",
                                        "Proximity breach with intruder drone",
                                        Map.of("separationM", 8.4));

                        Alert entity = new Alert();
                        entity.setAlertType(AlertType.CONFLICT_PROXIMITY);
                        entity.setFlightId(postVm.flightId());
                        entity.setDroneId(postVm.droneId());
                        entity.setHubId(postVm.hubId());
                        entity.setMessage(postVm.message());
                        entity.setDetailsJson(postVm.detailsJson());

                        Alert savedEntity = createSampleAlert("alert-uuid-001", AlertType.CONFLICT_PROXIMITY,
                                        AlertSeverity.CRITICAL, AlertStatus.ACTIVE);
                        AlertVm mappedVm = createSampleAlertVm("alert-uuid-001", AlertType.CONFLICT_PROXIMITY,
                                        AlertSeverity.CRITICAL, AlertStatus.ACTIVE);

                        when(alertRepository.findFirstByAlertTypeAndFlightIdAndDroneIdAndStatusInOrderByCreatedOnDesc(
                                        eq(AlertType.CONFLICT_PROXIMITY), eq("flight-uuid-001"), eq("drone-uuid-001"), anyList()))
                                        .thenReturn(Optional.empty());
                        when(alertMapper.toEntity(postVm)).thenReturn(entity);
                        when(alertRepository.save(entity)).thenReturn(savedEntity);
                        when(alertMapper.toVm(savedEntity)).thenReturn(mappedVm);

                        AlertVm result = alertService.createAlert(postVm);

                        assertThat(result).isNotNull();
                        assertThat(result.id()).isEqualTo("alert-uuid-001");
                        assertThat(result.severity()).isEqualTo(AlertSeverity.CRITICAL);
                        assertThat(result.status()).isEqualTo(AlertStatus.ACTIVE);

                        verify(alertRepository).save(alertCaptor.capture());
                        Alert captured = alertCaptor.getValue();
                        assertThat(captured.getSeverity()).isEqualTo(AlertSeverity.CRITICAL);
                        assertThat(captured.getStatus()).isEqualTo(AlertStatus.ACTIVE);
                        assertThat(captured.getCreatedBy()).isEqualTo("SYSTEM");

                        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/live"), eq(mappedVm));
                        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/critical"), eq(mappedVm));
                        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/drone/drone-uuid-001"), eq(mappedVm));
                        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/flight/flight-uuid-001"), eq(mappedVm));
                }

                @Test
                @DisplayName("createAlert deduplicates when an open alert already exists for same conflictId")
                void createAlert_whenOpenConflictAlertExists_updatesExistingInsteadOfDuplicating() {
                        AlertPostVm postVm = new AlertPostVm(
                                        "CONFLICT_PROXIMITY",
                                        "CRITICAL",
                                        "flight-uuid-001",
                                        "drone-uuid-001",
                                        null,
                                        "conflict-uuid-1",
                                        null,
                                        "Updated separation distance 12m",
                                        Map.of("separationM", 12.0));

                        Alert existing = createSampleAlert("alert-existing", AlertType.CONFLICT_PROXIMITY,
                                        AlertSeverity.HIGH, AlertStatus.ACTIVE);
                        existing.setConflictId("conflict-uuid-1");
                        AlertVm mappedVm = createSampleAlertVm("alert-existing", AlertType.CONFLICT_PROXIMITY,
                                        AlertSeverity.CRITICAL, AlertStatus.ACTIVE);

                        when(alertRepository.findByConflictIdAndStatusIn(eq("conflict-uuid-1"), anyList()))
                                        .thenReturn(List.of(existing));
                        when(alertRepository.save(existing)).thenReturn(existing);
                        when(alertMapper.toVm(existing)).thenReturn(mappedVm);

                        AlertVm result = alertService.createAlert(postVm);

                        assertThat(result.id()).isEqualTo("alert-existing");
                        assertThat(existing.getMessage()).isEqualTo("Updated separation distance 12m");
                        assertThat(existing.getSeverity()).isEqualTo(AlertSeverity.CRITICAL);
                        verify(alertMapper, never()).toEntity(any());
                }

                @Test
                @DisplayName("createAlert maps legacy EMERGENCY and WARNING severities cleanly without throwing 400")
                void createAlert_withEmergencyAndWarningAliases_mapsToCriticalAndMedium() {
                        assertThat(AlertSeverity.fromValue("emergency")).isEqualTo(AlertSeverity.CRITICAL);
                        assertThat(AlertSeverity.fromValue("warning")).isEqualTo(AlertSeverity.MEDIUM);
                }

                @Test
                @DisplayName("createAlert with null severity defaults to HIGH and avoids critical topic")
                void createAlert_withNullSeverity_defaultsToHighAndOmitsCriticalTopic() {
                        AlertPostVm postVm = new AlertPostVm(
                                        "BATTERY_LOW",
                                        null,
                                        "flight-uuid-001",
                                        "drone-uuid-001",
                                        null,
                                        "Battery dropped below 20%",
                                        Map.of("batteryPct", 19.5));

                        Alert entity = new Alert();
                        Alert savedEntity = createSampleAlert("alert-uuid-002", AlertType.BATTERY_LOW,
                                        AlertSeverity.HIGH, AlertStatus.ACTIVE);
                        AlertVm mappedVm = createSampleAlertVm("alert-uuid-002", AlertType.BATTERY_LOW,
                                        AlertSeverity.HIGH, AlertStatus.ACTIVE);

                        when(alertRepository.findFirstByAlertTypeAndFlightIdAndDroneIdAndStatusInOrderByCreatedOnDesc(
                                        eq(AlertType.BATTERY_LOW), eq("flight-uuid-001"), eq("drone-uuid-001"), anyList()))
                                        .thenReturn(Optional.empty());
                        when(alertMapper.toEntity(postVm)).thenReturn(entity);
                        when(alertRepository.save(entity)).thenReturn(savedEntity);
                        when(alertMapper.toVm(savedEntity)).thenReturn(mappedVm);

                        AlertVm result = alertService.createAlert(postVm);

                        assertThat(result).isNotNull();
                        assertThat(result.severity()).isEqualTo(AlertSeverity.HIGH);
                        verify(messagingTemplate, never()).convertAndSend(eq("/topic/alerts/critical"), any(AlertVm.class));
                }

                @Test
                @DisplayName("createAlert with authenticated operator populates createdBy from security context")
                void createAlert_withAuthenticatedOperator_populatesCreatedByFromSecurityContext() {
                        Authentication auth = mock(Authentication.class);
                        when(auth.getName()).thenReturn("atc_controller_1");
                        SecurityContext securityContext = mock(SecurityContext.class);
                        when(securityContext.getAuthentication()).thenReturn(auth);
                        SecurityContextHolder.setContext(securityContext);

                        AlertPostVm postVm = new AlertPostVm(
                                        "MANUAL_ALERT",
                                        "MEDIUM",
                                        null,
                                        null,
                                        null,
                                        "Manual visual traffic alert",
                                        null);

                        Alert entity = new Alert();
                        Alert savedEntity = createSampleAlert("alert-uuid-004", AlertType.MANUAL_ALERT,
                                        AlertSeverity.MEDIUM, AlertStatus.ACTIVE);
                        savedEntity.setCreatedBy("atc_controller_1");
                        AlertVm mappedVm = createSampleAlertVm("alert-uuid-004", AlertType.MANUAL_ALERT,
                                        AlertSeverity.MEDIUM, AlertStatus.ACTIVE);

                        when(alertMapper.toEntity(postVm)).thenReturn(entity);
                        when(alertRepository.save(entity)).thenReturn(savedEntity);
                        when(alertMapper.toVm(savedEntity)).thenReturn(mappedVm);

                        alertService.createAlert(postVm);

                        verify(alertRepository).save(alertCaptor.capture());
                        assertThat(alertCaptor.getValue().getCreatedBy()).isEqualTo("atc_controller_1");
                }

                @Test
                @DisplayName("createAlert recovers gracefully when WebSocket broker throws")
                void createAlert_whenWebSocketThrowsException_recoversGracefullyAndReturnsVm() {
                        AlertPostVm postVm = new AlertPostVm(
                                        "BATTERY_LOW",
                                        "CRITICAL",
                                        null,
                                        null,
                                        null,
                                        "Battery low",
                                        null);

                        Alert entity = new Alert();
                        Alert savedEntity = createSampleAlert("alert-uuid-006", AlertType.BATTERY_LOW,
                                        AlertSeverity.CRITICAL, AlertStatus.ACTIVE);
                        AlertVm mappedVm = createSampleAlertVm("alert-uuid-006", AlertType.BATTERY_LOW,
                                        AlertSeverity.CRITICAL, AlertStatus.ACTIVE);

                        when(alertMapper.toEntity(postVm)).thenReturn(entity);
                        when(alertRepository.save(entity)).thenReturn(savedEntity);
                        when(alertMapper.toVm(savedEntity)).thenReturn(mappedVm);
                        doThrow(new RuntimeException("STOMP connection reset"))
                                        .when(messagingTemplate).convertAndSend(eq("/topic/alerts/live"), eq(mappedVm));

                        AlertVm result = alertService.createAlert(postVm);

                        assertThat(result).isNotNull();
                        assertThat(result.id()).isEqualTo("alert-uuid-006");
                }
        }

        @Nested
        @DisplayName("getAlertById Endpoint Tests")
        class GetAlertByIdTests {

                @Test
                @DisplayName("getAlertById returns mapped VM when alert exists")
                void getAlertById_whenFound_returnsMappedVm() {
                        String alertId = "alert-uuid-100";
                        Alert alert = createSampleAlert(alertId, AlertType.THREE_D_VOLUME_BREACH, AlertSeverity.HIGH,
                                        AlertStatus.ACTIVE);
                        AlertVm expectedVm = createSampleAlertVm(alertId, AlertType.THREE_D_VOLUME_BREACH,
                                        AlertSeverity.HIGH, AlertStatus.ACTIVE);

                        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));
                        when(alertMapper.toVm(alert)).thenReturn(expectedVm);

                        AlertVm result = alertService.getAlertById(alertId);

                        assertThat(result).isNotNull();
                        assertThat(result.id()).isEqualTo(alertId);
                        assertThat(result.alertType()).isEqualTo(AlertType.THREE_D_VOLUME_BREACH);
                }

                @Test
                @DisplayName("getAlertById throws NotFoundException when alert does not exist")
                void getAlertById_whenNotFound_throwsNotFoundException() {
                        String alertId = "non-existent-alert";
                        when(alertRepository.findById(alertId)).thenReturn(Optional.empty());

                        assertThatThrownBy(() -> alertService.getAlertById(alertId))
                                        .isInstanceOf(NotFoundException.class);
                }
        }

        @Nested
        @DisplayName("getAlerts Endpoint Tests")
        class GetAlertsTests {

                @Test
                @DisplayName("getAlerts with filters executes specification and returns paginated result")
                @SuppressWarnings("unchecked")
                void getAlerts_withMultiFieldFilters_buildsSpecificationAndReturnsListVm() {
                        Alert alert = createSampleAlert("alert-uuid-201", AlertType.CONFLICT_PROXIMITY,
                                        AlertSeverity.CRITICAL, AlertStatus.ACTIVE);
                        AlertVm alertVm = createSampleAlertVm("alert-uuid-201", AlertType.CONFLICT_PROXIMITY,
                                        AlertSeverity.CRITICAL, AlertStatus.ACTIVE);
                        Page<Alert> page = new PageImpl<>(List.of(alert), PageRequest.of(0, 20), 1);

                        when(alertRepository.findAll(any(Specification.class), any(PageRequest.class)))
                                        .thenReturn(page);
                        when(alertMapper.toVmList(page.getContent())).thenReturn(List.of(alertVm));

                        AlertListVm result = alertService.getAlerts(
                                        "drone-uuid-001",
                                        "flight-uuid-001",
                                        "CRITICAL",
                                        "ACTIVE",
                                        null,
                                        null,
                                        "CONFLICT_PROXIMITY",
                                        0,
                                        20);

                        assertThat(result).isNotNull();
                        assertThat(result.content()).hasSize(1);
                        verify(alertRepository).findAll(specCaptor.capture(), pageRequestCaptor.capture());

                        Specification<Alert> spec = specCaptor.getValue();
                        Root<Alert> root = mock(Root.class);
                        CriteriaQuery<?> query = mock(CriteriaQuery.class);
                        CriteriaBuilder cb = mock(CriteriaBuilder.class);
                        Path<Object> dronePath = mock(Path.class);
                        Path<Object> flightPath = mock(Path.class);
                        Path<Object> severityPath = mock(Path.class);
                        Path<Object> statusPath = mock(Path.class);
                        Path<Object> typePath = mock(Path.class);

                        when(root.get("droneId")).thenReturn(dronePath);
                        when(root.get("flightId")).thenReturn(flightPath);
                        when(root.get("severity")).thenReturn(severityPath);
                        when(root.get("status")).thenReturn(statusPath);
                        when(root.get("alertType")).thenReturn(typePath);

                        Predicate p1 = mock(Predicate.class);
                        when(cb.equal(dronePath, "drone-uuid-001")).thenReturn(p1);
                        when(cb.equal(flightPath, "flight-uuid-001")).thenReturn(p1);
                        when(cb.equal(severityPath, AlertSeverity.CRITICAL)).thenReturn(p1);
                        when(cb.equal(statusPath, AlertStatus.ACTIVE)).thenReturn(p1);
                        when(cb.equal(typePath, AlertType.CONFLICT_PROXIMITY)).thenReturn(p1);
                        when(cb.and(any(Predicate[].class))).thenReturn(p1);

                        assertThat(spec.toPredicate(root, query, cb)).isNotNull();
                }

                @Test
                @DisplayName("getAlerts normalizes invalid pagination bounds")
                @SuppressWarnings("unchecked")
                void getAlerts_normalizesPaginationBounds() {
                        Page<Alert> emptyPage = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 100), 0);
                        when(alertRepository.findAll(any(Specification.class), any(PageRequest.class)))
                                        .thenReturn(emptyPage);
                        when(alertMapper.toVmList(Collections.emptyList())).thenReturn(Collections.emptyList());

                        AlertListVm result = alertService.getAlerts(null, null, null, null, null, null, null, -5, 500);

                        assertThat(result.pageNo()).isZero();
                        assertThat(result.pageSize()).isEqualTo(100);
                }
        }

        @Nested
        @DisplayName("getActiveAlerts & Lifecycle Tests")
        class LifecycleTests {

                @Test
                @DisplayName("getActiveAlerts returns non-resolved alerts ordered by createdOn desc")
                void getActiveAlerts_returnsUnresolvedAlerts() {
                        Alert alert1 = createSampleAlert("alert-uuid-301", AlertType.C2_LINK_LOST,
                                        AlertSeverity.CRITICAL, AlertStatus.ACTIVE);
                        AlertVm vm1 = createSampleAlertVm("alert-uuid-301", AlertType.C2_LINK_LOST,
                                        AlertSeverity.CRITICAL, AlertStatus.ACTIVE);

                        when(alertRepository.findByStatusNotOrderByCreatedOnDesc(AlertStatus.RESOLVED))
                                        .thenReturn(List.of(alert1));
                        when(alertMapper.toVmList(List.of(alert1))).thenReturn(List.of(vm1));

                        List<AlertVm> results = alertService.getActiveAlerts();

                        assertThat(results).hasSize(1);
                        verify(alertRepository).findByStatusNotOrderByCreatedOnDesc(AlertStatus.RESOLVED);
                }

                @Test
                @DisplayName("acknowledgeAlert transitions ACTIVE alert to ACKNOWLEDGED")
                void acknowledgeAlert_whenActive_transitionsToAcknowledged() {
                        String alertId = "alert-uuid-501";
                        Alert alert = createSampleAlert(alertId, AlertType.LATERAL_CORRIDOR_BREACH, AlertSeverity.HIGH,
                                        AlertStatus.ACTIVE);
                        AlertAcknowledgePostVm ackVm = new AlertAcknowledgePostVm("Tracking drift", "operator_sarah");
                        AlertVm expectedVm = createSampleAlertVm(alertId, AlertType.LATERAL_CORRIDOR_BREACH,
                                        AlertSeverity.HIGH, AlertStatus.ACKNOWLEDGED);

                        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));
                        when(alertRepository.save(alert)).thenReturn(alert);
                        when(alertMapper.toVm(alert)).thenReturn(expectedVm);

                        AlertVm result = alertService.acknowledgeAlert(alertId, ackVm);

                        assertThat(result.status()).isEqualTo(AlertStatus.ACKNOWLEDGED);
                        assertThat(alert.getStatus()).isEqualTo(AlertStatus.ACKNOWLEDGED);
                        assertThat(alert.getAcknowledgedBy()).isEqualTo("operator_sarah");
                        assertThat(alert.getAcknowledgedAt()).isNotNull();
                }

                @Test
                @DisplayName("resolveAlert marks alert as RESOLVED and rejects duplicate resolve")
                void resolveAlert_whenValid_updatesStatusToResolved() {
                        String alertId = "alert-uuid-601";
                        Alert alert = createSampleAlert(alertId, AlertType.CONFLICT_PROXIMITY, AlertSeverity.CRITICAL,
                                        AlertStatus.ACKNOWLEDGED);
                        AlertResolvePostVm resolveVm = new AlertResolvePostVm("Cleared", "operator_dave");
                        AlertVm expectedVm = createSampleAlertVm(alertId, AlertType.CONFLICT_PROXIMITY,
                                        AlertSeverity.CRITICAL, AlertStatus.RESOLVED);

                        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));
                        when(alertRepository.save(alert)).thenReturn(alert);
                        when(alertMapper.toVm(alert)).thenReturn(expectedVm);

                        AlertVm result = alertService.resolveAlert(alertId, resolveVm);

                        assertThat(result.status()).isEqualTo(AlertStatus.RESOLVED);
                        assertThat(alert.getStatus()).isEqualTo(AlertStatus.RESOLVED);
                        assertThat(alert.getResolvedBy()).isEqualTo("operator_dave");

                        assertThatThrownBy(() -> alertService.resolveAlert(alertId, resolveVm))
                                        .isInstanceOf(BadRequestException.class)
                                        .extracting(ex -> ((BadRequestException) ex).getErrorCode())
                                        .isEqualTo(MessageCode.ALERT_ALREADY_RESOLVED);
                }

                @Test
                @DisplayName("resolveByConflictId auto-resolves all open alerts for that conflict")
                void resolveByConflictId_autoResolvesOpenAlerts() {
                        Alert open = createSampleAlert("alert-c1", AlertType.CONFLICT_PROXIMITY, AlertSeverity.CRITICAL,
                                        AlertStatus.ACTIVE);
                        open.setConflictId("conflict-99");
                        AlertVm resolvedVm = createSampleAlertVm("alert-c1", AlertType.CONFLICT_PROXIMITY,
                                        AlertSeverity.CRITICAL, AlertStatus.RESOLVED);

                        when(alertRepository.findByConflictIdAndStatusIn(eq("conflict-99"), anyList()))
                                        .thenReturn(List.of(open));
                        when(alertRepository.save(open)).thenReturn(open);
                        when(alertMapper.toVm(open)).thenReturn(resolvedVm);

                        int count = alertService.resolveByConflictId("conflict-99", "Separation restored");

                        assertThat(count).isEqualTo(1);
                        assertThat(open.getStatus()).isEqualTo(AlertStatus.RESOLVED);
                        assertThat(open.getResolutionNotes()).contains("Separation restored");
                }
        }
}
