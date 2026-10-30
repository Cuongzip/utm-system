package com.utm.flight.config;

public final class FeasibilityConfig {

    private FeasibilityConfig() {
    }

    public static final double RESERVE_FRACTION = 0.20;
    public static final double GO_THRESHOLD_PCT = 15.0;
    public static final double CLIMB_SURCHARGE = 0.15;
    public static final double K_PAYLOAD = 0.50;
    public static final double K_WIND = 0.40;

    public static final double DEFAULT_HOVER_POWER_W = 250.0;
    public static final double DEFAULT_CRUISE_POWER_W = 200.0;
    public static final double DEFAULT_CRUISE_SPEED_MS = 12.0;
    public static final double DEFAULT_BATTERY_HEALTH_PCT = 100.0;
    public static final double DEFAULT_WIND_TOLERANCE_MS = 12.0;
    public static final double DEFAULT_MAX_PAYLOAD_KG = 5.0;
    public static final double DEFAULT_MAX_FLIGHT_TIME_MIN = 25.0;
    public static final double DEFAULT_HOVER_TIME_S = 60.0;
}
