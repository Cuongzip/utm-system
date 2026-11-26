package com.utm.fleet.viewmodel;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

public final class FleetDtos {

    private FleetDtos() {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ScoringWeightsVm(
            double proximity,
            double battery,
            double capability,
            double utilization,
            double maintenance
    ) {
        @JsonCreator
        public static ScoringWeightsVm of(
                @JsonProperty("proximity") Double proximity,
                @JsonProperty("battery") Double battery,
                @JsonProperty("capability") Double capability,
                @JsonProperty("utilization") Double utilization,
                @JsonProperty("maintenance") Double maintenance
        ) {
            ScoringWeightsVm d = balancedDefault();
            return new ScoringWeightsVm(
                    proximity != null ? proximity : d.proximity(),
                    battery != null ? battery : d.battery(),
                    capability != null ? capability : d.capability(),
                    utilization != null ? utilization : d.utilization(),
                    maintenance != null ? maintenance : d.maintenance()
            );
        }

        public static ScoringWeightsVm balancedDefault() {
            return new ScoringWeightsVm(0.25, 0.20, 0.25, 0.15, 0.15);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FleetThresholdsVm(
            int minDronesPerHub,
            int maxIdleTimeMinutes,
            int rebalanceCooldownMinutes,
            int minDonorReserve,
            int maxConcurrentRepositions,
            int minBatteryForReposition,
            Integer quietHoursStart,
            Integer quietHoursEnd,
            boolean quietHoursOnly
    ) {
        @JsonCreator
        public static FleetThresholdsVm of(
                @JsonProperty("minDronesPerHub") Integer minDronesPerHub,
                @JsonProperty("maxIdleTimeMinutes") Integer maxIdleTimeMinutes,
                @JsonProperty("rebalanceCooldownMinutes") Integer rebalanceCooldownMinutes,
                @JsonProperty("minDonorReserve") Integer minDonorReserve,
                @JsonProperty("maxConcurrentRepositions") Integer maxConcurrentRepositions,
                @JsonProperty("minBatteryForReposition") Integer minBatteryForReposition,
                @JsonProperty("quietHoursStart") Integer quietHoursStart,
                @JsonProperty("quietHoursEnd") Integer quietHoursEnd,
                @JsonProperty("quietHoursOnly") Boolean quietHoursOnly
        ) {
            FleetThresholdsVm d = balancedDefault();
            return new FleetThresholdsVm(
                    minDronesPerHub != null ? minDronesPerHub : d.minDronesPerHub(),
                    maxIdleTimeMinutes != null ? maxIdleTimeMinutes : d.maxIdleTimeMinutes(),
                    rebalanceCooldownMinutes != null ? rebalanceCooldownMinutes : d.rebalanceCooldownMinutes(),
                    minDonorReserve != null ? minDonorReserve : d.minDonorReserve(),
                    maxConcurrentRepositions != null ? maxConcurrentRepositions : d.maxConcurrentRepositions(),
                    minBatteryForReposition != null ? minBatteryForReposition : d.minBatteryForReposition(),
                    quietHoursStart != null ? quietHoursStart : d.quietHoursStart(),
                    quietHoursEnd != null ? quietHoursEnd : d.quietHoursEnd(),
                    quietHoursOnly != null ? quietHoursOnly : d.quietHoursOnly()
            );
        }

        public static FleetThresholdsVm balancedDefault() {
            return new FleetThresholdsVm(2, 90, 30, 2, 3, 70, null, null, false);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DroneScoreVm(
            double proximity,
            double battery,
            double capability,
            double utilization,
            double maintenance
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AlternativeDroneVm(
            String droneId,
            String registrationNumber,
            double score,
            DroneScoreVm scores,
            String reason
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RebalancingRuleVm(
            String type,
            String condition,
            Integer threshold,
            Integer actualValue
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HubLocationClientVm(
            @JsonAlias("lat") Double latitude,
            @JsonAlias("lng") Double longitude
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HubClientVm(
            String id,
            String code,
            String name,
            String status,
            Double latitude,
            Double longitude,
            @JsonAlias("maxSimultaneousDrones") Integer maxDroneCapacity,
            HubLocationClientVm location
    ) {
        public HubClientVm(String id, String code, String name, String status,
                Double latitude, Double longitude, Integer maxDroneCapacity) {
            this(id, code, name, status, latitude, longitude, maxDroneCapacity, null);
        }

        @Override
        public Double latitude() {
            return latitude != null ? latitude : (location != null ? location.latitude() : null);
        }

        @Override
        public Double longitude() {
            return longitude != null ? longitude : (location != null ? location.longitude() : null);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HubListClientVm(List<HubClientVm> items, long total) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DroneClientVm(
            String id,
            String registrationNumber,
            String model,
            String manufacturer,
            String status,
            String homeHubId,
            String currentHubId,
            @JsonAlias("maxPayload") Double maxPayloadKg,
            Double maxRangeM,
            Double batteryHealthPct,
            Double totalFlightHours,
            List<String> capabilities,
            ZonedDateTime nextMaintenance
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DroneListClientVm(List<DroneClientVm> items, long total) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MissionClientVm(
            String id,
            String code,
            String name,
            String status,
            String departureHubId,
            String arrivalHubId,
            String droneId,
            Double payloadWeightKg,
            Double estimatedDistance,
            Integer estimatedDuration,
            List<String> requiredCapabilities,
            ZonedDateTime scheduledAt,
            ZonedDateTime createdOn
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record MissionListClientVm(List<MissionClientVm> items, long total) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TelemetryClientVm(
            String droneId,
            @JsonAlias("batteryPercentage") Double batteryLevel
    ) {
    }

    public record HubFleetStatusVm(
            String hubId,
            String hubName,
            int totalDrones,
            int availableDrones,
            int busyDrones,
            int chargingDrones,
            int maintenanceDrones,
            List<String> droneIds,
            double capacityUtilization,
            ZonedDateTime lastUpdated
    ) {
    }

    public record FleetOverviewVm(
            int totalDrones,
            int availableDrones,
            int busyDrones,
            int chargingDrones,
            int maintenanceDrones,
            int offlineDrones,
            int activeMissions,
            int pendingMissions,
            List<HubFleetStatusVm> hubStatuses,
            int fleetHealth,
            double averageFlightHours
    ) {
    }

    public record DroneAvailabilityVm(
            DroneClientVm drone,
            String status,
            String currentHubId,
            String currentMissionId,
            ZonedDateTime estimatedAvailableAt
    ) {
    }

    public record AssignDronePostVm(
            @Schema(description = "Mission UUID to assign a drone for")
            String missionId,
            @Schema(description = "Optional operator-selected Drone UUID override")
            String operatorOverride
    ) {
    }

    public record RejectAssignmentPostVm(
            String reason,
            String alternativeDroneId
    ) {
    }

    public record FleetAssignmentVm(
            String id,
            String missionId,
            String droneId,
            DroneScoreVm scores,
            ScoringWeightsVm weights,
            double finalScore,
            String status,
            String assignedBy,
            String operatorId,
            List<AlternativeDroneVm> alternativeDrones,
            String rejectionReason,
            ZonedDateTime assignedAt,
            ZonedDateTime completedAt,
            ZonedDateTime createdOn
    ) {
    }

    public record AssignmentResultVm(
            boolean success,
            FleetAssignmentVm assignment,
            DroneClientVm selectedDrone,
            List<AlternativeDroneVm> alternatives,
            String reason
    ) {
    }

    public record RebalancingRecommendationVm(
            HubFleetStatusVm sourceHub,
            HubFleetStatusVm targetHub,
            DroneClientVm recommendedDrone,
            String trigger,
            int priority,
            String reason
    ) {
    }

    public record CreateRebalancingPostVm(
            String sourceHubId,
            String targetHubId,
            String droneId,
            Boolean autoApprove
    ) {
    }

    public record ApproveRebalancingPostVm(
            String operatorId
    ) {
    }

    public record CancelRebalancingPostVm(
            String reason
    ) {
    }

    public record RebalancingTaskVm(
            String id,
            String sourceHubId,
            String targetHubId,
            String droneId,
            String repositioningMissionId,
            String repositioningFlightId,
            String trigger,
            RebalancingRuleVm rule,
            String status,
            int priority,
            String approvedBy,
            ZonedDateTime approvedAt,
            ZonedDateTime startedAt,
            ZonedDateTime completedAt,
            String cancelledReason,
            String failureReason,
            ZonedDateTime createdOn
    ) {
    }

    public record FleetConfigPostVm(
            String name,
            String description,
            ScoringWeightsVm weights,
            FleetThresholdsVm thresholds
    ) {
    }

    public record FleetConfigPutVm(
            String name,
            String description,
            ScoringWeightsVm weights,
            FleetThresholdsVm thresholds
    ) {
    }

    public record FleetConfigurationVm(
            String id,
            String name,
            String description,
            ScoringWeightsVm weights,
            FleetThresholdsVm thresholds,
            boolean isPreset,
            boolean isActive,
            ZonedDateTime createdOn,
            String createdBy,
            ZonedDateTime lastModifiedOn
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CreatedIdVm(
            String id,
            Map<String, Object> extra
    ) {
    }
}
