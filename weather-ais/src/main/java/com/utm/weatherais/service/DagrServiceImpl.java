package com.utm.weatherais.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.utm.weatherais.viewmodel.dagr.DagrConfigVm;
import com.utm.weatherais.viewmodel.dagr.DagrConfigVm.DagrAdvisoryVm;
import com.utm.weatherais.viewmodel.dagr.DagrConfigVm.DagrCheckPointsResponseVm;
import com.utm.weatherais.viewmodel.dagr.DagrConfigVm.DagrPointVm;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DagrServiceImpl implements DagrService {

    private static final double ORIGIN_SHIFT = 20037508.342789244;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final UpstreamHttpExecutor httpExecutor;
    private final String wmsUrl;
    private final String layer;

    public DagrServiceImpl(
            UpstreamHttpExecutor httpExecutor,
            @Value("${utm.dagr.wms-url:}") String wmsUrl,
            @Value("${utm.dagr.layer:utm:drone_zones}") String layer) {
        this.httpExecutor = httpExecutor;
        this.wmsUrl = wmsUrl != null ? wmsUrl.trim() : "";
        this.layer = layer != null && !layer.isBlank() ? layer.trim() : "utm:drone_zones";
    }

    public boolean isEnabled() {
        return !wmsUrl.isBlank();
    }

    @Override
    public DagrConfigVm getConfig() {
        return new DagrConfigVm(
                isEnabled(),
                wmsUrl,
                layer,
                "1.3.0",
                "Civil Aviation Authority / OGC WMS Drone Zones"
        );
    }

    @Override
    public Map<String, Object> getFeatureInfo(Map<String, String> queryParams) {
        if (!isEnabled()) {
            return Map.of("enabled", false, "features", List.of());
        }
        Map<String, String> merged = new LinkedHashMap<>();
        merged.put("SERVICE", "WMS");
        merged.put("VERSION", "1.3.0");
        merged.put("REQUEST", "GetFeatureInfo");
        merged.put("LAYERS", layer);
        merged.put("QUERY_LAYERS", layer);
        merged.put("INFO_FORMAT", "application/json");
        if (queryParams != null) {
            merged.putAll(queryParams);
        }

        String qs = merged.entrySet().stream()
                .map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "="
                        + URLEncoder.encode(e.getValue() != null ? e.getValue() : "", StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));
        String separator = wmsUrl.contains("?") ? "&" : "?";
        return httpExecutor.getString(wmsUrl + separator + qs, Map.of(), 6000)
                .map(body -> {
                    try {
                        return OBJECT_MAPPER.readValue(body, new TypeReference<Map<String, Object>>() {});
                    } catch (Exception ex) {
                        return Map.<String, Object>of("enabled", true, "raw", body);
                    }
                })
                .orElseGet(() -> Map.of("enabled", true, "features", List.of()));
    }

    @Override
    public DagrCheckPointsResponseVm checkPoints(List<DagrPointVm> points) {
        List<DagrPointVm> capped = points == null ? List.of() : points.stream().limit(12).toList();
        if (!isEnabled() || capped.isEmpty()) {
            return new DagrCheckPointsResponseVm(isEnabled(), capped.size(), 0, List.of(), ZonedDateTime.now(ZoneOffset.UTC));
        }

        List<DagrAdvisoryVm> advisories = new ArrayList<>();
        for (int i = 0; i < capped.size(); i++) {
            DagrPointVm pt = capped.get(i);
            double[] xy = lonLatToWebMercator(pt.lon(), pt.lat());
            double delta = 50.0;
            String bbox = String.format(Locale.US, "%.2f,%.2f,%.2f,%.2f",
                    xy[0] - delta, xy[1] - delta, xy[0] + delta, xy[1] + delta);
            Map<String, Object> resp = getFeatureInfo(Map.of(
                    "CRS", "EPSG:3857",
                    "BBOX", bbox,
                    "WIDTH", "101",
                    "HEIGHT", "101",
                    "I", "50",
                    "J", "50"
            ));
            JsonNode root = OBJECT_MAPPER.valueToTree(resp);
            JsonNode features = root.get("features");
            if (features != null && features.isArray()) {
                for (JsonNode f : features) {
                    JsonNode propsNode = f.path("properties");
                    Map<String, Object> props = propsNode.isObject()
                            ? OBJECT_MAPPER.convertValue(propsNode, new TypeReference<>() {})
                            : Map.of();
                    String name = propsNode.path("name").asText(propsNode.path("NAME").asText("WMS Drone Zone"));
                    String restriction = propsNode.path("restriction").asText(propsNode.path("TYPE").asText("ADVISORY"));
                    advisories.add(new DagrAdvisoryVm(i, pt.lat(), pt.lon(), name, restriction, props));
                }
            }
        }

        return new DagrCheckPointsResponseVm(
                true,
                capped.size(),
                advisories.size(),
                advisories,
                ZonedDateTime.now(ZoneOffset.UTC)
        );
    }

    public static double[] lonLatToWebMercator(double lon, double lat) {
        double x = lon * ORIGIN_SHIFT / 180.0;
        double clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
        double y = Math.log(Math.tan((90.0 + clampedLat) * Math.PI / 360.0)) / (Math.PI / 180.0);
        y = y * ORIGIN_SHIFT / 180.0;
        return new double[]{x, y};
    }
}
