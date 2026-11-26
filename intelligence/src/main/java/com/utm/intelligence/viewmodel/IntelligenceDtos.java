package com.utm.intelligence.viewmodel;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;

public final class IntelligenceDtos {

    private IntelligenceDtos() {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record GeoJsonRouteVm(
            String type,
            List<List<Double>> coordinates
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FlightClientVm(
            String id,
            String flightNumber,
            String droneId,
            String departureHubId,
            String arrivalHubId,
            String status,
            Double cruisingAltitudeM,
            Double maxAltitudeM,
            GeoJsonRouteVm plannedRoute
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record FlightListClientVm(List<FlightClientVm> items, long total) {
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
            HubLocationClientVm location
    ) {
        public HubClientVm(String id, String code, String name, String status, Double latitude, Double longitude) {
            this(id, code, name, status, latitude, longitude, null);
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
            String status,
            String currentHubId,
            String homeHubId
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DroneListClientVm(List<DroneClientVm> items, long total) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TelemetryClientVm(
            String flightId,
            String droneId,
            Double latitude,
            Double longitude,
            Double altitude,
            Double speed,
            Double heading,
            Double verticalSpeed
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WeatherGoNoGoClientVm(
            String hubId,
            String hubName,
            String verdict,
            Double windSpeedMs,
            Double windGustMs,
            Integer windDirectionDeg,
            Double visibilityM,
            String flightCategory,
            String nearestStation,
            List<String> reasons
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AdsbAircraftClientVm(
            String hex,
            String callsign,
            @JsonAlias("latitude") Double lat,
            @JsonAlias("longitude") Double lon,
            Double altitudeFt,
            Double groundSpeedKt,
            @JsonAlias("headingDeg") Double trackDeg,
            Double verticalRateFpm,
            Boolean onGround
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AdsbResponseClientVm(
            List<AdsbAircraftClientVm> aircraft,
            @JsonAlias("count") Integer total
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NotamItemClientVm(
            String id,
            String fir,
            @JsonAlias("icao") String icaoLocation,
            String subject,
            @JsonAlias("severity") String significance,
            String scope,
            String text,
            Double latitude,
            Double longitude,
            Double radiusNm,
            Integer lowerFt,
            Integer upperFt,
            Double lowerLimitM,
            Double upperLimitM,
            @JsonAlias("validFrom") String effectiveStart,
            @JsonAlias("validTo") String effectiveEnd,
            Boolean permanent
    ) {
        public NotamItemClientVm(
                String id, String fir, String icaoLocation, String subject, String significance,
                String scope, String text, Double latitude, Double longitude, Double radiusNm,
                Integer lowerFt, Integer upperFt, String effectiveStart, String effectiveEnd, Boolean permanent) {
            this(id, fir, icaoLocation, subject, significance, scope, text, latitude, longitude, radiusNm,
                    lowerFt, upperFt, null, null, effectiveStart, effectiveEnd, permanent);
        }

        public Integer effectiveLowerFt() {
            if (lowerFt != null) {
                return lowerFt;
            }
            return lowerLimitM != null ? (int) Math.round(lowerLimitM * 3.28084) : null;
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record NotamResponseClientVm(
            @JsonAlias("notams") List<NotamItemClientVm> items,
            @JsonAlias("count") Integer total
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AirspaceCheckPathClientVm(
            boolean safe,
            List<Map<String, Object>> violations
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ConflictClientVm(
            String id,
            String conflictType,
            String severity,
            String status,
            String primaryFlightId,
            String secondaryFlightId,
            ZonedDateTime detectedAt
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ConflictListClientVm(List<ConflictClientVm> items, long total) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EmergencyIncidentClientVm(
            String id,
            String incidentNumber,
            String emergencyType,
            String severity,
            String status,
            String message,
            String droneId,
            ZonedDateTime detectedAt
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EmergencyPageClientVm(@JsonAlias("data") List<EmergencyIncidentClientVm> items, long total) {
    }

    public record RoutePointVm(double lat, double lon, double alt) {
    }

    public record BriefingRouteVm(
            String departureHub,
            String arrivalHub,
            List<RoutePointVm> points,
            double altitudeM
    ) {
    }

    public record BriefingSectionsVm(
            Map<String, Object> weather,
            Map<String, Object> airspace,
            Map<String, Object> traffic,
            Map<String, Object> notam
    ) {
    }

    public record FlightBriefingVm(
            String flightId,
            String flightNumber,
            String verdict,
            BriefingRouteVm route,
            BriefingSectionsVm sections,
            String generatedAt
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AiAssessmentDecisionVm(
            String decision,
            String confidence,
            List<String> blockingReasons,
            List<String> conditions,
            String humanSummary
    ) {
    }

    public record FlightAssessmentVm(
            String flightId,
            String flightNumber,
            boolean enabled,
            String deterministicVerdict,
            String model,
            AiAssessmentDecisionVm ai,
            FlightBriefingVm briefing,
            String generatedAt
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ForesightObjectVm(
            String id,
            String kind,
            String label,
            double lat,
            double lon,
            double altitudeM,
            double headingDeg,
            double speedMps,
            double verticalSpeedMps
    ) {
    }

    public record ForesightFrameObjectVm(
            String id,
            double lat,
            double lon,
            double altitudeM
    ) {
    }

    public record ForesightFrameVm(
            int tOffsetSec,
            List<ForesightFrameObjectVm> objects
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LatLonVm(double lat, double lon) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ObjectRefVm(String id, String label) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PredictedConflictVm(
            String id,
            int timeToConflictSec,
            int minSeparationM,
            LatLonVm location,
            int altitudeM,
            ObjectRefVm primary,
            ObjectRefVm secondary
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ResolutionManeuverVm(
            String objectId,
            String kind,
            Integer delaySec,
            Double altitudeDeltaM,
            Double lateralOffsetM
    ) {
    }

    public record ForesightTimelineVm(
            String generatedAt,
            int horizonSec,
            int stepSec,
            List<ForesightObjectVm> objects,
            List<ForesightFrameVm> frames,
            List<PredictedConflictVm> predictedConflicts
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ForesightAdvisePostVm(
            PredictedConflictVm conflict
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ForesightSimulatePostVm(
            List<ResolutionManeuverVm> maneuvers,
            Integer horizon,
            Integer step
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DirectorOptionVm(
            String kind,
            String label,
            Integer delaySec,
            Double altitudeDeltaM,
            Double lateralOffsetM,
            String objectId,
            String rationale,
            String sideEffects
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record DirectorAdviceVm(
            String summary,
            String cause,
            List<DirectorOptionVm> options,
            int recommendedIndex,
            String source
    ) {
    }

    public record DemoStateVm(boolean active) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ChatMessageVm(
            String role,
            Object content
    ) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CopilotChatPostVm(
            List<ChatMessageVm> messages
    ) {
    }

    public record ToolTraceItemVm(
            String tool,
            Map<String, Object> input,
            Object summary
    ) {
    }

    public record ProposedActionVm(
            String kind,
            String label,
            String method,
            String path,
            Map<String, Object> body,
            String rationale
    ) {
    }

    public record CopilotChatResponseVm(
            boolean enabled,
            String reply,
            List<ToolTraceItemVm> toolTrace,
            List<ProposedActionVm> proposedActions,
            String model
    ) {
    }
}
