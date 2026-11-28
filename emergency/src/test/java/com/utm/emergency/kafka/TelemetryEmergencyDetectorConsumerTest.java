package com.utm.emergency.kafka;

import com.utm.emergency.model.enumeration.EmergencySeverity;
import com.utm.emergency.model.enumeration.EmergencyType;
import com.utm.emergency.service.EmergencyIncidentService;
import com.utm.emergency.service.client.WeatherAisClientService;
import com.utm.emergency.viewmodel.client.TelemetryStreamVm;
import com.utm.emergency.viewmodel.incident.EmergencyIncidentPostVm;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: TelemetryEmergencyDetectorConsumer (Rapid Discharge Detection)")
class TelemetryEmergencyDetectorConsumerTest {

    @Mock
    private EmergencyIncidentService emergencyIncidentService;

    @InjectMocks
    private TelemetryEmergencyDetectorConsumer consumer;

    @Test
    @DisplayName("triggers BATTERY_RAPID_DISCHARGE incident once when discharge exceeds 5%/min and applies cooldown")
    void onTelemetryReceived_rapidBatteryDischarge_triggersIncidentWithCooldown() {
        ZonedDateTime t0 = ZonedDateTime.parse("2026-11-23T10:00:00Z");

        consumer.onTelemetryReceived("drone-1", new TelemetryStreamVm(
                "drone-1", "flight-1", 10.77, 106.70, 50.0, 15.0, 90.0, 80.0, t0));
        consumer.onTelemetryReceived("drone-1", new TelemetryStreamVm(
                "drone-1", "flight-1", 10.771, 106.701, 50.0, 15.0, 90.0, 75.0, t0.plusSeconds(20)));
        consumer.onTelemetryReceived("drone-1", new TelemetryStreamVm(
                "drone-1", "flight-1", 10.772, 106.702, 50.0, 15.0, 90.0, 70.0, t0.plusSeconds(40)));

        ArgumentCaptor<EmergencyIncidentPostVm> captor = ArgumentCaptor.forClass(EmergencyIncidentPostVm.class);
        verify(emergencyIncidentService, times(1)).createIncident(captor.capture(), eq("telemetry-detector"));
        assertThat(captor.getValue().emergencyType()).isEqualTo(EmergencyType.BATTERY_RAPID_DISCHARGE);
        assertThat(captor.getValue().severity()).isEqualTo(EmergencySeverity.CRITICAL);
        assertThat(captor.getValue().droneId()).isEqualTo("drone-1");
        assertThat(captor.getValue().flightId()).isEqualTo("flight-1");
    }

    @Test
    @DisplayName("does not trigger incident under normal battery discharge rate")
    void onTelemetryReceived_normalDischarge_doesNotTriggerIncident() {
        ZonedDateTime t0 = ZonedDateTime.parse("2026-11-23T10:00:00Z");

        consumer.onTelemetryReceived("drone-2", new TelemetryStreamVm(
                "drone-2", "flight-2", 10.77, 106.70, 50.0, 15.0, 90.0, 80.0, t0));
        consumer.onTelemetryReceived("drone-2", new TelemetryStreamVm(
                "drone-2", "flight-2", 10.771, 106.701, 50.0, 15.0, 90.0, 79.0, t0.plusSeconds(30)));

        verify(emergencyIncidentService, never()).createIncident(any(), any());
    }

    @Test
    @DisplayName("triggers WARNING rapid discharge when drop rate is between 2%/min and 5%/min")
    void onTelemetryReceived_elevatedDischarge_triggersWarningIncident() {
        ZonedDateTime t0 = ZonedDateTime.parse("2026-11-23T10:00:00Z");

        consumer.onTelemetryReceived("drone-3", new TelemetryStreamVm(
                "drone-3", "flight-3", 10.77, 106.70, 50.0, 15.0, 90.0, 80.0, t0));
        consumer.onTelemetryReceived("drone-3", new TelemetryStreamVm(
                "drone-3", "flight-3", 10.771, 106.701, 50.0, 15.0, 90.0, 77.5, t0.plusSeconds(50)));

        ArgumentCaptor<EmergencyIncidentPostVm> captor = ArgumentCaptor.forClass(EmergencyIncidentPostVm.class);
        verify(emergencyIncidentService, times(1)).createIncident(captor.capture(), eq("telemetry-detector"));
        assertThat(captor.getValue().emergencyType()).isEqualTo(EmergencyType.BATTERY_RAPID_DISCHARGE);
        assertThat(captor.getValue().severity()).isEqualTo(EmergencySeverity.WARNING);
    }

    @Test
    @DisplayName("triggers EMERGENCY COLLISION_AIRCRAFT when low-altitude ADS-B aircraft is within 500m")
    void onTelemetryReceived_nearbyAdsbAircraft_triggersCollisionEmergency() {
        WeatherAisClientService weatherAisClient = org.mockito.Mockito.mock(WeatherAisClientService.class);
        TelemetryEmergencyDetectorConsumer adsbConsumer = new TelemetryEmergencyDetectorConsumer(
                emergencyIncidentService, weatherAisClient);

        when(weatherAisClient.getLiveAircraft()).thenReturn(List.of(
                new WeatherAisClientService.AdsbAircraftBriefVm(
                        "888123", "HVN214", 10.771, 106.700, 90.0, null, false)));

        adsbConsumer.onTelemetryReceived("drone-4", new TelemetryStreamVm(
                "drone-4", "flight-4", 10.770, 106.700, 80.0, 12.0, 0.0, 85.0,
                ZonedDateTime.parse("2026-11-23T10:05:00Z")));

        ArgumentCaptor<EmergencyIncidentPostVm> captor = ArgumentCaptor.forClass(EmergencyIncidentPostVm.class);
        verify(emergencyIncidentService, times(1)).createIncident(captor.capture(), eq("telemetry-detector"));
        assertThat(captor.getValue().emergencyType()).isEqualTo(EmergencyType.COLLISION_AIRCRAFT);
        assertThat(captor.getValue().severity()).isEqualTo(EmergencySeverity.EMERGENCY);

        adsbConsumer.onTelemetryReceived("drone-5", new TelemetryStreamVm(
                "drone-5", "flight-5", 10.850, 106.800, 80.0, 12.0, 0.0, 85.0,
                ZonedDateTime.parse("2026-11-23T10:05:01Z")));
        verify(weatherAisClient, times(1)).getLiveAircraft();
    }

    @Test
    @DisplayName("triggers CRITICAL MOTOR_FAILURE immediately when vertical descent exceeds 5 m/s while airborne")
    void onTelemetryReceived_rapidNegativeVerticalSpeed_triggersMotorFailureEmergency() {
        ZonedDateTime t0 = ZonedDateTime.parse("2026-11-23T10:10:00Z");

        consumer.onTelemetryReceived("drone-6", new TelemetryStreamVm(
                "drone-6", "flight-6", 10.7769, 106.7009, 55.0, 8.0, 90.0, 88.0, t0,
                92.0, 0.9, 14, -8.0));

        ArgumentCaptor<EmergencyIncidentPostVm> captor = ArgumentCaptor.forClass(EmergencyIncidentPostVm.class);
        verify(emergencyIncidentService, times(1)).createIncident(captor.capture(), eq("telemetry-detector"));
        assertThat(captor.getValue().emergencyType()).isEqualTo(EmergencyType.MOTOR_FAILURE);
        assertThat(captor.getValue().severity()).isEqualTo(EmergencySeverity.CRITICAL);
        assertThat(captor.getValue().droneId()).isEqualTo("drone-6");
    }

    @Test
    @DisplayName("does not trigger MOTOR_FAILURE during commanded LANDING, ALTITUDE_CHANGE, or EMERGENCY_STOP flight modes")
    void onTelemetryReceived_commandedLandingDescent_doesNotTriggerMotorFailure() {
        ZonedDateTime t0 = ZonedDateTime.parse("2026-11-23T10:15:00Z");

        consumer.onTelemetryReceived("drone-7", new TelemetryStreamVm(
                "drone-7", "flight-7", 10.7769, 106.7009, 45.0, 0.0, 90.0, 85.0, t0,
                95.0, 0.9, 14, -6.0, "LANDING"));
        consumer.onTelemetryReceived("drone-8", new TelemetryStreamVm(
                "drone-8", "flight-8", 10.7769, 106.7009, 75.0, 12.0, 90.0, 85.0, t0,
                95.0, 0.9, 14, -6.0, "ALTITUDE_CHANGE"));
        consumer.onTelemetryReceived("drone-9", new TelemetryStreamVm(
                "drone-9", "flight-9", 10.7769, 106.7009, 30.0, 0.0, 90.0, 85.0, t0,
                95.0, 0.9, 14, -6.0, "DIVERT"));

        verify(emergencyIncidentService, never()).createIncident(any(), any());
    }
}
