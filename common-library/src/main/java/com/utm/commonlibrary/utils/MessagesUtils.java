package com.utm.commonlibrary.utils;

import java.util.Locale;
import java.util.MissingResourceException;
import java.util.ResourceBundle;

public class MessagesUtils {
    private static final String BUNDLE_NAME = "messages.messages";

    private MessagesUtils() {
    }

    private static ResourceBundle getResourceBundle() {
        ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
        if (classLoader == null) {
            classLoader = MessagesUtils.class.getClassLoader();
        }
        try {
            return ResourceBundle.getBundle(BUNDLE_NAME, Locale.getDefault(), classLoader);
        } catch (MissingResourceException e) {
            return ResourceBundle.getBundle(BUNDLE_NAME, Locale.ROOT, classLoader);
        }
    }

    public static String getCleanMessage(String errorCode) {
        if (errorCode == null || errorCode.isBlank()) {
            return "An unexpected error occurred";
        }
        try {
            ResourceBundle bundle = getResourceBundle();
            if (bundle.containsKey(errorCode)) {
                return bundle.getString(errorCode).replace("{}", "").replaceAll("\\s+", " ").trim();
            }
        } catch (MissingResourceException ignored) {
        }
        return errorCode;
    }

    public static String getMessage(String errorCode, Object... var2) {
        return getCleanMessage(errorCode);
    }
}
