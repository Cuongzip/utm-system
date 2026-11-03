package com.utm.emergency.viewmodel.stats;

import java.util.List;

public record EmergencyStatsVm(
        List<StatusCountVm> byStatus,
        List<TypeCountVm> byType,
        List<SeverityCountVm> bySeverity,
        List<DroneCountVm> byDrone,
        double avgResponseTimeSeconds,
        List<ResolutionStatVm> resolutionStats
) {
    public record StatusCountVm(String status, long count) {}
    public record TypeCountVm(String type, long count) {}
    public record SeverityCountVm(String severity, long count) {}
    public record DroneCountVm(String droneId, long count) {}
    public record ResolutionStatVm(Boolean success, long count) {}
}