package com.utm.commonlibrary.generator;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Objects;
import java.util.function.Predicate;

public final class BusinessCodeGenerator {

    private static final char[] ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ".toCharArray();
    private static final SecureRandom RANDOM = new SecureRandom();

    private BusinessCodeGenerator() {
    }

    public static String generate(CodePatternRule rule) {
        Objects.requireNonNull(rule, "CodePatternRule must not be null");
        StringBuilder builder = new StringBuilder();

        if (rule.prefix() != null && !rule.prefix().isBlank()) {
            builder.append(rule.prefix().trim().toUpperCase());
        }

        if (rule.datePattern() != null && !rule.datePattern().isBlank()) {
            String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern(rule.datePattern()));
            if (!builder.isEmpty() && rule.delimiter() != null) {
                builder.append(rule.delimiter());
            }
            builder.append(datePart);
        }

        int length = Math.max(1, rule.randomLength());
        String randomPart = generateRandomEntropy(length);

        if (!builder.isEmpty() && rule.delimiter() != null) {
            builder.append(rule.delimiter());
        }
        builder.append(randomPart);

        return builder.toString();
    }

    public static String generate(String prefix, int randomLength) {
        return generate(new CodePatternRule(prefix, null, randomLength, "-"));
    }

    public static String generate(String prefix, String datePattern, int randomLength) {
        return generate(new CodePatternRule(prefix, datePattern, randomLength, "-"));
    }

    public static String generateRandomEntropy(int length) {
        if (length <= 0) {
            length = 4;
        }
        char[] chars = new char[length];
        for (int i = 0; i < length; i++) {
            chars[i] = ALPHABET[RANDOM.nextInt(ALPHABET.length)];
        }
        return new String(chars);
    }

    public static String generateUnique(CodePatternRule rule, Predicate<String> existsChecker) {
        return generateUnique(rule, existsChecker, 5);
    }

    public static String generateUnique(CodePatternRule rule, Predicate<String> existsChecker, int maxRetries) {
        Objects.requireNonNull(existsChecker, "existsChecker must not be null");
        int retries = Math.max(1, maxRetries);
        for (int i = 0; i < retries; i++) {
            String candidate = generate(rule);
            if (!existsChecker.test(candidate)) {
                return candidate;
            }
        }
        throw new IllegalStateException("Failed to generate unique code for prefix: "
                + (rule != null ? rule.prefix() : "null") + " after " + retries + " attempts");
    }
}
