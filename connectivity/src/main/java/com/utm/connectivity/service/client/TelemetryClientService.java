package com.utm.connectivity.service.client;

import com.utm.connectivity.viewmodel.client.TelemetryIngestClientVm;

public interface TelemetryClientService {
    boolean forwardTelemetry(TelemetryIngestClientVm payload);
}
