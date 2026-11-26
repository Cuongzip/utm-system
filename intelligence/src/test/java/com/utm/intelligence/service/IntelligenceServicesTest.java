package com.utm.intelligence.service;

import com.utm.commonlibrary.ai.LlmReasoningClient;
import com.utm.intelligence.service.client.IntelligenceInteropClientService;
import com.utm.intelligence.viewmodel.IntelligenceDtos.AirspaceCheckPathClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ChatMessageVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.CopilotChatPostVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.CopilotChatResponseVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.DirectorAdviceVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.FlightAssessmentVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.FlightBriefingVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.FlightClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ForesightTimelineVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.HubClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.PredictedConflictVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ResolutionManeuverVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.WeatherGoNoGoClientVm;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("Unit Tests: Intelligence Microservice (Briefing, Foresight & Copilot)")
class IntelligenceServicesTest {

    @Mock
    private IntelligenceInteropClientService interopClient;

    private LlmReasoningClient disabledLlmClient;
    private BriefingService briefingService;
    private ForesightService foresightService;
    private CopilotService copilotService;

    @BeforeEach
    void setUp() {
        disabledLlmClient = new LlmReasoningClient("", "https://api.anthropic.com", "claude-haiku-4-5-20251001", 5000);
        briefingService = new BriefingService(interopClient, disabledLlmClient);
        foresightService = new ForesightService(interopClient, disabledLlmClient);
        copilotService = new CopilotService(interopClient, briefingService, disabledLlmClient);
    }

    @Test
    @DisplayName("BriefingService - aggregates GREEN verdict and deterministic GO assessment when all sections clear")
    void briefingService_whenAllClear_returnsGreenAndGo() {
        FlightClientVm flight = new FlightClientVm(
                "flt-1", "FLT-VN-001", "drn-1", "hub-sgn", "hub-tdc",
                "scheduled", 80.0, 100.0, null);
        HubClientVm depHub = new HubClientVm("hub-sgn", "HUB-SGN", "Saigon Central Hub", "ACTIVE", 10.7769, 106.7009);
        HubClientVm arrHub = new HubClientVm("hub-tdc", "HUB-TDC", "Thu Duc Hub", "ACTIVE", 10.8500, 106.7700);
        WeatherGoNoGoClientVm wx = new WeatherGoNoGoClientVm(
                "hub-sgn", "Saigon Central Hub", "GO", 4.2, 6.0, 120, 9999.0, "VFR", "VVTS", List.of());

        when(interopClient.getFlightById("flt-1")).thenReturn(Optional.of(flight));
        when(interopClient.getHubById("hub-sgn")).thenReturn(Optional.of(depHub));
        when(interopClient.getHubById("hub-tdc")).thenReturn(Optional.of(arrHub));
        when(interopClient.getWeatherGoNoGo("hub-sgn")).thenReturn(Optional.of(wx));
        when(interopClient.checkAirspacePath(anyList())).thenReturn(Optional.of(new AirspaceCheckPathClientVm(true, List.of())));
        when(interopClient.getAdsbAircraft()).thenReturn(List.of());
        when(interopClient.getNotams()).thenReturn(List.of());

        FlightBriefingVm briefing = briefingService.getFlightBriefing("flt-1");
        assertThat(briefing.verdict()).isEqualTo("GREEN");

        FlightAssessmentVm assessment = briefingService.assessFlight("flt-1");
        assertThat(assessment.ai().decision()).isEqualTo("GO");
        assertThat(assessment.ai().blockingReasons()).isEmpty();
    }

    @Test
    @DisplayName("ForesightService - demo scenario predicts 4D CPA conflict and altitude maneuver resolves it")
    void foresightService_demoPredictAdviseAndSimulateResolution() {
        when(interopClient.getFlights("active", null)).thenReturn(List.of());
        when(interopClient.getAdsbAircraft()).thenReturn(List.of());

        foresightService.startDemo();
        ForesightTimelineVm timeline = foresightService.predict(600, 5, List.of());

        assertThat(timeline.objects()).hasSize(2);
        assertThat(timeline.predictedConflicts()).hasSize(1);

        PredictedConflictVm conflict = timeline.predictedConflicts().get(0);
        assertThat(conflict.minSeparationM()).isLessThan(150);

        DirectorAdviceVm advice = foresightService.advise(conflict);
        assertThat(advice.source()).isEqualTo("deterministic");
        assertThat(advice.options()).hasSize(3);

        var recommended = advice.options().get(advice.recommendedIndex());
        ResolutionManeuverVm maneuver = new ResolutionManeuverVm(
                recommended.objectId(),
                recommended.kind(),
                recommended.delaySec(),
                recommended.altitudeDeltaM(),
                recommended.lateralOffsetM());

        ForesightTimelineVm resolvedTimeline = foresightService.predict(600, 5, List.of(maneuver));
        assertThat(resolvedTimeline.predictedConflicts()).isEmpty();
        foresightService.resetDemo();
    }

    @Test
    @DisplayName("CopilotService - dispatches read tools and returns confirm-gated propose_authorize_flight without executing")
    void copilotService_proposesAuthorizationWithoutExecuting() {
        FlightClientVm scheduledFlight = new FlightClientVm(
                "flt-auth-1", "FLT-VN-888", "drn-1", "hub-sgn", "hub-tdc",
                "scheduled", 60.0, 90.0, null);
        when(interopClient.getFlights("scheduled", null)).thenReturn(List.of(scheduledFlight));
        when(interopClient.getFlightById("flt-auth-1")).thenReturn(Optional.of(scheduledFlight));
        when(interopClient.getFleetOverview()).thenReturn(Map.of("totalDrones", 6, "availableDrones", 4));

        CopilotChatPostVm req = new CopilotChatPostVm(List.of(
                new ChatMessageVm("user", "Check fleet status and authorize flight FLT-VN-888")));

        CopilotChatResponseVm res = copilotService.chat(req);

        assertThat(res.toolTrace()).hasSize(2);
        assertThat(res.proposedActions()).hasSize(1);
        assertThat(res.proposedActions().get(0).kind()).isEqualTo("authorize_flight");
        assertThat(res.proposedActions().get(0).path()).isEqualTo("/api/v1/flights/flt-auth-1/authorize");
    }

    @Test
    @DisplayName("CopilotService - propose_resolve_conflict emits valid strategy & actions contract")
    void copilotService_proposeResolveConflict_matchesConflictResolvePostVmContract() {
        var outcome = copilotService.dispatchTool("propose_resolve_conflict", Map.of(
                "conflictId", "cnf-42",
                "rationale", "Hold secondary drone to clear CPA"));

        assertThat(outcome.proposal()).isNotNull();
        assertThat(outcome.proposal().path()).isEqualTo("/api/v1/conflicts/cnf-42/resolve");
        assertThat(outcome.proposal().body()).containsEntry("strategy", "hold");
        assertThat(outcome.proposal().body()).containsKey("actions");
    }

    @Test
    @DisplayName("IntelligenceDtos - deserializes weather-ais ADS-B, NOTAM, and emergency page aliases cleanly")
    void intelligenceDtos_deserializesUpstreamAliasesCorrectly() throws Exception {
        var mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        var adsb = mapper.readValue("""
                {"count":1,"aircraft":[{"hex":"888123","callsign":"HVN214","latitude":10.82,"longitude":106.66,
                  "altitudeFt":3000.0,"groundSpeedKt":180.0,"headingDeg":250.0,"verticalRateFpm":-500.0,"onGround":false}]}
                """, com.utm.intelligence.viewmodel.IntelligenceDtos.AdsbResponseClientVm.class);
        assertThat(adsb.total()).isEqualTo(1);
        assertThat(adsb.aircraft().get(0).lat()).isEqualTo(10.82);
        assertThat(adsb.aircraft().get(0).lon()).isEqualTo(106.66);
        assertThat(adsb.aircraft().get(0).trackDeg()).isEqualTo(250.0);

        var notams = mapper.readValue("""
                {"count":1,"notams":[{"id":"N1","icao":"VVTS","subject":"Prohibited area","severity":"critical",
                  "latitude":10.82,"longitude":106.65,"radiusNm":2.0,"lowerLimitM":0.0,"upperLimitM":1200.0,
                  "validFrom":"2026-11-24T00:00:00Z","text":"VIP TFR"}]}
                """, com.utm.intelligence.viewmodel.IntelligenceDtos.NotamResponseClientVm.class);
        assertThat(notams.total()).isEqualTo(1);
        assertThat(notams.items()).hasSize(1);
        assertThat(notams.items().get(0).significance()).isEqualTo("critical");
        assertThat(notams.items().get(0).effectiveLowerFt()).isEqualTo(0);

        var emPage = mapper.readValue("""
                {"data":[{"id":"inc-1","incidentNumber":"EMG-001","emergencyType":"battery_critical",
                  "severity":"critical","status":"active","message":"Low battery","droneId":"drn-1"}],"total":1}
                """, com.utm.intelligence.viewmodel.IntelligenceDtos.EmergencyPageClientVm.class);
        assertThat(emPage.total()).isEqualTo(1);
        assertThat(emPage.items()).hasSize(1);
        assertThat(emPage.items().get(0).incidentNumber()).isEqualTo("EMG-001");
    }
}
