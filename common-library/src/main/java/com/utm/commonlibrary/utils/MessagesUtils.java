package com.utm.commonlibrary.utils;

import java.util.Locale;
import java.util.MissingResourceException;
import java.util.ResourceBundle;
import org.slf4j.helpers.FormattingTuple;
import org.slf4j.helpers.MessageFormatter;

public class MessagesUtils {
    private static final String BUNDLE_NAME = "messages.messages";

    private MessagesUtils() {
        // Private constructor
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

    public static String getMessage(String errorCode, Object... var2) {
        String message;
        try {
            ResourceBundle bundle = getResourceBundle();
            message = bundle.getString(errorCode);
        } catch (MissingResourceException ex) {
            // case message_code is not defined.
            message = errorCode;
        }
        FormattingTuple formattingTuple = MessageFormatter.arrayFormat(message, var2);
        return formattingTuple.getMessage();
    }
}
