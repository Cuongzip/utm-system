package com.utm.simulation.model.enumeration;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum EmergencyScenarioType {
    GPS_FAILURE("gps_failure", "Mất tín hiệu GPS", "Mất tín hiệu định vị GPS đột ngột, tọa độ bị sai lệch hoặc mất tín hiệu hoàn toàn.", "HIGH"),
    BATTERY_DRAIN("battery_drain", "Tụt pin khẩn cấp", "Mức pin sụt giảm nhanh chóng do lỗi cell hoặc quá tải nhiệt.", "CRITICAL"),
    C2_LOST("c2_lost", "Mất liên lạc C2", "Mất liên lạc Command & Control giữa drone và trạm mặt đất GCS.", "HIGH"),
    MOTOR_FAILURE("motor_failure", "Hỏng động cơ", "Hỏng hóc động cơ/cánh quạt khiến drone mất kiểm soát lực nâng và độ cao.", "CRITICAL"),
    GEOFENCE_BREACH("geofence_breach", "Vi phạm không phận", "Drone bay lệch khỏi hành lang an toàn và xâm nhập vùng cấm bay Geofence.", "HIGH");

    private final String value;
    private final String displayName;
    private final String description;
    private final String defaultSeverity;

    EmergencyScenarioType(String value, String displayName, String description, String defaultSeverity) {
        this.value = value;
        this.displayName = displayName;
        this.description = description;
        this.defaultSeverity = defaultSeverity;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getDescription() {
        return description;
    }

    public String getDefaultSeverity() {
        return defaultSeverity;
    }

    @JsonCreator
    public static EmergencyScenarioType fromValue(String value) {
        if (value == null) {
            return null;
        }
        for (EmergencyScenarioType type : values()) {
            if (type.value.equalsIgnoreCase(value) || type.name().equalsIgnoreCase(value)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Unknown EmergencyScenarioType: " + value);
    }
}
