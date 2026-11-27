package com.utm.intelligence.service;

import com.utm.commonlibrary.ai.LlmReasoningClient;
import com.utm.commonlibrary.utils.LocaleUtils;
import com.utm.intelligence.service.client.IntelligenceInteropClientService;
import com.utm.intelligence.viewmodel.IntelligenceDtos.AdsbAircraftClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.DemoStateVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.DirectorAdviceVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.DirectorOptionVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.FlightClientVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ForesightFrameObjectVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ForesightFrameVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ForesightObjectVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ForesightTimelineVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.LatLonVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ObjectRefVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.PredictedConflictVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.ResolutionManeuverVm;
import com.utm.intelligence.viewmodel.IntelligenceDtos.TelemetryClientVm;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
@Slf4j
public class ForesightService {

    private static final double EARTH_RADIUS_M = 6371000.0;
    private static final double KNOTS_TO_MPS = 0.514444;
    private static final double FTMIN_TO_MPS = 0.00508;
    private static final double FT_TO_M = 0.3048;
    private static final double HORIZ_THRESHOLD_M = 150.0;
    private static final double VERT_THRESHOLD_M = 30.0;
    private static final int MAX_HORIZON_SEC = 1800;
    private static final int MIN_STEP_SEC = 1;
    private static final int MAX_STEP_SEC = 60;
    private static final int MAX_MANEUVERS = 16;

    private final IntelligenceInteropClientService interopClient;
    private final LlmReasoningClient llmReasoningClient;
    private final AtomicReference<Long> demoStartedAtMs = new AtomicReference<>(null);

    public DemoStateVm startDemo() {
        demoStartedAtMs.set(System.currentTimeMillis());
        return new DemoStateVm(true);
    }

    public DemoStateVm resetDemo() {
        demoStartedAtMs.set(null);
        return new DemoStateVm(false);
    }

    public boolean isDemoActive() {
        return demoStartedAtMs.get() != null;
    }

    public ForesightTimelineVm predict(Integer horizonSec, Integer stepSec, List<ResolutionManeuverVm> maneuvers) {
        List<ForesightObjectVm> objects = gatherNowState();
        return predictFromObjects(objects, horizonSec, stepSec, maneuvers);
    }

    public ForesightTimelineVm predictFromObjects(
            List<ForesightObjectVm> input,
            Integer horizonOpt,
            Integer stepOpt,
            List<ResolutionManeuverVm> rawManeuvers) {
        int stepSec = clamp(stepOpt, MIN_STEP_SEC, MAX_STEP_SEC, 5);
        int horizonSec = clamp(horizonOpt, stepSec, MAX_HORIZON_SEC, 600);
        List<ResolutionManeuverVm> maneuvers = rawManeuvers != null
                ? rawManeuvers.stream().limit(MAX_MANEUVERS).toList()
                : List.of();

        List<ForesightObjectVm> initialObjects = input.stream()
                .map(o -> applyInitialManeuver(o, maneuvers))
                .toList();
        Map<String, ForesightObjectVm> byId = new LinkedHashMap<>();
        for (ForesightObjectVm o : initialObjects) {
            byId.put(o.id(), o);
        }

        int steps = horizonSec / stepSec;
        List<ForesightObjectVm> current = new ArrayList<>(initialObjects);
        List<ForesightFrameVm> frames = new ArrayList<>(steps + 1);
        Map<String, CpaBest> bestByPair = new LinkedHashMap<>();

        for (int i = 0; i <= steps; i++) {
            int tSec = i * stepSec;
            List<ForesightFrameObjectVm> frameObjs = current.stream()
                    .map(o -> new ForesightFrameObjectVm(o.id(), o.lat(), o.lon(), o.altitudeM()))
                    .toList();
            frames.add(new ForesightFrameVm(tSec, frameObjs));

            for (int a = 0; a < current.size(); a++) {
                for (int b = a + 1; b < current.size(); b++) {
                    ForesightObjectVm oa = current.get(a);
                    ForesightObjectVm ob = current.get(b);
                    if ("manned".equals(oa.kind()) && "manned".equals(ob.kind())) {
                        continue;
                    }
                    double horizM = haversineMeters(oa.lat(), oa.lon(), ob.lat(), ob.lon());
                    double vertM = Math.abs(oa.altitudeM() - ob.altitudeM());
                    if (horizM >= HORIZ_THRESHOLD_M || vertM >= VERT_THRESHOLD_M) {
                        continue;
                    }
                    String[] pair = new String[] { oa.id(), ob.id() };
                    Arrays.sort(pair);
                    String key = pair[0] + "::" + pair[1];
                    CpaBest prev = bestByPair.get(key);
                    if (prev == null || horizM < prev.sepM()) {
                        bestByPair.put(key, new CpaBest(
                                horizM,
                                tSec,
                                (oa.lat() + ob.lat()) / 2.0,
                                (oa.lon() + ob.lon()) / 2.0,
                                (oa.altitudeM() + ob.altitudeM()) / 2.0));
                    }
                }
            }

            List<ForesightObjectVm> next = new ArrayList<>(current.size());
            for (ForesightObjectVm o : current) {
                next.add(advanceWithHold(o, tSec, stepSec, maneuvers));
            }
            current = next;
        }

        List<PredictedConflictVm> predictedConflicts = new ArrayList<>();
        for (Map.Entry<String, CpaBest> entry : bestByPair.entrySet()) {
            String[] ids = entry.getKey().split("::", 2);
            ForesightObjectVm oa = byId.get(ids[0]);
            ForesightObjectVm ob = byId.get(ids[1]);
            CpaBest v = entry.getValue();
            predictedConflicts.add(new PredictedConflictVm(
                    "pc-" + entry.getKey(),
                    v.tSec(),
                    (int) Math.round(v.sepM()),
                    new LatLonVm(v.lat(), v.lon()),
                    (int) Math.round(v.altM()),
                    new ObjectRefVm(oa.id(), oa.label()),
                    new ObjectRefVm(ob.id(), ob.label())));
        }

        return new ForesightTimelineVm(
                ZonedDateTime.now().toString(),
                horizonSec,
                stepSec,
                initialObjects,
                frames,
                predictedConflicts);
    }

    public DirectorAdviceVm advise(PredictedConflictVm conflict) {
        boolean vi = LocaleUtils.isVietnamese();
        if (conflict == null || conflict.location() == null
                || conflict.primary() == null || conflict.secondary() == null) {
            return new DirectorAdviceVm(
                    vi ? "Không có dữ liệu xung đột dự báo hợp lệ." : "No valid predicted conflict was provided.",
                    vi ? "Yêu cầu không bao gồm thông tin xung đột cần đánh giá." : "The request did not include a conflict to assess.",
                    List.of(),
                    0,
                    "deterministic");
        }

        if (llmReasoningClient != null && llmReasoningClient.isEnabled()) {
            String system = "You are the Air Traffic Director for DROPS-UTM Vietnam. "
                    + "Given a predicted conflict (<150m horizontal AND <30m vertical), return JSON with keys: "
                    + "summary, cause, recommendedIndex (0..2), and options (array of 3 objects with kind=hold|altitude|lateral, "
                    + "label, objectId, delaySec, altitudeDeltaM, lateralOffsetM, rationale, sideEffects). "
                    + "Size maneuvers so separation is completely cleared: altitude >= 40m change, hold >= 120s, lateral >= 300m."
                    + (vi
                            ? " Write summary, cause, and each option's label, rationale, and sideEffects in concise, professional civil-aviation Vietnamese (Tiếng Việt), while keeping each option's kind strictly equal to hold, altitude, or lateral."
                            : "");
            String user = String.format(Locale.US,
                    "Conflict between %s (%s) and %s (%s) in %ds, minSep=%dm at lat=%.4f, lon=%.4f, alt=%dm.",
                    conflict.primary().label(), conflict.primary().id(),
                    conflict.secondary().label(), conflict.secondary().id(),
                    conflict.timeToConflictSec(), conflict.minSeparationM(),
                    conflict.location().lat(), conflict.location().lon(), conflict.altitudeM());
            DirectorAdviceVm aiAdvice = llmReasoningClient.generateStructuredJson(
                    system, user, DirectorAdviceVm.class, 1024).orElse(null);
            if (aiAdvice != null && aiAdvice.options() != null && !aiAdvice.options().isEmpty()) {
                int clamped = Math.min(Math.max(0, aiAdvice.recommendedIndex()), aiAdvice.options().size() - 1);
                return new DirectorAdviceVm(
                        aiAdvice.summary(),
                        aiAdvice.cause(),
                        aiAdvice.options(),
                        clamped,
                        "ai");
            }
        }

        List<DirectorOptionVm> options = List.of(
                new DirectorOptionVm(
                        "hold",
                        vi
                                ? "Giữ chờ " + conflict.secondary().label() + " trong 120 giây"
                                : "Hold " + conflict.secondary().label() + " for 120s",
                        120,
                        null,
                        null,
                        conflict.secondary().id(),
                        vi
                                ? "Trì hoãn " + conflict.secondary().label() + " 120 giây giúp " + conflict.primary().label()
                                        + " thoát qua điểm giao cắt trước với giãn cách ngang >150m."
                                : "Delaying " + conflict.secondary().label() + " by 120s lets " + conflict.primary().label()
                                        + " clear the crossing point first with >150m horizontal buffer.",
                        vi
                                ? "Tăng thời gian trễ 120 giây cho " + conflict.secondary().label() + "."
                                : "Adds 120s delay to " + conflict.secondary().label() + "."),
                new DirectorOptionVm(
                        "altitude",
                        vi
                                ? "Hạ độ cao " + conflict.primary().label() + " thêm 50m"
                                : "Descend " + conflict.primary().label() + " by 50m",
                        null,
                        -50.0,
                        null,
                        conflict.primary().id(),
                        vi
                                ? "Thay đổi phân cách cao độ 50m khôi phục giãn cách đứng >30m tại điểm tiếp cận gần nhất CPA (dự báo ngang "
                                        + conflict.minSeparationM() + "m)."
                                : "A 50m vertical separation change restores >30m vertical clearance at CPA (predicted "
                                        + conflict.minSeparationM() + "m horizontal).",
                        vi
                                ? "Không gây trễ giờ đến; vẫn đảm bảo độ cao an toàn so với mặt đất (AGL)."
                                : "Zero arrival delay; maintains safe AGL clearance."),
                new DirectorOptionVm(
                        "lateral",
                        vi
                                ? "Dịch ngang lộ trình " + conflict.secondary().label() + " 500m"
                                : "Offset " + conflict.secondary().label() + " 500m laterally",
                        null,
                        null,
                        500.0,
                        conflict.secondary().id(),
                        vi
                                ? "Dịch ngang vuông góc 500m mở rộng khoảng cách CPA ngang vượt xa ngưỡng an toàn 150m."
                                : "A 500m perpendicular lateral offset opens horizontal CPA well beyond the 150m threshold.",
                        vi
                                ? "Quãng đường bay của " + conflict.secondary().label() + " dài hơn nhẹ."
                                : "Slightly longer path for " + conflict.secondary().label() + ".")
        );

        return new DirectorAdviceVm(
                vi
                        ? String.format(Locale.US, "Dự báo mất phân cách an toàn (%dm) giữa %s và %s sau %d giây.",
                                conflict.minSeparationM(), conflict.primary().label(),
                                conflict.secondary().label(), conflict.timeToConflictSec())
                        : String.format("Predicted loss of separation (%dm) between %s and %s in %ds.",
                                conflict.minSeparationM(), conflict.primary().label(),
                                conflict.secondary().label(), conflict.timeToConflictSec()),
                vi
                        ? conflict.secondary().label() + " hội tụ quỹ đạo với " + conflict.primary().label() + " gần điểm giao cắt."
                        : conflict.secondary().label() + " converging with " + conflict.primary().label() + " near the crossing point.",
                options,
                1,
                "deterministic");
    }

    private List<ForesightObjectVm> gatherNowState() {
        List<ForesightObjectVm> objects = new ArrayList<>();

        List<FlightClientVm> activeFlights = interopClient.getFlights("active", null);
        for (FlightClientVm f : activeFlights) {
            TelemetryClientVm t = interopClient.getLatestTelemetryByFlight(f.id()).orElse(null);
            if (t == null || t.latitude() == null || t.longitude() == null) {
                continue;
            }
            objects.add(new ForesightObjectVm(
                    "flight:" + f.id(),
                    "drone",
                    f.flightNumber() != null ? f.flightNumber() : f.id(),
                    t.latitude(),
                    t.longitude(),
                    t.altitude() != null ? t.altitude() : 0.0,
                    t.heading() != null ? t.heading() : 0.0,
                    t.speed() != null ? t.speed() : 0.0,
                    t.verticalSpeed() != null ? t.verticalSpeed() : 0.0));
        }

        List<AdsbAircraftClientVm> aircraft = interopClient.getAdsbAircraft();
        for (AdsbAircraftClientVm ac : aircraft) {
            if (Boolean.TRUE.equals(ac.onGround()) || ac.lat() == null || ac.lon() == null) {
                continue;
            }
            objects.add(new ForesightObjectVm(
                    "adsb:" + ac.hex(),
                    "manned",
                    ac.callsign() != null && !ac.callsign().isBlank() ? ac.callsign().trim() : ac.hex(),
                    ac.lat(),
                    ac.lon(),
                    (ac.altitudeFt() != null ? ac.altitudeFt() : 0.0) * FT_TO_M,
                    ac.trackDeg() != null ? ac.trackDeg() : 0.0,
                    (ac.groundSpeedKt() != null ? ac.groundSpeedKt() : 0.0) * KNOTS_TO_MPS,
                    (ac.verticalRateFpm() != null ? ac.verticalRateFpm() : 0.0) * FTMIN_TO_MPS));
        }

        Long startedAt = demoStartedAtMs.get();
        if (startedAt != null) {
            double elapsedSec = Math.max(0.0, (System.currentTimeMillis() - startedAt) / 1000.0);
            for (ForesightObjectVm seed : buildVietnamDemoSeed()) {
                objects.add(advance(seed, elapsedSec));
            }
        }
        return objects;
    }

    private List<ForesightObjectVm> buildVietnamDemoSeed() {
        return List.of(
                new ForesightObjectVm(
                        "demo:DRN-FORESIGHT-1",
                        "demo",
                        "DRN-FORESIGHT-1",
                        10.7425,
                        106.6659,
                        120.0,
                        45.0,
                        15.0,
                        0.0),
                new ForesightObjectVm(
                        "demo:DRN-FORESIGHT-2",
                        "demo",
                        "DRN-FORESIGHT-2",
                        10.7425,
                        106.7359,
                        85.0,
                        315.0,
                        15.0,
                        0.095)
        );
    }

    private ForesightObjectVm applyInitialManeuver(ForesightObjectVm o, List<ResolutionManeuverVm> maneuvers) {
        ForesightObjectVm out = o;
        for (ResolutionManeuverVm m : maneuvers) {
            if (!o.id().equals(m.objectId())) {
                continue;
            }
            if ("altitude".equalsIgnoreCase(m.kind()) && m.altitudeDeltaM() != null) {
                out = new ForesightObjectVm(
                        out.id(), out.kind(), out.label(), out.lat(), out.lon(),
                        Math.max(0.0, out.altitudeM() + m.altitudeDeltaM()),
                        out.headingDeg(), out.speedMps(), out.verticalSpeedMps());
            } else if ("lateral".equalsIgnoreCase(m.kind()) && m.lateralOffsetM() != null) {
                ForesightObjectVm side = new ForesightObjectVm(
                        out.id(), out.kind(), out.label(), out.lat(), out.lon(), out.altitudeM(),
                        (out.headingDeg() + 90.0) % 360.0, m.lateralOffsetM(), 0.0);
                ForesightObjectVm shifted = advance(side, 1.0);
                out = new ForesightObjectVm(
                        out.id(), out.kind(), out.label(), shifted.lat(), shifted.lon(),
                        out.altitudeM(), out.headingDeg(), out.speedMps(), out.verticalSpeedMps());
            }
        }
        return out;
    }

    private ForesightObjectVm advanceWithHold(
            ForesightObjectVm o, int tSec, int stepSec, List<ResolutionManeuverVm> maneuvers) {
        for (ResolutionManeuverVm m : maneuvers) {
            if (o.id().equals(m.objectId()) && "hold".equalsIgnoreCase(m.kind()) && m.delaySec() != null) {
                if (tSec < m.delaySec()) {
                    return o;
                }
            }
        }
        return advance(o, stepSec);
    }

    static ForesightObjectVm advance(ForesightObjectVm o, double dtSec) {
        double distance = o.speedMps() * dtSec;
        double angular = distance / EARTH_RADIUS_M;
        double brng = Math.toRadians(o.headingDeg());
        double lat1 = Math.toRadians(o.lat());
        double lon1 = Math.toRadians(o.lon());

        double lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular)
                + Math.cos(lat1) * Math.sin(angular) * Math.cos(brng));
        double lon2 = lon1 + Math.atan2(
                Math.sin(brng) * Math.sin(angular) * Math.cos(lat1),
                Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));

        double newLat = Math.toDegrees(lat2);
        double newLon = ((Math.toDegrees(lon2) + 540.0) % 360.0) - 180.0;
        double newAlt = o.altitudeM() + o.verticalSpeedMps() * dtSec;

        return new ForesightObjectVm(
                o.id(), o.kind(), o.label(), newLat, newLon, newAlt,
                o.headingDeg(), o.speedMps(), o.verticalSpeedMps());
    }

    static double haversineMeters(double lat1, double lon1, double lat2, double lon2) {
        double rLat1 = Math.toRadians(lat1);
        double rLat2 = Math.toRadians(lat2);
        double dLat = rLat2 - rLat1;
        double dLon = Math.toRadians(lon2 - lon1);
        double h = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0)
                + Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);
        return 2.0 * EARTH_RADIUS_M * Math.asin(Math.min(1.0, Math.sqrt(h)));
    }

    private int clamp(Integer val, int min, int max, int fallback) {
        if (val == null) {
            return fallback;
        }
        return Math.min(max, Math.max(min, val));
    }

    private record CpaBest(double sepM, int tSec, double lat, double lon, double altM) {
    }
}
