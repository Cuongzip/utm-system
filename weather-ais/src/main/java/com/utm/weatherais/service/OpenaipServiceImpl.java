package com.utm.weatherais.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.weatherais.viewmodel.openaip.OpenaipFeedVm;
import com.utm.weatherais.viewmodel.openaip.OpenaipFeedVm.OpenaipAirspaceVm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@Service
public class OpenaipServiceImpl implements OpenaipService {

    private static final double FEET_TO_M = 0.3048;
    private static final double FL_TO_M = 30.48;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final UpstreamHttpExecutor httpExecutor;
    private final String apiBaseUrl;
    private final String tileBaseUrl;
    private final String apiKey;
    private final String defaultCountry;

    private final SingleFlightTtlCache<List<OpenaipAirspaceVm>> airspaceCache = new SingleFlightTtlCache<>(3_600_000L);
    private final SingleFlightTtlCache<Optional<byte[]>> tileCache = new SingleFlightTtlCache<>(86_400_000L);

    public OpenaipServiceImpl(
            UpstreamHttpExecutor httpExecutor,
            @Value("${utm.openaip.api-base-url:https://api.core.openaip.net}") String apiBaseUrl,
            @Value("${utm.openaip.tile-base-url:https://api.tiles.openaip.net}") String tileBaseUrl,
            @Value("${utm.openaip.api-key:}") String apiKey,
            @Value("${utm.openaip.country:VN}") String defaultCountry) {
        this.httpExecutor = httpExecutor;
        this.apiBaseUrl = apiBaseUrl.endsWith("/") ? apiBaseUrl.substring(0, apiBaseUrl.length() - 1) : apiBaseUrl;
        this.tileBaseUrl = tileBaseUrl.endsWith("/") ? tileBaseUrl.substring(0, tileBaseUrl.length() - 1) : tileBaseUrl;
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.defaultCountry = (defaultCountry != null && !defaultCountry.isBlank())
                ? defaultCountry.trim().toUpperCase(Locale.ROOT)
                : "VN";
    }

    public boolean hasKey() {
        return !apiKey.isBlank();
    }

    @Override
    public OpenaipFeedVm getAirspaces(String country) {
        String targetCountry = (country != null && !country.isBlank())
                ? country.trim().toUpperCase(Locale.ROOT)
                : defaultCountry;

        if (!hasKey()) {
            return new OpenaipFeedVm(
                    0,
                    false,
                    targetCountry,
                    ZonedDateTime.now(ZoneOffset.UTC),
                    "openAIP (CC BY-NC-SA)",
                    "Airspace data (c) openAIP contributors (CC BY-NC-SA)",
                    List.of()
            );
        }

        List<OpenaipAirspaceVm> items = airspaceCache.getOrLoad(
                "openaip:" + targetCountry,
                () -> fetchAirspaces(targetCountry),
                List::of);

        return new OpenaipFeedVm(
                items.size(),
                true,
                targetCountry,
                ZonedDateTime.now(ZoneOffset.UTC),
                "openAIP (CC BY-NC-SA)",
                "Airspace data (c) openAIP contributors (CC BY-NC-SA)",
                items
        );
    }

    @Override
    public Optional<byte[]> getTile(int z, int x, int y) {
        if (!hasKey() || z < 0 || z > 20 || x < 0 || y < 0) {
            return Optional.empty();
        }
        String key = z + "/" + x + "/" + y;
        return tileCache.getOrLoad(key, () -> {
            String url = String.format("%s/api/data/openaip/%d/%d/%d.png?apiKey=%s",
                    tileBaseUrl, z, x, y, URLEncoder.encode(apiKey, StandardCharsets.UTF_8));
            return httpExecutor.getBytes(url, Map.of(), 7000);
        }, Optional::empty);
    }

    private List<OpenaipAirspaceVm> fetchAirspaces(String country) {
        String url = apiBaseUrl + "/api/airspaces?country=" + URLEncoder.encode(country, StandardCharsets.UTF_8) + "&limit=500";
        String body = httpExecutor.getString(url, Map.of("x-openaip-api-key", apiKey), 10000)
                .orElseThrow(() -> new IllegalStateException("openAIP airspaces unavailable"));
        try {
            JsonNode root = OBJECT_MAPPER.readTree(body);
            JsonNode itemsNode = root.has("items") ? root.get("items") : root;
            if (!itemsNode.isArray()) {
                return List.of();
            }
            List<OpenaipAirspaceVm> list = new ArrayList<>();
            for (JsonNode item : itemsNode) {
                int typeCode = item.path("type").asInt(-1);
                String mappedType = mapOpenaipType(typeCode);
                String severity = mapOpenaipSeverity(mappedType);
                Double lowerM = parseLimitMeters(item.get("lowerLimit"), 0.0);
                Double upperM = parseLimitMeters(item.get("upperLimit"), 9999.0);
                Map<String, Object> geometry = item.hasNonNull("geometry")
                        ? OBJECT_MAPPER.convertValue(item.get("geometry"), new TypeReference<>() {})
                        : null;

                list.add(new OpenaipAirspaceVm(
                        item.path("_id").asText(item.path("id").asText("")),
                        item.path("name").asText("Unnamed Airspace"),
                        item.path("country").asText(country),
                        mappedType,
                        item.path("icaoClass").asText(null),
                        severity,
                        lowerM,
                        upperM,
                        geometry
                ));
            }
            return list;
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to parse openAIP airspaces JSON", ex);
        }
    }

    private static String mapOpenaipType(int code) {
        return switch (code) {
            case 1 -> "RESTRICTED";
            case 2 -> "DANGER";
            case 3 -> "PROHIBITED";
            case 4 -> "CTR";
            case 7 -> "TMA";
            case 21 -> "NO_FLY_ZONE";
            default -> "OTHER";
        };
    }

    private static String mapOpenaipSeverity(String mappedType) {
        return switch (mappedType) {
            case "PROHIBITED", "NO_FLY_ZONE" -> "critical";
            case "RESTRICTED", "DANGER", "CTR" -> "warning";
            default -> "info";
        };
    }

    private static Double parseLimitMeters(JsonNode limitNode, double defaultVal) {
        if (limitNode == null || limitNode.isNull()) {
            return defaultVal;
        }
        double value = limitNode.path("value").asDouble(defaultVal);
        int unit = limitNode.path("unit").asInt(0);
        return switch (unit) {
            case 1 -> Math.round(value * FEET_TO_M * 10.0) / 10.0;
            case 6 -> Math.round(value * FL_TO_M * 10.0) / 10.0;
            default -> Math.round(value * 10.0) / 10.0;
        };
    }
}
