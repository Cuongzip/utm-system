package com.utm.weatherais.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.weatherais.viewmodel.notam.NotamFeedVm;
import com.utm.weatherais.viewmodel.notam.NotamFeedVm.NotamItemVm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class NotamServiceImpl implements NotamService {

    private static final double NM_TO_M = 1852.0;
    private static final double FL_TO_M = 30.48;
    private static final double FT_TO_M = 0.3048;
    private static final long PERM_EPOCH = 2147483647L;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private static final Map<String, String> Q_SUBJECTS = Map.ofEntries(
            Map.entry("RA", "Restricted area"),
            Map.entry("RD", "Danger area"),
            Map.entry("RP", "Prohibited area"),
            Map.entry("RR", "Reserved area"),
            Map.entry("RT", "Temporary restricted area"),
            Map.entry("RO", "Overflying restriction"),
            Map.entry("RM", "Military operating area"),
            Map.entry("WU", "Unmanned aircraft activity"),
            Map.entry("WP", "Parachuting / paragliding"),
            Map.entry("WE", "Aerial exercise"),
            Map.entry("WB", "Aerobatics"),
            Map.entry("WS", "Shooting / blasting"),
            Map.entry("WW", "Significant volcanic activity"),
            Map.entry("WV", "Formation flight"),
            Map.entry("WM", "Missile / gun / rocket firing"),
            Map.entry("WA", "Air display"),
            Map.entry("WT", "Mass movement of aircraft"),
            Map.entry("OB", "Obstacle"),
            Map.entry("OL", "Obstacle lights"),
            Map.entry("GG", "GNSS / GPS outage"),
            Map.entry("GA", "GNSS augmentation outage"),
            Map.entry("FA", "Aerodrome"),
            Map.entry("AF", "Flight information / advisory service"),
            Map.entry("AT", "Terminal control area"),
            Map.entry("AC", "Controlled airspace"),
            Map.entry("AD", "Air defence identification zone"),
            Map.entry("AN", "Area navigation route"),
            Map.entry("AE", "Control area")
    );

    private final UpstreamHttpExecutor httpExecutor;
    private final String baseUrl;
    private final String clientId;
    private final String clientSecret;
    private final List<String> defaultIcaos;
    private final SingleFlightTtlCache<List<NotamItemVm>> notamCache = new SingleFlightTtlCache<>(300_000L);

    private volatile String cachedAccessToken;
    private volatile Instant tokenExpiresAt = Instant.EPOCH;

    public NotamServiceImpl(
            UpstreamHttpExecutor httpExecutor,
            @Value("${utm.notam.base-url:https://api.autorouter.aero}") String baseUrl,
            @Value("${utm.notam.client-id:}") String clientId,
            @Value("${utm.notam.client-secret:}") String clientSecret,
            @Value("${utm.notam.default-icaos:VVHM,VVGL,VVTS,VVNB,VVDN}") String defaultIcaosRaw) {
        this.httpExecutor = httpExecutor;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.clientId = clientId != null ? clientId.trim() : "";
        this.clientSecret = clientSecret != null ? clientSecret.trim() : "";
        this.defaultIcaos = parseIcaos(defaultIcaosRaw);
    }

    public boolean hasCredentials() {
        return !clientId.isBlank() && !clientSecret.isBlank();
    }

    @Override
    public NotamFeedVm getNotams(String icaosRaw) {
        List<String> codes = (icaosRaw != null && !icaosRaw.isBlank()) ? parseIcaos(icaosRaw) : defaultIcaos;
        if (!hasCredentials()) {
            return new NotamFeedVm(0, false, codes, ZonedDateTime.now(ZoneOffset.UTC), "autorouter.aero", List.of());
        }

        String key = "notam:" + String.join(",", codes);
        List<NotamItemVm> items = notamCache.getOrLoad(key, () -> fetchNotams(codes), List::of);
        return new NotamFeedVm(
                items.size(),
                true,
                codes,
                ZonedDateTime.now(ZoneOffset.UTC),
                "autorouter.aero",
                items
        );
    }

    private List<NotamItemVm> fetchNotams(List<String> codes) {
        String token = obtainAccessToken();
        String itemAs = URLEncoder.encode("[\"" + String.join("\",\"", codes) + "\"]", StandardCharsets.UTF_8);
        String url = baseUrl + "/v1.0/notam?itemas=" + itemAs + "&offset=0&limit=100";
        String body = httpExecutor.getString(url, Map.of("Authorization", "Bearer " + token), 8000)
                .orElseThrow(() -> new IllegalStateException("Autorouter NOTAM fetch failed"));
        try {
            JsonNode root = OBJECT_MAPPER.readTree(body);
            JsonNode rows = root.has("rows") ? root.get("rows") : root;
            if (!rows.isArray()) {
                return List.of();
            }
            List<NotamItemVm> result = new ArrayList<>();
            long nowEpoch = Instant.now().getEpochSecond();
            for (JsonNode row : rows) {
                if (row.path("suppressed").asBoolean(false)) {
                    continue;
                }
                long startEpoch = row.hasNonNull("startvalidity") && row.get("startvalidity").isNumber()
                        ? row.get("startvalidity").asLong() : 0L;
                long endEpoch = row.hasNonNull("endvalidity") && row.get("endvalidity").isNumber()
                        ? row.get("endvalidity").asLong() : PERM_EPOCH;
                if (endEpoch > 0 && endEpoch < nowEpoch) {
                    continue;
                }

                String code23 = row.path("code23").asText("");
                String code45 = row.path("code45").asText("");
                String qCode = (!code23.isEmpty() || !code45.isEmpty()) ? ("Q" + code23 + code45) : row.path("qcode").asText(null);
                String subjectKey = code23.length() >= 2 ? code23.substring(0, 2).toUpperCase(Locale.ROOT)
                        : (qCode != null && qCode.length() >= 3 ? qCode.substring(1, 3).toUpperCase(Locale.ROOT) : "");
                String subject = Q_SUBJECTS.getOrDefault(subjectKey, "Aeronautical notice");
                String severity = classifySeverity(subjectKey);

                Double rawLat = row.hasNonNull("lat") && row.get("lat").isNumber() ? row.get("lat").asDouble() : null;
                Double rawLon = row.hasNonNull("lon") && row.get("lon").isNumber() ? row.get("lon").asDouble() : null;
                Double lat = normalizeAutorouterCoord(rawLat, 90.0);
                Double lon = normalizeAutorouterCoord(rawLon, 180.0);
                if (lat != null && lon != null && lat == 0.0 && lon == 0.0) {
                    lat = null;
                    lon = null;
                }

                Double radiusNm = row.hasNonNull("radius") && row.get("radius").isNumber() && row.get("radius").asDouble() > 0
                        ? row.get("radius").asDouble() : null;
                Double lowerFl = row.hasNonNull("lower") && row.get("lower").isNumber() ? row.get("lower").asDouble() : 0.0;
                Double upperFl = row.hasNonNull("upper") && row.get("upper").isNumber() ? row.get("upper").asDouble() : 999.0;
                double lowerLimitM = parseAltitudeLimitM(row.path("itemf").asText(null), lowerFl, 0.0);
                double upperLimitM = parseAltitudeLimitM(row.path("itemg").asText(null), upperFl, 999.0 * FL_TO_M);

                String itemA = codes.getFirst();
                JsonNode itemANode = row.get("itema");
                if (itemANode != null && itemANode.isArray() && !itemANode.isEmpty()) {
                    itemA = itemANode.get(0).asText(itemA);
                } else if (itemANode != null && itemANode.isTextual() && !itemANode.asText().isBlank()) {
                    itemA = itemANode.asText();
                }

                ZonedDateTime validFrom = startEpoch > 0 ? Instant.ofEpochSecond(startEpoch).atZone(ZoneOffset.UTC) : null;
                ZonedDateTime validTo = (endEpoch > 0 && endEpoch < PERM_EPOCH)
                        ? Instant.ofEpochSecond(endEpoch).atZone(ZoneOffset.UTC)
                        : null;

                result.add(new NotamItemVm(
                        row.path("id").asText(String.valueOf(result.size() + 1)),
                        row.path("series").asText("") + row.path("number").asText("") + "/" + row.path("year").asText(""),
                        itemA,
                        qCode,
                        subject,
                        severity,
                        lat,
                        lon,
                        radiusNm,
                        radiusNm != null ? Math.round(radiusNm * NM_TO_M * 10.0) / 10.0 : null,
                        lowerLimitM,
                        upperLimitM,
                        validFrom,
                        validTo,
                        row.path("iteme").asText(row.path("text").asText(""))
                ));
            }
            result.sort((a, b) -> Integer.compare(severityRank(b.severity()), severityRank(a.severity())));
            return result;
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to parse NOTAM payload", ex);
        }
    }

    private synchronized String obtainAccessToken() {
        if (cachedAccessToken != null && Instant.now().isBefore(tokenExpiresAt)) {
            return cachedAccessToken;
        }
        String form = "grant_type=client_credentials"
                + "&client_id=" + URLEncoder.encode(clientId, StandardCharsets.UTF_8)
                + "&client_secret=" + URLEncoder.encode(clientSecret, StandardCharsets.UTF_8);
        String body = httpExecutor.postFormUrlEncoded(baseUrl + "/v1.0/oauth2/token", form, 6000)
                .orElseThrow(() -> new IllegalStateException("Failed to obtain autorouter OAuth2 token"));
        try {
            JsonNode json = OBJECT_MAPPER.readTree(body);
            cachedAccessToken = json.path("access_token").asText();
            long expiresIn = json.path("expires_in").asLong(3600L);
            tokenExpiresAt = Instant.now().plusSeconds(Math.max(60L, expiresIn - 60L));
            return cachedAccessToken;
        } catch (Exception ex) {
            throw new IllegalStateException("Invalid autorouter token payload", ex);
        }
    }

    public static String classifySeverity(String subjectKey) {
        if (subjectKey == null || subjectKey.isBlank()) {
            return "info";
        }
        String c = subjectKey.trim().toUpperCase(Locale.ROOT);
        return switch (c) {
            case "RP", "RR", "RT", "RD", "RA", "WM", "WU" -> "critical";
            default -> (c.startsWith("W") || c.startsWith("O") || c.startsWith("G") || c.startsWith("R"))
                    ? "warning"
                    : "info";
        };
    }

    private static int severityRank(String severity) {
        if ("critical".equalsIgnoreCase(severity)) return 2;
        if ("warning".equalsIgnoreCase(severity)) return 1;
        return 0;
    }

    private static Double normalizeAutorouterCoord(Double raw, double maxAbsDeg) {
        if (raw == null || !Double.isFinite(raw)) {
            return null;
        }
        if (Math.abs(raw) > maxAbsDeg) {
            return Math.round((raw / 1e7) * 1e6) / 1e6;
        }
        return raw;
    }

    private static double parseAltitudeLimitM(String itemText, Double flFallback, double defaultM) {
        if (itemText != null && !itemText.isBlank()) {
            String upper = itemText.trim().toUpperCase(Locale.ROOT);
            if (upper.contains("GND") || upper.contains("SFC")) {
                return 0.0;
            }
            if (upper.contains("UNL")) {
                return Math.round(999.0 * FL_TO_M * 10.0) / 10.0;
            }
            java.util.regex.Matcher ftMatcher = java.util.regex.Pattern.compile("(\\d+)\\s*FT").matcher(upper);
            if (ftMatcher.find()) {
                return Math.round(Double.parseDouble(ftMatcher.group(1)) * FT_TO_M * 10.0) / 10.0;
            }
            java.util.regex.Matcher flMatcher = java.util.regex.Pattern.compile("FL\\s*(\\d+)").matcher(upper);
            if (flMatcher.find()) {
                return Math.round(Double.parseDouble(flMatcher.group(1)) * FL_TO_M * 10.0) / 10.0;
            }
        }
        if (flFallback != null && Double.isFinite(flFallback)) {
            return Math.round(flFallback * FL_TO_M * 10.0) / 10.0;
        }
        return defaultM;
    }

    private static List<String> parseIcaos(String raw) {
        List<String> list = Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toUpperCase(Locale.ROOT))
                .distinct()
                .toList();
        return list.isEmpty() ? List.of("VVHM") : list;
    }
}
