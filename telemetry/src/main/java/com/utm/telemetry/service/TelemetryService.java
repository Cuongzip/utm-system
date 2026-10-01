package com.utm.telemetry.service;

import com.utm.telemetry.viewmodel.TelemetryIngestVm;
import com.utm.telemetry.viewmodel.TelemetryRecordVm;

import java.time.ZonedDateTime;
import java.util.List;

public interface TelemetryService {

    TelemetryRecordVm ingestTelemetry(TelemetryIngestVm ingestVm);

    TelemetryRecordVm getLatestByDroneId(String droneId);

    TelemetryRecordVm getLatestByFlightId(String flightId);

    List<TelemetryRecordVm> getFlightTrackHistory(String flightId, ZonedDateTime from, ZonedDateTime to);
}
