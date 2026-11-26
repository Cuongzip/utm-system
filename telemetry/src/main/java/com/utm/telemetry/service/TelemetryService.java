package com.utm.telemetry.service;

import com.utm.telemetry.viewmodel.telemetry.TelemetryIngestVm;
import com.utm.telemetry.viewmodel.telemetry.TelemetryRecordVm;

import java.time.ZonedDateTime;
import java.util.List;

public interface TelemetryService {

    TelemetryRecordVm ingestTelemetry(TelemetryIngestVm ingestVm);

    List<TelemetryRecordVm> ingestTelemetryBatch(List<TelemetryIngestVm> batch);

    List<TelemetryRecordVm> getActiveTelemetry();

    TelemetryRecordVm getLatestByDroneId(String droneId);

    TelemetryRecordVm getLatestByFlightId(String flightId);

    List<TelemetryRecordVm> getFlightTrackHistory(String flightId, ZonedDateTime from, ZonedDateTime to);

    List<TelemetryRecordVm> getDroneTrackHistory(String droneId, ZonedDateTime from, ZonedDateTime to);
}
