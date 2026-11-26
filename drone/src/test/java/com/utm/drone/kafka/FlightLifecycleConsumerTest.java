package com.utm.drone.kafka;

import com.utm.commonlibrary.kafka.event.FlightLifecycleEvent;
import com.utm.drone.model.Drone;
import com.utm.drone.model.enumeration.DroneStatus;
import com.utm.drone.repository.DroneRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.ZonedDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: FlightLifecycleConsumer (Battery & Stopover Charging Sync)")
class FlightLifecycleConsumerTest {

    @Mock
    private DroneRepository droneRepository;

    @InjectMocks
    private FlightLifecycleConsumer consumer;

    @Test
    @DisplayName("FLIGHT_COMPLETED at RECHARGE hub updates battery from telemetry and transitions drone to CHARGING")
    void onFlightEventReceived_completedAtRechargeStop_setsChargingStatusAndBattery() {
        Drone drone = Drone.builder()
                .id("drone-1")
                .status(DroneStatus.IN_FLIGHT)
                .currentBatteryPct(100.0)
                .totalFlights(5)
                .totalFlightHours(2.0)
                .build();
        when(droneRepository.findById("drone-1")).thenReturn(Optional.of(drone));

        FlightLifecycleEvent event = new FlightLifecycleEvent(
                FlightLifecycleEvent.FLIGHT_COMPLETED,
                "flt-1", "FLT-1", "msn-1", "exec-1", 0, 2,
                "drone-1", "hub-a", "hub-b", "hub-b",
                "completed", null, 0.5, null, ZonedDateTime.now(),
                24.5, "recharge", null);

        consumer.onFlightEventReceived("exec-1", event);

        assertThat(drone.getCurrentHubId()).isEqualTo("hub-b");
        assertThat(drone.getCurrentBatteryPct()).isEqualTo(24.5);
        assertThat(drone.getStatus()).isEqualTo(DroneStatus.CHARGING);
        assertThat(drone.getTotalFlights()).isEqualTo(6);
        verify(droneRepository).save(drone);
    }

    @Test
    @DisplayName("FLIGHT_COMPLETED at BATTERY_SWAP hub resets battery to 100% and sets status AVAILABLE")
    void onFlightEventReceived_completedAtBatterySwapStop_resetsBatteryToFull() {
        Drone drone = Drone.builder()
                .id("drone-2")
                .status(DroneStatus.IN_FLIGHT)
                .currentBatteryPct(80.0)
                .totalFlights(1)
                .build();
        when(droneRepository.findById("drone-2")).thenReturn(Optional.of(drone));

        FlightLifecycleEvent event = new FlightLifecycleEvent(
                FlightLifecycleEvent.FLIGHT_COMPLETED,
                "flt-2", "FLT-2", "msn-1", "exec-1", 0, 2,
                "drone-2", "hub-a", "hub-b", "hub-b",
                "completed", null, 0.3, null, ZonedDateTime.now(),
                28.0, "battery_swap", null);

        consumer.onFlightEventReceived("exec-1", event);

        assertThat(drone.getCurrentBatteryPct()).isEqualTo(100.0);
        assertThat(drone.getStatus()).isEqualTo(DroneStatus.AVAILABLE);
        verify(droneRepository).save(drone);
    }

    @Test
    @DisplayName("FLIGHT_COMPLETED at PAYLOAD_DROPOFF hub preserves reduced ending battery and sets AVAILABLE")
    void onFlightEventReceived_completedAtPayloadDropoff_preservesReducedBattery() {
        Drone drone = Drone.builder()
                .id("drone-3")
                .status(DroneStatus.IN_FLIGHT)
                .currentBatteryPct(100.0)
                .totalFlights(2)
                .build();
        when(droneRepository.findById("drone-3")).thenReturn(Optional.of(drone));

        FlightLifecycleEvent event = new FlightLifecycleEvent(
                FlightLifecycleEvent.FLIGHT_COMPLETED,
                "flt-3", "FLT-3", "msn-1", "exec-1", 0, 2,
                "drone-3", "hub-a", "hub-b", "hub-b",
                "completed", null, 0.2, null, ZonedDateTime.now(),
                52.0, "payload_dropoff", null);

        consumer.onFlightEventReceived("exec-1", event);

        assertThat(drone.getCurrentBatteryPct()).isEqualTo(52.0);
        assertThat(drone.getStatus()).isEqualTo(DroneStatus.AVAILABLE);
        verify(droneRepository).save(drone);
    }
}
