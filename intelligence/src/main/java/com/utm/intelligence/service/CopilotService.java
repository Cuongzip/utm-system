package com.utm.intelligence.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.commonlibrary.ai.LlmReasoningClient;
import com.utm.commonlibrary.utils.LocaleUtils;
import com.utm.intelligence.service.client.IntelligenceInteropClientService;
import com.utm.intelligence.viewmodel.IntelligenceDtos.AdsbAircraftClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ChatMessageVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ConflictClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.CopilotChatPostVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.CopilotChatResponseVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.DroneClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.EmergencyIncidentClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.FlightBriefingVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.FlightClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.HubClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.NotamItemClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ProposedActionVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ToolTraceItemVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.WeatherGoNoGoClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CopilotService {

    private static final String SYSTEM_PROMPT = "You are the Operations Copilot for DROPS-UTM Vietnam. "
            + "Answer the operator's questions about live flights, drones, hubs, fleet status, weather, ADS-B traffic, "
            + "NOTAMs, conflicts, and emergencies by calling the provided read tools. "
            + "Never invent identifiers. Reply in the same language the operator used (Vietnamese or English). "
            + "When the operator asks to authorize/abort a flight, resolve a conflict, or confirm an emergency, "
            + "gather evidence first and call the corresponding propose_* tool (which returns a confirm-gated UI proposal without executing).";

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final IntelligenceInteropClientService interopClient;
    private final BriefingService briefingService;
    private final LlmReasoningClient llmReasoningClient;

    public CopilotChatResponseVm chat(CopilotChatPostVm request) {
        List<ChatMessageVm> incoming = request != null && request.messages() != null ? request.messages() : List.of();
        boolean aiEnabled = llmReasoningClient != null && llmReasoningClient.isEnabled();
        boolean vi = LocaleUtils.isVietnamese();
        String modelName = llmReasoningClient != null ? llmReasoningClient.getDefaultModel() : "deterministic-copilot";

        if (incoming.isEmpty()) {
            return new CopilotChatResponseVm(
                    aiEnabled,
                    vi
                            ? "Xin chào! Hãy hỏi tôi về chuyến bay đang hoạt động, trạng thái đội bay, điều kiện thời tiết cất/hạ cánh tại Hub, lưu lượng ADS-B, xung đột không phận hoặc sự cố khẩn cấp."
                            : "Hello! Ask me about active flights, fleet status, hub weather go/no-go, ADS-B traffic, conflicts, or emergencies.",
                    List.of(),
                    List.of(),
                    modelName);
        }

        if (aiEnabled) {
            Optional<CopilotChatResponseVm> llmResult = runToolUseLoop(incoming, modelName);
            if (llmResult.isPresent()) {
                return llmResult.get();
            }
        }

        return runDeterministicToolAssistant(incoming, aiEnabled, modelName);
    }

    @SuppressWarnings("unchecked")
    private Optional<CopilotChatResponseVm> runToolUseLoop(List<ChatMessageVm> incoming, String modelName) {
        boolean vi = LocaleUtils.isVietnamese();
        String systemPrompt = vi
                ? SYSTEM_PROMPT + " Operator UI language is Vietnamese (Tiếng Việt); reply in concise, professional aviation Vietnamese unless the operator explicitly writes in English."
                : SYSTEM_PROMPT;

        List<Map<String, Object>> conversation = new ArrayList<>();
        for (ChatMessageVm m : incoming) {
            String role = "assistant".equalsIgnoreCase(m.role()) ? "assistant" : "user";
            conversation.add(Map.of("role", role, "content", String.valueOf(m.content() != null ? m.content() : "")));
        }

        List<ToolTraceItemVm> toolTrace = new ArrayList<>();
        List<ProposedActionVm> proposedActions = new ArrayList<>();
        List<Map<String, Object>> tools = buildToolDefinitions();

        for (int iter = 0; iter < 6; iter++) {
            Optional<JsonNode> rootOpt = llmReasoningClient.sendMessagesWithTools(
                    systemPrompt, conversation, tools, 1500);
            if (rootOpt.isEmpty()) {
                return Optional.empty();
            }
            JsonNode root = rootOpt.get();
            JsonNode content = root.path("content");
            if (!content.isArray()) {
                return Optional.empty();
            }

            List<Map<String, Object>> assistantBlocks = new ArrayList<>();
            List<Map<String, Object>> toolResultBlocks = new ArrayList<>();
            StringBuilder textReply = new StringBuilder();

            for (JsonNode block : content) {
                String type = block.path("type").asText();
                if ("text".equals(type)) {
                    String txt = block.path("text").asText("");
                    if (!txt.isBlank()) {
                        if (!textReply.isEmpty()) {
                            textReply.append('\n');
                        }
                        textReply.append(txt);
                    }
                    assistantBlocks.add(Map.of("type", "text", "text", txt));
                } else if ("tool_use".equals(type)) {
                    String toolUseId = block.path("id").asText();
                    String name = block.path("name").asText();
                    Map<String, Object> input = block.has("input") && block.get("input").isObject()
                            ? MAPPER.convertValue(block.get("input"), Map.class)
                            : Map.of();

                    assistantBlocks.add(Map.of(
                            "type", "tool_use",
                            "id", toolUseId,
                            "name", name,
                            "input", input));

                    DispatchOutcome outcome = dispatchTool(name, input);
                    toolTrace.add(new ToolTraceItemVm(name, input, outcome.result()));
                    if (outcome.proposal() != null) {
                        proposedActions.add(outcome.proposal());
                    }

                    String serializedResult;
                    try {
                        serializedResult = MAPPER.writeValueAsString(outcome.result());
                    } catch (Exception ex) {
                        serializedResult = String.valueOf(outcome.result());
                    }
                    toolResultBlocks.add(Map.of(
                            "type", "tool_result",
                            "tool_use_id", toolUseId,
                            "content", serializedResult));
                }
            }

            if (toolResultBlocks.isEmpty()) {
                return Optional.of(new CopilotChatResponseVm(
                        true,
                        textReply.toString().trim(),
                        toolTrace,
                        proposedActions,
                        modelName));
            }

            conversation.add(Map.of("role", "assistant", "content", assistantBlocks));
            conversation.add(Map.of("role", "user", "content", toolResultBlocks));
        }

        return Optional.empty();
    }

    private CopilotChatResponseVm runDeterministicToolAssistant(
            List<ChatMessageVm> incoming, boolean aiEnabled, String modelName) {
        String lastPrompt = String.valueOf(incoming.get(incoming.size() - 1).content());
        String lower = lastPrompt.toLowerCase(Locale.ROOT);

        List<ToolTraceItemVm> trace = new ArrayList<>();
        List<ProposedActionVm> proposals = new ArrayList<>();
        List<String> summaryParts = new ArrayList<>();

        if (lower.contains("fleet") || lower.contains("drone") || lower.contains("đội bay")) {
            DispatchOutcome fleetOut = dispatchTool("fleet_overview", Map.of());
            trace.add(new ToolTraceItemVm("fleet_overview", Map.of(), fleetOut.result()));
            summaryParts.add(formatFleetSummary(fleetOut.result()));
        }
        if (lower.contains("weather") || lower.contains("thời tiết") || lower.contains("wind") || lower.contains("go/no-go")) {
            List<HubClientVm> hubs = interopClient.getAllHubs();
            List<HubClientVm> activeHubs = hubs.stream()
                    .filter(h -> h.status() == null || !"inactive".equalsIgnoreCase(h.status().trim()))
                    .toList();
            List<HubClientVm> pool = activeHubs.isEmpty() ? hubs : activeHubs;
            if (!pool.isEmpty()) {
                HubClientVm target = pool.stream()
                        .filter(h -> (h.code() != null && lower.contains(h.code().toLowerCase(Locale.ROOT)))
                                || (h.name() != null && lower.contains(h.name().toLowerCase(Locale.ROOT))))
                        .findFirst()
                        .orElse(pool.get(0));
                Map<String, Object> in = Map.of("hub", target.id());
                DispatchOutcome wxOut = dispatchTool("weather_go_no_go", in);
                trace.add(new ToolTraceItemVm("weather_go_no_go", in, wxOut.result()));
                summaryParts.add(formatWeatherSummary(target.name(), wxOut.result()));
            }
        }
        if (lower.contains("conflict") || lower.contains("xung đột")) {
            DispatchOutcome confOut = dispatchTool("active_conflicts", Map.of());
            trace.add(new ToolTraceItemVm("active_conflicts", Map.of(), confOut.result()));
            summaryParts.add(formatConflictsSummary(confOut.result()));
        }
        if (lower.contains("emergency") || lower.contains("incident") || lower.contains("khẩn cấp")) {
            Map<String, Object> in = Map.of("activeOnly", true);
            DispatchOutcome emOut = dispatchTool("emergency_incidents", in);
            trace.add(new ToolTraceItemVm("emergency_incidents", in, emOut.result()));
            summaryParts.add(formatEmergenciesSummary(emOut.result()));
        }
        if (lower.contains("traffic") || lower.contains("ads-b") || lower.contains("adsb")) {
            DispatchOutcome trOut = dispatchTool("live_traffic", Map.of());
            trace.add(new ToolTraceItemVm("live_traffic", Map.of(), trOut.result()));
            summaryParts.add(formatTrafficSummary(trOut.result()));
        }
        if (lower.contains("notam")) {
            DispatchOutcome notamOut = dispatchTool("get_notams", Map.of());
            trace.add(new ToolTraceItemVm("get_notams", Map.of(), notamOut.result()));
            summaryParts.add(formatNotamSummary(notamOut.result()));
        }
        boolean vi = LocaleUtils.isVietnamese();
        if (lower.contains("authorize") || lower.contains("cấp phép")) {
            List<FlightClientVm> scheduled = interopClient.getFlights("scheduled", null);
            FlightClientVm target = findMatchingFlightInPrompt(lower, scheduled);
            if (target != null) {
                Map<String, Object> in = Map.of(
                        "flightId", target.id(),
                        "rationale", vi
                                ? "Được điều phái viên yêu cầu qua Copilot sau khi kiểm tra trạng thái trước chuyến bay."
                                : "Requested by operator via Copilot after pre-flight status check.");
                DispatchOutcome prop = dispatchTool("propose_authorize_flight", in);
                trace.add(new ToolTraceItemVm("propose_authorize_flight", in, prop.result()));
                if (prop.proposal() != null) {
                    proposals.add(prop.proposal());
                    summaryParts.add(vi
                            ? "- Đề xuất thao tác: Cấp phép chuyến bay " + target.flightNumber() + " (xác nhận bên dưới)."
                            : "- Proposed action: Authorize flight " + target.flightNumber() + " (confirm below).");
                }
            }
        }
        if (lower.contains("abort") || lower.contains("hủy bay")) {
            List<FlightClientVm> active = interopClient.getFlights("active", null);
            FlightClientVm target = findMatchingFlightInPrompt(lower, active);
            if (target != null) {
                Map<String, Object> in = Map.of(
                        "flightId", target.id(),
                        "rationale", vi
                                ? "Điều phái viên yêu cầu hủy chuyến bay khẩn cấp qua Copilot."
                                : "Operator requested immediate flight abort via Copilot.");
                DispatchOutcome prop = dispatchTool("propose_abort_flight", in);
                trace.add(new ToolTraceItemVm("propose_abort_flight", in, prop.result()));
                if (prop.proposal() != null) {
                    proposals.add(prop.proposal());
                    summaryParts.add(vi
                            ? "- Đề xuất thao tác: Hủy chuyến bay " + target.flightNumber() + " (xác nhận bên dưới)."
                            : "- Proposed action: Abort flight " + target.flightNumber() + " (confirm below).");
                }
            }
        }

        if (trace.isEmpty()) {
            DispatchOutcome flOut = dispatchTool("list_flights", Map.of());
            trace.add(new ToolTraceItemVm("list_flights", Map.of(), flOut.result()));
            summaryParts.add(formatFlightsSummary(flOut.result()));
        }

        return new CopilotChatResponseVm(
                aiEnabled,
                String.join("\n", summaryParts),
                trace,
                proposals,
                modelName);
    }

    @SuppressWarnings("unchecked")
    private String formatFleetSummary(Object raw) {
        boolean vi = LocaleUtils.isVietnamese();
        if (raw instanceof Map<?, ?> map) {
            Object total = map.getOrDefault("totalDrones", null);
            Object available = map.getOrDefault("availableDrones", null);
            Object inFlight = map.getOrDefault("inFlightDrones", null);
            Object charging = map.getOrDefault("chargingDrones", null);
            Object health = map.getOrDefault("fleetHealthScore", null);
            if (total != null) {
                if (vi) {
                    return String.format(Locale.US,
                            "- Sẵn sàng đội bay: %s Drone (%s sẵn sàng, %s đang bay, %s đang sạc)%s",
                            total,
                            available != null ? available : 0,
                            inFlight != null ? inFlight : 0,
                            charging != null ? charging : 0,
                            health != null ? " · Sức khỏe đội bay " + health + "%" : "");
                }
                return String.format(Locale.US,
                        "- Fleet Readiness: %s drones (%s available, %s active, %s charging)%s",
                        total,
                        available != null ? available : 0,
                        inFlight != null ? inFlight : 0,
                        charging != null ? charging : 0,
                        health != null ? " · Health " + health + "%" : "");
            }
        }
        return vi
                ? "- Sẵn sàng đội bay: Chưa có dữ liệu giám sát đội bay trực tiếp."
                : "- Fleet Readiness: No live fleet telemetry available.";
    }

    private String formatWeatherSummary(String hubName, Object raw) {
        boolean vi = LocaleUtils.isVietnamese();
        if (raw instanceof WeatherGoNoGoClientVm wx) {
            String vis = wx.visibilityM() != null
                    ? String.format(Locale.US, "%.1f km", wx.visibilityM() / 1000.0)
                    : "N/A";
            String wind = wx.windSpeedMs() != null
                    ? String.format(Locale.US, "%.1f m/s", wx.windSpeedMs())
                    : "N/A";
            if (vi) {
                return String.format(Locale.US,
                        "- Thời tiết (%s): %s · %s (gió %s, tầm nhìn %s)",
                        hubName,
                        wx.verdict() != null ? wx.verdict() : "UNKNOWN",
                        wx.flightCategory() != null ? wx.flightCategory() : "VFR",
                        wind,
                        vis);
            }
            return String.format(Locale.US,
                    "- Weather (%s): %s · %s (wind %s, visibility %s)",
                    hubName,
                    wx.verdict() != null ? wx.verdict() : "UNKNOWN",
                    wx.flightCategory() != null ? wx.flightCategory() : "VFR",
                    wind,
                    vis);
        }
        return vi
                ? "- Thời tiết (" + hubName + "): Hiện chưa có bản tin khí tượng."
                : "- Weather (" + hubName + "): Briefing currently unavailable.";
    }

    private String formatConflictsSummary(Object raw) {
        boolean vi = LocaleUtils.isVietnamese();
        if (raw instanceof List<?> list) {
            if (list.isEmpty()) {
                return vi
                        ? "- Xung đột không phận: 0 xung đột phân cách đang hoạt động."
                        : "- Airspace Conflicts: 0 active separation conflicts.";
            }
            return vi
                    ? "- Xung đột không phận: Phát hiện " + list.size() + " xung đột phân cách đang hoạt động."
                    : "- Airspace Conflicts: " + list.size() + " active separation conflict(s) detected.";
        }
        return vi
                ? "- Xung đột không phận: Trạng thái không khả dụng."
                : "- Airspace Conflicts: Status unavailable.";
    }

    private String formatEmergenciesSummary(Object raw) {
        boolean vi = LocaleUtils.isVietnamese();
        if (raw instanceof List<?> list) {
            if (list.isEmpty()) {
                return vi
                        ? "- Trung tâm khẩn cấp: 0 sự cố khẩn cấp đang hoạt động."
                        : "- Emergency Console: 0 active emergency incidents.";
            }
            return vi
                    ? "- Trung tâm khẩn cấp: Có " + list.size() + " sự cố đang hoạt động cần xử lý."
                    : "- Emergency Console: " + list.size() + " active incident(s) requiring attention.";
        }
        return vi
                ? "- Trung tâm khẩn cấp: Trạng thái không khả dụng."
                : "- Emergency Console: Status unavailable.";
    }

    private String formatTrafficSummary(Object raw) {
        boolean vi = LocaleUtils.isVietnamese();
        if (raw instanceof Map<?, ?> map) {
            Object total = map.get("total");
            Object low = map.get("lowAltitudeCount");
            if (vi) {
                return String.format(Locale.US,
                        "- Lưu lượng ADS-B trực tiếp: Đang theo dõi %s tàu bay (%s dưới 5.000 ft).",
                        total != null ? total : 0,
                        low != null ? low : 0);
            }
            return String.format(Locale.US,
                    "- Live ADS-B Traffic: %s aircraft tracked (%s below 5,000 ft).",
                    total != null ? total : 0,
                    low != null ? low : 0);
        }
        return vi
                ? "- Lưu lượng ADS-B trực tiếp: Nguồn dữ liệu không khả dụng."
                : "- Live ADS-B Traffic: Feed unavailable.";
    }

    private String formatNotamSummary(Object raw) {
        boolean vi = LocaleUtils.isVietnamese();
        if (raw instanceof Map<?, ?> map) {
            Object count = map.get("count");
            Object critical = map.get("critical");
            if (vi) {
                return String.format(Locale.US,
                        "- NOTAM hiệu lực: %s điện văn đang hiệu lực (%s mức nghiêm trọng).",
                        count != null ? count : 0,
                        critical != null ? critical : 0);
            }
            return String.format(Locale.US,
                    "- Active NOTAMs: %s active notice(s) (%s critical).",
                    count != null ? count : 0,
                    critical != null ? critical : 0);
        }
        return vi
                ? "- NOTAM hiệu lực: Nguồn dữ liệu không khả dụng."
                : "- Active NOTAMs: Feed unavailable.";
    }

    private String formatFlightsSummary(Object raw) {
        boolean vi = LocaleUtils.isVietnamese();
        if (raw instanceof List<?> list) {
            long active = list.stream()
                    .filter(it -> it instanceof Map<?, ?> m && "active".equalsIgnoreCase(String.valueOf(m.get("status"))))
                    .count();
            long scheduled = list.stream()
                    .filter(it -> it instanceof Map<?, ?> m && "scheduled".equalsIgnoreCase(String.valueOf(m.get("status"))))
                    .count();
            if (vi) {
                return String.format(Locale.US,
                        "- Tổng quan chuyến bay: %d chuyến bay (%d đang bay, %d đã lên lịch).",
                        list.size(), active, scheduled);
            }
            return String.format(Locale.US,
                    "- Flights Snapshot: %d total flight(s) (%d active, %d scheduled).",
                    list.size(), active, scheduled);
        }
        return vi
                ? "- Tổng quan chuyến bay: Không có dữ liệu chuyến bay."
                : "- Flights Snapshot: No flights returned.";
    }

    public DispatchOutcome dispatchTool(String name, Map<String, Object> input) {
        return switch (name) {
            case "list_flights" -> {
                String status = input.get("status") != null ? String.valueOf(input.get("status")) : null;
                String hubId = input.get("hubId") != null ? String.valueOf(input.get("hubId")) : null;
                List<Map<String, Object>> flights = interopClient.getFlights(status, hubId).stream()
                        .map(f -> {
                            Map<String, Object> m = new LinkedHashMap<>();
                            m.put("id", f.id());
                            m.put("flightNumber", f.flightNumber());
                            m.put("status", f.status());
                            m.put("departureHubId", f.departureHubId());
                            m.put("arrivalHubId", f.arrivalHubId());
                            m.put("maxAltitudeM", f.maxAltitudeM() != null ? f.maxAltitudeM() : f.cruisingAltitudeM());
                            m.put("droneId", f.droneId());
                            return m;
                        })
                        .toList();
                yield new DispatchOutcome(flights, null);
            }
            case "get_flight" -> {
                FlightClientVm f = resolveFlight(String.valueOf(input.getOrDefault("flightId", ""))).orElse(null);
                if (f == null) {
                    yield new DispatchOutcome(Map.of("error", "Flight not found"), null);
                }
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", f.id());
                m.put("flightNumber", f.flightNumber());
                m.put("status", f.status());
                m.put("departureHubId", f.departureHubId());
                m.put("arrivalHubId", f.arrivalHubId());
                m.put("droneId", f.droneId());
                yield new DispatchOutcome(m, null);
            }
            case "list_drones" -> {
                List<Map<String, Object>> drones = interopClient.getAllDrones().stream()
                        .map(d -> {
                            Map<String, Object> m = new LinkedHashMap<>();
                            m.put("id", d.id());
                            m.put("registration", d.registrationNumber());
                            m.put("model", d.model());
                            m.put("status", d.status());
                            m.put("currentHubId", d.currentHubId() != null ? d.currentHubId() : d.homeHubId());
                            return m;
                        })
                        .toList();
                yield new DispatchOutcome(drones, null);
            }
            case "list_hubs" -> {
                List<Map<String, Object>> hubs = interopClient.getAllHubs().stream()
                        .map(h -> {
                            Map<String, Object> m = new LinkedHashMap<>();
                            m.put("id", h.id());
                            m.put("code", h.code());
                            m.put("name", h.name());
                            m.put("status", h.status());
                            return m;
                        })
                        .toList();
                yield new DispatchOutcome(hubs, null);
            }
            case "fleet_overview" -> new DispatchOutcome(interopClient.getFleetOverview(), null);
            case "active_conflicts" -> {
                List<ConflictClientVm> conflicts = interopClient.getActiveConflicts();
                yield new DispatchOutcome(conflicts, null);
            }
            case "emergency_incidents" -> {
                boolean activeOnly = Boolean.TRUE.equals(input.get("activeOnly"));
                List<EmergencyIncidentClientVm> incidents = interopClient.getEmergencyIncidents(activeOnly);
                yield new DispatchOutcome(incidents, null);
            }
            case "weather_go_no_go" -> {
                HubClientVm hub = resolveHub(String.valueOf(input.getOrDefault("hub", ""))).orElse(null);
                if (hub == null) {
                    yield new DispatchOutcome(Map.of("error", "Hub not found"), null);
                }
                Optional<WeatherGoNoGoClientVm> wx = interopClient.getWeatherGoNoGo(hub.id());
                yield new DispatchOutcome(wx.<Object>map(w -> w).orElse(Map.of("status", "unavailable")), null);
            }
            case "get_notams" -> {
                List<NotamItemClientVm> notams = interopClient.getNotams();
                long critical = notams.stream().filter(n -> "critical".equalsIgnoreCase(n.significance())).count();
                yield new DispatchOutcome(Map.of(
                        "count", notams.size(),
                        "critical", critical,
                        "items", notams.stream().limit(10).toList()), null);
            }
            case "live_traffic" -> {
                List<AdsbAircraftClientVm> ac = interopClient.getAdsbAircraft();
                List<AdsbAircraftClientVm> low = ac.stream()
                        .filter(a -> !Boolean.TRUE.equals(a.onGround())
                                && (a.altitudeFt() == null || a.altitudeFt() <= 5000.0))
                        .toList();
                yield new DispatchOutcome(Map.of(
                        "total", ac.size(),
                        "lowAltitudeCount", low.size(),
                        "sample", low.stream().limit(10).toList()), null);
            }
            case "flight_briefing" -> {
                FlightClientVm f = resolveFlight(String.valueOf(input.getOrDefault("flightId", ""))).orElse(null);
                if (f == null) {
                    yield new DispatchOutcome(Map.of("error", "Flight not found"), null);
                }
                FlightBriefingVm b = briefingService.getFlightBriefing(f.id());
                yield new DispatchOutcome(b, null);
            }
            case "propose_authorize_flight" -> {
                boolean vi = LocaleUtils.isVietnamese();
                FlightClientVm f = resolveFlight(String.valueOf(input.getOrDefault("flightId", ""))).orElse(null);
                if (f == null) {
                    yield new DispatchOutcome(Map.of("error", "Flight not found"), null);
                }
                ProposedActionVm proposal = new ProposedActionVm(
                        "authorize_flight",
                        vi ? "Cấp phép chuyến bay " + f.flightNumber() : "Authorize flight " + f.flightNumber(),
                        "POST",
                        "/api/v1/flights/" + f.id() + "/authorize",
                        null,
                        String.valueOf(input.getOrDefault("rationale", "")));
                yield new DispatchOutcome(Map.of("proposed", proposal.kind(), "flightId", f.id()), proposal);
            }
            case "propose_abort_flight" -> {
                boolean vi = LocaleUtils.isVietnamese();
                FlightClientVm f = resolveFlight(String.valueOf(input.getOrDefault("flightId", ""))).orElse(null);
                if (f == null) {
                    yield new DispatchOutcome(Map.of("error", "Flight not found"), null);
                }
                String rationale = String.valueOf(input.getOrDefault(
                        "rationale",
                        vi ? "Điều phái viên hủy chuyến bay" : "Operator abort"));
                ProposedActionVm proposal = new ProposedActionVm(
                        "abort_flight",
                        vi ? "Hủy chuyến bay " + f.flightNumber() : "Abort flight " + f.flightNumber(),
                        "POST",
                        "/api/v1/flights/" + f.id() + "/abort",
                        Map.of("reason", rationale),
                        rationale);
                yield new DispatchOutcome(Map.of("proposed", proposal.kind(), "flightId", f.id()), proposal);
            }
            case "propose_resolve_conflict" -> {
                boolean vi = LocaleUtils.isVietnamese();
                String conflictId = String.valueOf(input.getOrDefault("conflictId", ""));
                String rationale = String.valueOf(input.getOrDefault("rationale", ""));
                ProposedActionVm proposal = new ProposedActionVm(
                        "resolve_conflict",
                        vi ? "Giải quyết xung đột " + conflictId : "Resolve conflict " + conflictId,
                        "POST",
                        "/api/v1/conflicts/" + conflictId + "/resolve",
                        Map.of("strategy", "hold", "actions", Map.of("notes", rationale, "source", "copilot")),
                        rationale);
                yield new DispatchOutcome(Map.of("proposed", proposal.kind(), "conflictId", conflictId), proposal);
            }
            case "propose_confirm_emergency" -> {
                boolean vi = LocaleUtils.isVietnamese();
                String incidentId = String.valueOf(input.getOrDefault("incidentId", ""));
                String rationale = String.valueOf(input.getOrDefault("rationale", ""));
                ProposedActionVm proposal = new ProposedActionVm(
                        "confirm_emergency",
                        vi ? "Xác nhận ứng phó sự cố " + incidentId : "Confirm response for incident " + incidentId,
                        "POST",
                        "/api/v1/emergency/incidents/" + incidentId + "/confirm",
                        Map.of("approved", true),
                        rationale);
                yield new DispatchOutcome(Map.of("proposed", proposal.kind(), "incidentId", incidentId), proposal);
            }
            default -> new DispatchOutcome(Map.of("error", "Unknown tool: " + name), null);
        };
    }

    private Optional<FlightClientVm> resolveFlight(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        String trimmed = token.trim();
        Optional<FlightClientVm> direct = interopClient.getFlightById(trimmed);
        if (direct.isPresent()) {
            return direct;
        }
        return interopClient.getFlights(null, null).stream()
                .filter(f -> trimmed.equalsIgnoreCase(f.id()) || trimmed.equalsIgnoreCase(f.flightNumber()))
                .findFirst();
    }

    private Optional<HubClientVm> resolveHub(String token) {
        if (token == null || token.isBlank()) {
            return Optional.empty();
        }
        String t = token.trim().toLowerCase(Locale.ROOT);
        List<HubClientVm> hubs = interopClient.getAllHubs();
        return hubs.stream()
                .filter(h -> token.trim().equals(h.id())
                        || (h.code() != null && h.code().toLowerCase(Locale.ROOT).equals(t))
                        || (h.name() != null && h.name().toLowerCase(Locale.ROOT).contains(t)))
                .findFirst();
    }

    private FlightClientVm findMatchingFlightInPrompt(String lowerPrompt, List<FlightClientVm> candidates) {
        if (candidates == null || candidates.isEmpty()) {
            return null;
        }
        return candidates.stream()
                .filter(f -> (f.flightNumber() != null && lowerPrompt.contains(f.flightNumber().toLowerCase(Locale.ROOT)))
                        || (f.id() != null && lowerPrompt.contains(f.id().toLowerCase(Locale.ROOT))))
                .findFirst()
                .orElse(candidates.get(0));
    }

    private List<Map<String, Object>> buildToolDefinitions() {
        return List.of(
                tool("list_flights", "List flights filtered by optional status or hubId",
                        Map.of("status", Map.of("type", "string"), "hubId", Map.of("type", "string")), List.of()),
                tool("get_flight", "Get full details for a flight by ID or flightNumber",
                        Map.of("flightId", Map.of("type", "string")), List.of("flightId")),
                tool("list_drones", "List all drones with status and hub", Map.of(), List.of()),
                tool("list_hubs", "List all hubs with code, name, and status", Map.of(), List.of()),
                tool("fleet_overview", "Aggregate fleet state across hubs", Map.of(), List.of()),
                tool("active_conflicts", "List active airspace separation conflicts", Map.of(), List.of()),
                tool("emergency_incidents", "List emergency incidents",
                        Map.of("activeOnly", Map.of("type", "boolean")), List.of()),
                tool("weather_go_no_go", "Get GO/CAUTION/NO_GO weather verdict for a hub",
                        Map.of("hub", Map.of("type", "string")), List.of("hub")),
                tool("get_notams", "Get active Vietnam FIR NOTAMs", Map.of(), List.of()),
                tool("live_traffic", "Summary of live ADS-B manned aircraft", Map.of(), List.of()),
                tool("flight_briefing", "Run consolidated pre-flight briefing for a flight",
                        Map.of("flightId", Map.of("type", "string")), List.of("flightId")),
                tool("propose_authorize_flight", "Propose authorizing a flight (confirm-gated)",
                        Map.of("flightId", Map.of("type", "string"), "rationale", Map.of("type", "string")),
                        List.of("flightId", "rationale")),
                tool("propose_abort_flight", "Propose aborting a flight (confirm-gated)",
                        Map.of("flightId", Map.of("type", "string"), "rationale", Map.of("type", "string")),
                        List.of("flightId", "rationale")),
                tool("propose_resolve_conflict", "Propose resolving a conflict (confirm-gated)",
                        Map.of("conflictId", Map.of("type", "string"), "rationale", Map.of("type", "string")),
                        List.of("conflictId", "rationale")),
                tool("propose_confirm_emergency", "Propose confirming an emergency response (confirm-gated)",
                        Map.of("incidentId", Map.of("type", "string"), "rationale", Map.of("type", "string")),
                        List.of("incidentId", "rationale"))
        );
    }

    private Map<String, Object> tool(
            String name, String description, Map<String, Object> properties, List<String> required) {
        Map<String, Object> schema = new LinkedHashMap<>();
        schema.put("type", "object");
        schema.put("properties", properties);
        if (!required.isEmpty()) {
            schema.put("required", required);
        }
        return Map.of("name", name, "description", description, "input_schema", schema);
    }

    public record DispatchOutcome(Object result, ProposedActionVm proposal) {
    }
}
