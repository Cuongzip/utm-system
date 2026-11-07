package com.utm.commonlibrary.generator;

public record CodePatternRule(
        String prefix,
        String datePattern,
        int randomLength,
        String delimiter
) {
    public static final CodePatternRule FLIGHT_NUMBER =
            new CodePatternRule("FLT", "yyyyMMdd", 4, "-");

    public static final CodePatternRule HUB_CODE =
            new CodePatternRule("HUB", null, 4, "-");

    public static final CodePatternRule MISSION_CODE =
            new CodePatternRule("MSN", "yyMMdd", 4, "-");

    public static final CodePatternRule EMERGENCY_INCIDENT =
            new CodePatternRule("INC", "yyyyMMdd", 4, "-");

    public static final CodePatternRule DRONE_REGISTRATION =
            new CodePatternRule("DRN", "yyyy", 4, "-");

    public static final CodePatternRule ORGANIZATION_REGISTRATION =
            new CodePatternRule("ORG", "yyyy", 4, "-");

    public static final CodePatternRule DEVICE_IDENTIFIER =
            new CodePatternRule("DEV", null, 8, "-");

    public static final CodePatternRule AIRSPACE_ZONE =
            new CodePatternRule("ASZ", null, 4, "-");

    public CodePatternRule withPrefix(String newPrefix) {
        return new CodePatternRule(newPrefix, this.datePattern, this.randomLength, this.delimiter);
    }
}

