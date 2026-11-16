package com.utm.conflict.kafka;

import static org.mockito.Mockito.verify;

import com.utm.conflict.service.ConflictDetectionService;
import com.utm.conflict.viewmodel.client.TelemetryBriefVm;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class TelemetryStreamConsumerTest {

    @Mock
    private ConflictDetectionService conflictDetectionService;

    @InjectMocks
    private TelemetryStreamConsumer consumer;

    @Test
    @DisplayName("onTelemetryReceived delegates to evaluateLiveTelemetry")
    void onTelemetryReceived_delegatesToConflictDetectionService() {
        TelemetryBriefVm telemetry = new TelemetryBriefVm("flight-1", "drone-1", 10.77, 106.70, 100.0, 15.0, 0.0);

        consumer.onTelemetryReceived("flight-1", telemetry);

        verify(conflictDetectionService).evaluateLiveTelemetry(telemetry);
    }
}

