package com.utm.alert.service;

import com.utm.alert.mapper.AlertMapper;
import com.utm.alert.model.Alert;
import com.utm.alert.model.enumeration.AlertSeverity;
import com.utm.alert.model.enumeration.AlertStatus;
import com.utm.alert.repository.AlertRepository;
import com.utm.alert.viewmodel.alert.AlertAcknowledgePostVm;
import com.utm.alert.viewmodel.alert.AlertListVm;
import com.utm.alert.viewmodel.alert.AlertPostVm;
import com.utm.alert.viewmodel.alert.AlertResolvePostVm;
import com.utm.alert.viewmodel.alert.AlertVm;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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

        private Alert createSampleAlert(String id, String alertType, AlertSeverity severity, AlertStatus status) {
                Alert alert = new Alert();
                alert.setId(id);
                alert.setAlertType(alertType);
                alert.setSeverity(severity);
                alert.setStatus(status);
                alert.setDroneId("drone-uuid-001");
                alert.setFlightId("flight-uuid-001");
                alert.setHubId("hub-uuid-001");
                alert.setMessage("Sample alert message for unit testing");
                alert.setDetailsJson("{\"riskScore\": 88.5}");
                alert.setAcknowledged(status == AlertStatus.ACKNOWLEDGED || status == AlertStatus.RESOLVED);
                alert.setResolved(status == AlertStatus.RESOLVED);
                alert.setCreatedBy("SYSTEM");
                alert.setCreatedOn(ZonedDateTime.now());
                return alert;
        }

        private AlertVm createSampleAlertVm(String id, String alertType, AlertSeverity severity, AlertStatus status) {
                return new AlertVm(
                                id,
                                alertType,
                                severity,
                                status,
                                "drone-uuid-001",
                                "flight-uuid-001",
                                "hub-uuid-001",
                                "Sample alert message for unit testing",
                                "{\"riskScore\": 88.5}",
                                status == AlertStatus.ACKNOWLEDGED || status == AlertStatus.RESOLVED,
                                null,
                                null,
                                status == AlertStatus.RESOLVED,
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
                                        "{\"separationM\": 8.4}");

                        Alert entity = new Alert();
                        entity.setAlertType(postVm.alertType());
                        entity.setFlightId(postVm.flightId());
                        entity.setDroneId(postVm.droneId());
                        entity.setHubId(postVm.hubId());
                        entity.setMessage(postVm.message());
                        entity.setDetailsJson(postVm.detailsJson());

                        Alert savedEntity = createSampleAlert("alert-uuid-001", "CONFLICT_PROXIMITY",
                                        AlertSeverity.CRITICAL,
                                        AlertStatus.ACTIVE);
                        AlertVm mappedVm = createSampleAlertVm("alert-uuid-001", "CONFLICT_PROXIMITY",
                                        AlertSeverity.CRITICAL,
                                        AlertStatus.ACTIVE);

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
                        assertThat(captured.getAcknowledged()).isFalse();
                        assertThat(captured.getResolved()).isFalse();
                        assertThat(captured.getCreatedBy()).isEqualTo("SYSTEM");

                        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/live"), eq(mappedVm));
                        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/critical"), eq(mappedVm));
                        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/drone/drone-uuid-001"),
                                        eq(mappedVm));
                        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/flight/flight-uuid-001"),
                                        eq(mappedVm));
                }

                @Test
                @DisplayName("createAlert with null severity should default to HIGH and avoid critical topic")
                void createAlert_withNullSeverity_defaultsToHighAndOmitsCriticalTopic() {
                        AlertPostVm postVm = new AlertPostVm(
                                        "BATTERY_LOW",
                                        null,
                                        "flight-uuid-001",
                                        "drone-uuid-001",
                                        null,
                                        "Battery dropped below 20%",
                                        "{\"batteryPct\": 19.5}");

                        Alert entity = new Alert();
                        Alert savedEntity = createSampleAlert("alert-uuid-002", "BATTERY_LOW", AlertSeverity.HIGH,
                                        AlertStatus.ACTIVE);
                        AlertVm mappedVm = createSampleAlertVm("alert-uuid-002", "BATTERY_LOW", AlertSeverity.HIGH,
                                        AlertStatus.ACTIVE);

                        when(alertMapper.toEntity(postVm)).thenReturn(entity);
                        when(alertRepository.save(entity)).thenReturn(savedEntity);
                        when(alertMapper.toVm(savedEntity)).thenReturn(mappedVm);

                        AlertVm result = alertService.createAlert(postVm);

                        assertThat(result).isNotNull();
                        assertThat(result.severity()).isEqualTo(AlertSeverity.HIGH);

                        verify(alertRepository).save(alertCaptor.capture());
                        assertThat(alertCaptor.getValue().getSeverity()).isEqualTo(AlertSeverity.HIGH);

                        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/live"), eq(mappedVm));
                        verify(messagingTemplate, never()).convertAndSend(eq("/topic/alerts/critical"),
                                        any(AlertVm.class));
                        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/drone/drone-uuid-001"),
                                        eq(mappedVm));
                        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/flight/flight-uuid-001"),
                                        eq(mappedVm));
                }

                @Test
                @DisplayName("createAlert with blank severity should default to HIGH")
                void createAlert_withBlankSeverity_defaultsToHigh() {
                        AlertPostVm postVm = new AlertPostVm(
                                        "GEOFENCE_BREACH",
                                        "   ",
                                        null,
                                        null,
                                        null,
                                        "Geofence polygon breached",
                                        null);

                        Alert entity = new Alert();
                        Alert savedEntity = createSampleAlert("alert-uuid-003", "GEOFENCE_BREACH", AlertSeverity.HIGH,
                                        AlertStatus.ACTIVE);
                        AlertVm mappedVm = new AlertVm(
                                        "alert-uuid-003",
                                        "GEOFENCE_BREACH",
                                        AlertSeverity.HIGH,
                                        AlertStatus.ACTIVE,
                                        null,
                                        null,
                                        null,
                                        "Geofence polygon breached",
                                        null,
                                        false,
                                        null,
                                        null,
                                        false,
                                        null,
                                        null,
                                        null,
                                        ZonedDateTime.now(),
                                        "SYSTEM",
                                        ZonedDateTime.now(),
                                        "SYSTEM");

                        when(alertMapper.toEntity(postVm)).thenReturn(entity);
                        when(alertRepository.save(entity)).thenReturn(savedEntity);
                        when(alertMapper.toVm(savedEntity)).thenReturn(mappedVm);

                        AlertVm result = alertService.createAlert(postVm);

                        assertThat(result).isNotNull();
                        assertThat(result.severity()).isEqualTo(AlertSeverity.HIGH);

                        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/live"), eq(mappedVm));
                        verify(messagingTemplate, never()).convertAndSend(eq("/topic/alerts/critical"),
                                        any(AlertVm.class));
                        verify(messagingTemplate, never()).convertAndSend(eq("/topic/alerts/drone/null"),
                                        any(AlertVm.class));
                        verify(messagingTemplate, never()).convertAndSend(eq("/topic/alerts/flight/null"),
                                        any(AlertVm.class));
                }

                @Test
                @DisplayName("createAlert with authenticated operator should populate createdBy from security context")
                void createAlert_withAuthenticatedOperator_populatesCreatedByFromSecurityContext() {
                        Authentication auth = mock(Authentication.class);
                        when(auth.getName()).thenReturn("atc_controller_1");
                        SecurityContext securityContext = mock(SecurityContext.class);
                        when(securityContext.getAuthentication()).thenReturn(auth);
                        SecurityContextHolder.setContext(securityContext);

                        AlertPostVm postVm = new AlertPostVm(
                                        "MANUAL_ALERT",
                                        "MEDIUM",
                                        "flight-uuid-001",
                                        "drone-uuid-001",
                                        null,
                                        "Manual visual traffic alert",
                                        null);

                        Alert entity = new Alert();
                        Alert savedEntity = createSampleAlert("alert-uuid-004", "MANUAL_ALERT", AlertSeverity.MEDIUM,
                                        AlertStatus.ACTIVE);
                        savedEntity.setCreatedBy("atc_controller_1");
                        AlertVm mappedVm = createSampleAlertVm("alert-uuid-004", "MANUAL_ALERT", AlertSeverity.MEDIUM,
                                        AlertStatus.ACTIVE);

                        when(alertMapper.toEntity(postVm)).thenReturn(entity);
                        when(alertRepository.save(entity)).thenReturn(savedEntity);
                        when(alertMapper.toVm(savedEntity)).thenReturn(mappedVm);

                        AlertVm result = alertService.createAlert(postVm);

                        assertThat(result).isNotNull();
                        verify(alertRepository).save(alertCaptor.capture());
                        assertThat(alertCaptor.getValue().getCreatedBy()).isEqualTo("atc_controller_1");
                }

                @Test
                @DisplayName("createAlert preserves pre-existing createdBy on mapped entity")
                void createAlert_whenEntityAlreadyHasCreatedBy_preservesExistingCreator() {
                        AlertPostVm postVm = new AlertPostVm(
                                        "SYSTEM_FAULT",
                                        "HIGH",
                                        null,
                                        null,
                                        null,
                                        "Sensor communication failed",
                                        null);

                        Alert entity = new Alert();
                        entity.setCreatedBy("predefined_agent");

                        Alert savedEntity = createSampleAlert("alert-uuid-005", "SYSTEM_FAULT", AlertSeverity.HIGH,
                                        AlertStatus.ACTIVE);
                        savedEntity.setCreatedBy("predefined_agent");
                        AlertVm mappedVm = createSampleAlertVm("alert-uuid-005", "SYSTEM_FAULT", AlertSeverity.HIGH,
                                        AlertStatus.ACTIVE);

                        when(alertMapper.toEntity(postVm)).thenReturn(entity);
                        when(alertRepository.save(entity)).thenReturn(savedEntity);
                        when(alertMapper.toVm(savedEntity)).thenReturn(mappedVm);

                        AlertVm result = alertService.createAlert(postVm);

                        assertThat(result).isNotNull();
                        verify(alertRepository).save(alertCaptor.capture());
                        assertThat(alertCaptor.getValue().getCreatedBy()).isEqualTo("predefined_agent");
                }

                @Test
                @DisplayName("createAlert should not fail when WebSocket broker throws exception")
                void createAlert_whenWebSocketThrowsException_recoversGracefullyAndReturnsVm() {
                        AlertPostVm postVm = new AlertPostVm(
                                        "BATTERY_LOW",
                                        "CRITICAL",
                                        "flight-uuid-001",
                                        "drone-uuid-001",
                                        null,
                                        "Battery low",
                                        null);

                        Alert entity = new Alert();
                        Alert savedEntity = createSampleAlert("alert-uuid-006", "BATTERY_LOW", AlertSeverity.CRITICAL,
                                        AlertStatus.ACTIVE);
                        AlertVm mappedVm = createSampleAlertVm("alert-uuid-006", "BATTERY_LOW", AlertSeverity.CRITICAL,
                                        AlertStatus.ACTIVE);

                        when(alertMapper.toEntity(postVm)).thenReturn(entity);
                        when(alertRepository.save(entity)).thenReturn(savedEntity);
                        when(alertMapper.toVm(savedEntity)).thenReturn(mappedVm);
                        doThrow(new RuntimeException("STOMP connection reset"))
                                        .when(messagingTemplate).convertAndSend(eq("/topic/alerts/live"), eq(mappedVm));

                        AlertVm result = alertService.createAlert(postVm);

                        assertThat(result).isNotNull();
                        assertThat(result.id()).isEqualTo("alert-uuid-006");
                        verify(alertRepository).save(any(Alert.class));
                }
        }

        @Nested
        @DisplayName("getAlertById Endpoint Tests")
        class GetAlertByIdTests {

                @Test
                @DisplayName("getAlertById returns mapped VM when alert exists")
                void getAlertById_whenFound_returnsMappedVm() {
                        String alertId = "alert-uuid-100";
                        Alert alert = createSampleAlert(alertId, "3D_VOLUME_BREACH", AlertSeverity.HIGH,
                                        AlertStatus.ACTIVE);
                        AlertVm expectedVm = createSampleAlertVm(alertId, "3D_VOLUME_BREACH", AlertSeverity.HIGH,
                                        AlertStatus.ACTIVE);

                        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));
                        when(alertMapper.toVm(alert)).thenReturn(expectedVm);

                        AlertVm result = alertService.getAlertById(alertId);

                        assertThat(result).isNotNull();
                        assertThat(result.id()).isEqualTo(alertId);
                        assertThat(result.alertType()).isEqualTo("3D_VOLUME_BREACH");
                        assertThat(result.severity()).isEqualTo(AlertSeverity.HIGH);
                        assertThat(result.status()).isEqualTo(AlertStatus.ACTIVE);
                }

                @Test
                @DisplayName("getAlertById throws NotFoundException when alert does not exist")
                void getAlertById_whenNotFound_throwsNotFoundException() {
                        String alertId = "non-existent-alert";
                        when(alertRepository.findById(alertId)).thenReturn(Optional.empty());

                        assertThatThrownBy(() -> alertService.getAlertById(alertId))
                                        .isInstanceOf(NotFoundException.class)
                                        .hasMessageContaining(alertId);
                }
        }

        @Nested
        @DisplayName("getAlerts Endpoint Tests")
        class GetAlertsTests {

                @Test
                @DisplayName("getAlerts with filters executes specification and returns paginated result")
                @SuppressWarnings("unchecked")
                void getAlerts_withMultiFieldFilters_buildsSpecificationAndReturnsListVm() {
                        Alert alert = createSampleAlert("alert-uuid-201", "CONFLICT_PROXIMITY", AlertSeverity.CRITICAL,
                                        AlertStatus.ACTIVE);
                        AlertVm alertVm = createSampleAlertVm("alert-uuid-201", "CONFLICT_PROXIMITY",
                                        AlertSeverity.CRITICAL,
                                        AlertStatus.ACTIVE);
                        Page<Alert> page = new PageImpl<>(List.of(alert), PageRequest.of(0, 20), 1);

                        when(alertRepository.findAll(any(Specification.class), any(PageRequest.class)))
                                        .thenReturn(page);
                        when(alertMapper.toVmList(page.getContent())).thenReturn(List.of(alertVm));

                        AlertListVm result = alertService.getAlerts(
                                        "drone-uuid-001",
                                        "flight-uuid-001",
                                        "CRITICAL",
                                        false,
                                        false,
                                        "CONFLICT_PROXIMITY",
                                        0,
                                        20);

                        assertThat(result).isNotNull();
                        assertThat(result.content()).hasSize(1);
                        assertThat(result.totalElements()).isEqualTo(1);
                        assertThat(result.totalPages()).isEqualTo(1);
                        assertThat(result.pageNo()).isZero();
                        assertThat(result.pageSize()).isEqualTo(20);
                        assertThat(result.isLast()).isTrue();

                        verify(alertRepository).findAll(specCaptor.capture(), pageRequestCaptor.capture());
                        assertThat(pageRequestCaptor.getValue().getPageNumber()).isZero();
                        assertThat(pageRequestCaptor.getValue().getPageSize()).isEqualTo(20);

                        Specification<Alert> spec = specCaptor.getValue();
                        Root<Alert> root = mock(Root.class);
                        CriteriaQuery<?> query = mock(CriteriaQuery.class);
                        CriteriaBuilder cb = mock(CriteriaBuilder.class);
                        Path<Object> dronePath = mock(Path.class);
                        Path<Object> flightPath = mock(Path.class);
                        Path<Object> severityPath = mock(Path.class);
                        Path<Object> ackPath = mock(Path.class);
                        Path<Object> resolvedPath = mock(Path.class);
                        Path<Object> typePath = mock(Path.class);

                        when(root.get("droneId")).thenReturn(dronePath);
                        when(root.get("flightId")).thenReturn(flightPath);
                        when(root.get("severity")).thenReturn(severityPath);
                        when(root.get("acknowledged")).thenReturn(ackPath);
                        when(root.get("resolved")).thenReturn(resolvedPath);
                        when(root.get("alertType")).thenReturn(typePath);

                        Predicate p1 = mock(Predicate.class);
                        when(cb.equal(dronePath, "drone-uuid-001")).thenReturn(p1);
                        when(cb.equal(flightPath, "flight-uuid-001")).thenReturn(p1);
                        when(cb.equal(severityPath, AlertSeverity.CRITICAL)).thenReturn(p1);
                        when(cb.equal(ackPath, false)).thenReturn(p1);
                        when(cb.equal(resolvedPath, false)).thenReturn(p1);
                        when(cb.equal(typePath, "CONFLICT_PROXIMITY")).thenReturn(p1);
                        when(cb.and(any(Predicate[].class))).thenReturn(p1);

                        Predicate finalPredicate = spec.toPredicate(root, query, cb);
                        assertThat(finalPredicate).isNotNull();
                }

                @Test
                @DisplayName("getAlerts with negative page index normalizes page to zero")
                @SuppressWarnings("unchecked")
                void getAlerts_withNegativePage_normalizesToZero() {
                        Page<Alert> emptyPage = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 20), 0);
                        when(alertRepository.findAll(any(Specification.class), any(PageRequest.class)))
                                        .thenReturn(emptyPage);
                        when(alertMapper.toVmList(Collections.emptyList())).thenReturn(Collections.emptyList());

                        AlertListVm result = alertService.getAlerts(null, null, null, null, null, null, -5, 20);

                        assertThat(result.pageNo()).isZero();
                        verify(alertRepository).findAll(any(Specification.class), pageRequestCaptor.capture());
                        assertThat(pageRequestCaptor.getValue().getPageNumber()).isZero();
                }

                @Test
                @DisplayName("getAlerts with zero or negative page size normalizes size to twenty")
                @SuppressWarnings("unchecked")
                void getAlerts_withNonPositivePageSize_normalizesToTwenty() {
                        Page<Alert> emptyPage = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 20), 0);
                        when(alertRepository.findAll(any(Specification.class), any(PageRequest.class)))
                                        .thenReturn(emptyPage);
                        when(alertMapper.toVmList(Collections.emptyList())).thenReturn(Collections.emptyList());

                        AlertListVm result = alertService.getAlerts(null, null, null, null, null, null, 0, 0);

                        assertThat(result.pageSize()).isEqualTo(20);
                        verify(alertRepository).findAll(any(Specification.class), pageRequestCaptor.capture());
                        assertThat(pageRequestCaptor.getValue().getPageSize()).isEqualTo(20);
                }

                @Test
                @DisplayName("getAlerts with page size exceeding 100 normalizes size to one hundred")
                @SuppressWarnings("unchecked")
                void getAlerts_withPageSizeExceedingHundred_normalizesToOneHundred() {
                        Page<Alert> emptyPage = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 100), 0);
                        when(alertRepository.findAll(any(Specification.class), any(PageRequest.class)))
                                        .thenReturn(emptyPage);
                        when(alertMapper.toVmList(Collections.emptyList())).thenReturn(Collections.emptyList());

                        AlertListVm result = alertService.getAlerts(null, null, null, null, null, null, 0, 500);

                        assertThat(result.pageSize()).isEqualTo(100);
                        verify(alertRepository).findAll(any(Specification.class), pageRequestCaptor.capture());
                        assertThat(pageRequestCaptor.getValue().getPageSize()).isEqualTo(100);
                }

                @Test
                @DisplayName("getAlerts with null filters constructs empty predicate list")
                @SuppressWarnings("unchecked")
                void getAlerts_withNullFilters_buildsEmptyPredicateSpecification() {
                        Page<Alert> emptyPage = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 20), 0);
                        when(alertRepository.findAll(any(Specification.class), any(PageRequest.class)))
                                        .thenReturn(emptyPage);
                        when(alertMapper.toVmList(Collections.emptyList())).thenReturn(Collections.emptyList());

                        alertService.getAlerts(null, null, null, null, null, null, 0, 20);

                        verify(alertRepository).findAll(specCaptor.capture(), any(PageRequest.class));
                        Specification<Alert> spec = specCaptor.getValue();
                        Root<Alert> root = mock(Root.class);
                        CriteriaQuery<?> query = mock(CriteriaQuery.class);
                        CriteriaBuilder cb = mock(CriteriaBuilder.class);
                        Predicate andPredicate = mock(Predicate.class);
                        when(cb.and(any(Predicate[].class))).thenReturn(andPredicate);

                        Predicate result = spec.toPredicate(root, query, cb);
                        assertThat(result).isNotNull();
                }
        }

        @Nested
        @DisplayName("getActiveAlerts Endpoint Tests")
        class GetActiveAlertsTests {

                @Test
                @DisplayName("getActiveAlerts returns only unresolved alerts ordered by createdOn desc")
                void getActiveAlerts_returnsUnresolvedAlerts() {
                        Alert alert1 = createSampleAlert("alert-uuid-301", "C2_LINK_LOST", AlertSeverity.CRITICAL,
                                        AlertStatus.ACTIVE);
                        Alert alert2 = createSampleAlert("alert-uuid-302", "BATTERY_LOW", AlertSeverity.HIGH,
                                        AlertStatus.ACKNOWLEDGED);
                        AlertVm vm1 = createSampleAlertVm("alert-uuid-301", "C2_LINK_LOST", AlertSeverity.CRITICAL,
                                        AlertStatus.ACTIVE);
                        AlertVm vm2 = createSampleAlertVm("alert-uuid-302", "BATTERY_LOW", AlertSeverity.HIGH,
                                        AlertStatus.ACKNOWLEDGED);

                        when(alertRepository.findByResolvedFalseOrderByCreatedOnDesc())
                                        .thenReturn(List.of(alert1, alert2));
                        when(alertMapper.toVmList(List.of(alert1, alert2))).thenReturn(List.of(vm1, vm2));

                        List<AlertVm> results = alertService.getActiveAlerts();

                        assertThat(results).hasSize(2);
                        assertThat(results.get(0).id()).isEqualTo("alert-uuid-301");
                        assertThat(results.get(1).id()).isEqualTo("alert-uuid-302");
                        verify(alertRepository).findByResolvedFalseOrderByCreatedOnDesc();
                }

                @Test
                @DisplayName("getActiveAlerts returns empty list when no active alerts exist")
                void getActiveAlerts_whenNone_returnsEmptyList() {
                        when(alertRepository.findByResolvedFalseOrderByCreatedOnDesc())
                                        .thenReturn(Collections.emptyList());
                        when(alertMapper.toVmList(Collections.emptyList())).thenReturn(Collections.emptyList());

                        List<AlertVm> results = alertService.getActiveAlerts();

                        assertThat(results).isEmpty();
                }
        }

        @Nested
        @DisplayName("getAlertsByFlight Endpoint Tests")
        class GetAlertsByFlightTests {

                @Test
                @DisplayName("getAlertsByFlight returns alerts associated with specified flight")
                void getAlertsByFlight_whenFound_returnsFlightAlerts() {
                        String flightId = "flight-uuid-400";
                        Alert alert = createSampleAlert("alert-uuid-401", "VERTICAL_ALTITUDE_BREACH",
                                        AlertSeverity.HIGH,
                                        AlertStatus.ACTIVE);
                        AlertVm vm = createSampleAlertVm("alert-uuid-401", "VERTICAL_ALTITUDE_BREACH",
                                        AlertSeverity.HIGH,
                                        AlertStatus.ACTIVE);

                        when(alertRepository.findByFlightIdOrderByCreatedOnDesc(flightId)).thenReturn(List.of(alert));
                        when(alertMapper.toVmList(List.of(alert))).thenReturn(List.of(vm));

                        List<AlertVm> results = alertService.getAlertsByFlight(flightId);

                        assertThat(results).hasSize(1);
                        assertThat(results.get(0).flightId()).isEqualTo("flight-uuid-001");
                        verify(alertRepository).findByFlightIdOrderByCreatedOnDesc(flightId);
                }

                @Test
                @DisplayName("getAlertsByFlight returns empty list when no alerts exist for flight")
                void getAlertsByFlight_whenNone_returnsEmptyList() {
                        String flightId = "flight-uuid-empty";
                        when(alertRepository.findByFlightIdOrderByCreatedOnDesc(flightId))
                                        .thenReturn(Collections.emptyList());
                        when(alertMapper.toVmList(Collections.emptyList())).thenReturn(Collections.emptyList());

                        List<AlertVm> results = alertService.getAlertsByFlight(flightId);

                        assertThat(results).isEmpty();
                }
        }

        @Nested
        @DisplayName("acknowledgeAlert Endpoint Tests")
        class AcknowledgeAlertTests {

                @Test
                @DisplayName("acknowledgeAlert transitions ACTIVE alert to ACKNOWLEDGED and sets operator and note")
                void acknowledgeAlert_whenActive_transitionsToAcknowledged() {
                        String alertId = "alert-uuid-501";
                        Alert alert = createSampleAlert(alertId, "LATERAL_CORRIDOR_BREACH", AlertSeverity.HIGH,
                                        AlertStatus.ACTIVE);
                        AlertAcknowledgePostVm ackVm = new AlertAcknowledgePostVm("Operator tracking drift",
                                        "operator_sarah");

                        Alert updatedAlert = createSampleAlert(alertId, "LATERAL_CORRIDOR_BREACH", AlertSeverity.HIGH,
                                        AlertStatus.ACKNOWLEDGED);
                        updatedAlert.setAcknowledged(true);
                        updatedAlert.setAcknowledgedBy("operator_sarah");
                        updatedAlert.setAcknowledgedAt(ZonedDateTime.now());
                        updatedAlert.setResolutionNotes("[Ack Note by operator_sarah]: Operator tracking drift");

                        AlertVm expectedVm = createSampleAlertVm(alertId, "LATERAL_CORRIDOR_BREACH", AlertSeverity.HIGH,
                                        AlertStatus.ACKNOWLEDGED);

                        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));
                        when(alertRepository.save(alert)).thenReturn(updatedAlert);
                        when(alertMapper.toVm(updatedAlert)).thenReturn(expectedVm);

                        AlertVm result = alertService.acknowledgeAlert(alertId, ackVm);

                        assertThat(result).isNotNull();
                        assertThat(result.status()).isEqualTo(AlertStatus.ACKNOWLEDGED);

                        verify(alertRepository).save(alertCaptor.capture());
                        Alert captured = alertCaptor.getValue();
                        assertThat(captured.getAcknowledged()).isTrue();
                        assertThat(captured.getAcknowledgedAt()).isNotNull();
                        assertThat(captured.getAcknowledgedBy()).isEqualTo("operator_sarah");
                        assertThat(captured.getStatus()).isEqualTo(AlertStatus.ACKNOWLEDGED);
                        assertThat(captured.getResolutionNotes())
                                        .isEqualTo("[Ack Note by operator_sarah]: Operator tracking drift");

                        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/live"), eq(expectedVm));
                }

                @Test
                @DisplayName("acknowledgeAlert with existing notes appends new note with newline")
                void acknowledgeAlert_withExistingNotes_appendsNoteWithNewline() {
                        String alertId = "alert-uuid-502";
                        Alert alert = createSampleAlert(alertId, "LATERAL_CORRIDOR_BREACH", AlertSeverity.HIGH,
                                        AlertStatus.ACTIVE);
                        alert.setResolutionNotes("Initial assessment: Wind shear detected");
                        AlertAcknowledgePostVm ackVm = new AlertAcknowledgePostVm("Instructed drone to hold position",
                                        "operator_mike");

                        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));
                        when(alertRepository.save(alert)).thenReturn(alert);
                        when(alertMapper.toVm(alert)).thenReturn(createSampleAlertVm(alertId, "LATERAL_CORRIDOR_BREACH",
                                        AlertSeverity.HIGH, AlertStatus.ACKNOWLEDGED));

                        alertService.acknowledgeAlert(alertId, ackVm);

                        verify(alertRepository).save(alertCaptor.capture());
                        Alert captured = alertCaptor.getValue();
                        assertThat(captured.getResolutionNotes())
                                        .isEqualTo(
                                                        "Initial assessment: Wind shear detected\n[Ack Note by operator_mike]: Instructed drone to hold position");
                }

                @Test
                @DisplayName("acknowledgeAlert when alert is already RESOLVED preserves RESOLVED status")
                void acknowledgeAlert_whenAlreadyResolved_preservesResolvedStatus() {
                        String alertId = "alert-uuid-503";
                        Alert alert = createSampleAlert(alertId, "LATERAL_CORRIDOR_BREACH", AlertSeverity.HIGH,
                                        AlertStatus.RESOLVED);
                        AlertAcknowledgePostVm ackVm = new AlertAcknowledgePostVm("Belated ack check", "audit_user");

                        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));
                        when(alertRepository.save(alert)).thenReturn(alert);
                        when(alertMapper.toVm(alert)).thenReturn(
                                        createSampleAlertVm(alertId, "LATERAL_CORRIDOR_BREACH", AlertSeverity.HIGH,
                                                        AlertStatus.RESOLVED));

                        alertService.acknowledgeAlert(alertId, ackVm);

                        verify(alertRepository).save(alertCaptor.capture());
                        Alert captured = alertCaptor.getValue();
                        assertThat(captured.getStatus()).isEqualTo(AlertStatus.RESOLVED);
                        assertThat(captured.getAcknowledged()).isTrue();
                }

                @Test
                @DisplayName("acknowledgeAlert with null DTO falls back to SecurityContext or SYSTEM")
                void acknowledgeAlert_withNullDto_fallsBackToSystem() {
                        String alertId = "alert-uuid-504";
                        Alert alert = createSampleAlert(alertId, "LATERAL_CORRIDOR_BREACH", AlertSeverity.HIGH,
                                        AlertStatus.ACTIVE);

                        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));
                        when(alertRepository.save(alert)).thenReturn(alert);
                        when(alertMapper.toVm(alert)).thenReturn(createSampleAlertVm(alertId, "LATERAL_CORRIDOR_BREACH",
                                        AlertSeverity.HIGH, AlertStatus.ACKNOWLEDGED));

                        alertService.acknowledgeAlert(alertId, null);

                        verify(alertRepository).save(alertCaptor.capture());
                        Alert captured = alertCaptor.getValue();
                        assertThat(captured.getAcknowledgedBy()).isEqualTo("SYSTEM");
                        assertThat(captured.getAcknowledged()).isTrue();
                }

                @Test
                @DisplayName("acknowledgeAlert throws NotFoundException when alert does not exist")
                void acknowledgeAlert_whenNotFound_throwsNotFoundException() {
                        String alertId = "non-existent-alert";
                        when(alertRepository.findById(alertId)).thenReturn(Optional.empty());

                        assertThatThrownBy(() -> alertService.acknowledgeAlert(alertId,
                                        new AlertAcknowledgePostVm("note", "op")))
                                        .isInstanceOf(NotFoundException.class)
                                        .hasMessageContaining(alertId);

                        verify(alertRepository, never()).save(any(Alert.class));
                }
        }

        @Nested
        @DisplayName("resolveAlert Endpoint Tests")
        class ResolveAlertTests {

                @Test
                @DisplayName("resolveAlert marks alert as RESOLVED and records resolution timestamp, operator and notes")
                void resolveAlert_whenValid_updatesStatusToResolved() {
                        String alertId = "alert-uuid-601";
                        Alert alert = createSampleAlert(alertId, "CONFLICT_PROXIMITY", AlertSeverity.CRITICAL,
                                        AlertStatus.ACKNOWLEDGED);
                        AlertResolvePostVm resolveVm = new AlertResolvePostVm(
                                        "Intruder cleared conflict zone, nominal separation restored",
                                        "operator_dave");

                        Alert updatedAlert = createSampleAlert(alertId, "CONFLICT_PROXIMITY", AlertSeverity.CRITICAL,
                                        AlertStatus.RESOLVED);
                        updatedAlert.setResolved(true);
                        updatedAlert.setResolvedAt(ZonedDateTime.now());
                        updatedAlert.setResolvedBy("operator_dave");
                        updatedAlert.setResolutionNotes(
                                        "[Resolution by operator_dave]: Intruder cleared conflict zone, nominal separation restored");

                        AlertVm expectedVm = createSampleAlertVm(alertId, "CONFLICT_PROXIMITY", AlertSeverity.CRITICAL,
                                        AlertStatus.RESOLVED);

                        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));
                        when(alertRepository.save(alert)).thenReturn(updatedAlert);
                        when(alertMapper.toVm(updatedAlert)).thenReturn(expectedVm);

                        AlertVm result = alertService.resolveAlert(alertId, resolveVm);

                        assertThat(result).isNotNull();
                        assertThat(result.status()).isEqualTo(AlertStatus.RESOLVED);

                        verify(alertRepository).save(alertCaptor.capture());
                        Alert captured = alertCaptor.getValue();
                        assertThat(captured.getResolved()).isTrue();
                        assertThat(captured.getResolvedAt()).isNotNull();
                        assertThat(captured.getResolvedBy()).isEqualTo("operator_dave");
                        assertThat(captured.getStatus()).isEqualTo(AlertStatus.RESOLVED);
                        assertThat(captured.getResolutionNotes())
                                        .isEqualTo(
                                                        "[Resolution by operator_dave]: Intruder cleared conflict zone, nominal separation restored");

                        verify(messagingTemplate).convertAndSend(eq("/topic/alerts/live"), eq(expectedVm));
                }

                @Test
                @DisplayName("resolveAlert with existing notes appends resolution notes with newline")
                void resolveAlert_withExistingNotes_appendsResolutionWithNewline() {
                        String alertId = "alert-uuid-602";
                        Alert alert = createSampleAlert(alertId, "BATTERY_LOW", AlertSeverity.HIGH,
                                        AlertStatus.ACKNOWLEDGED);
                        alert.setResolutionNotes("[Ack Note by operator_bob]: Tracking safe return-to-launch");
                        AlertResolvePostVm resolveVm = new AlertResolvePostVm("Drone safely landed at Hub Alpha",
                                        "operator_bob");

                        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));
                        when(alertRepository.save(alert)).thenReturn(alert);
                        when(alertMapper.toVm(alert))
                                        .thenReturn(createSampleAlertVm(alertId, "BATTERY_LOW", AlertSeverity.HIGH,
                                                        AlertStatus.RESOLVED));

                        alertService.resolveAlert(alertId, resolveVm);

                        verify(alertRepository).save(alertCaptor.capture());
                        Alert captured = alertCaptor.getValue();
                        assertThat(captured.getResolutionNotes())
                                        .isEqualTo(
                                                        "[Ack Note by operator_bob]: Tracking safe return-to-launch\n[Resolution by operator_bob]: Drone safely landed at Hub Alpha");
                }

                @Test
                @DisplayName("resolveAlert with null DTO falls back to SecurityContext or SYSTEM")
                void resolveAlert_withNullDto_fallsBackToSystem() {
                        String alertId = "alert-uuid-603";
                        Alert alert = createSampleAlert(alertId, "BATTERY_LOW", AlertSeverity.HIGH, AlertStatus.ACTIVE);

                        when(alertRepository.findById(alertId)).thenReturn(Optional.of(alert));
                        when(alertRepository.save(alert)).thenReturn(alert);
                        when(alertMapper.toVm(alert))
                                        .thenReturn(createSampleAlertVm(alertId, "BATTERY_LOW", AlertSeverity.HIGH,
                                                        AlertStatus.RESOLVED));

                        alertService.resolveAlert(alertId, null);

                        verify(alertRepository).save(alertCaptor.capture());
                        Alert captured = alertCaptor.getValue();
                        assertThat(captured.getResolvedBy()).isEqualTo("SYSTEM");
                        assertThat(captured.getResolved()).isTrue();
                        assertThat(captured.getStatus()).isEqualTo(AlertStatus.RESOLVED);
                }

                @Test
                @DisplayName("resolveAlert throws NotFoundException when alert does not exist")
                void resolveAlert_whenNotFound_throwsNotFoundException() {
                        String alertId = "non-existent-alert";
                        when(alertRepository.findById(alertId)).thenReturn(Optional.empty());

                        assertThatThrownBy(
                                        () -> alertService.resolveAlert(alertId, new AlertResolvePostVm("notes", "op")))
                                        .isInstanceOf(NotFoundException.class)
                                        .hasMessageContaining(alertId);

                        verify(alertRepository, never()).save(any(Alert.class));
                }
        }
}
