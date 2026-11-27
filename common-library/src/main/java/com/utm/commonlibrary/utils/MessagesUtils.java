package com.utm.commonlibrary.utils;

import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.URL;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.MissingResourceException;
import java.util.PropertyResourceBundle;
import java.util.ResourceBundle;

public class MessagesUtils {
    private static final String BUNDLE_NAME = "messages.messages";
    private static final Locale VI_LOCALE = Locale.forLanguageTag("vi");

    private static final ResourceBundle.Control UTF8_NO_FALLBACK_CONTROL = new ResourceBundle.Control() {
        @Override
        public List<String> getFormats(String baseName) {
            return FORMAT_PROPERTIES;
        }

        @Override
        public Locale getFallbackLocale(String baseName, Locale locale) {
            return null;
        }

        @Override
        public ResourceBundle newBundle(
                String baseName, Locale locale, String format, ClassLoader loader, boolean reload)
                throws IOException {
            String bundleName = toBundleName(baseName, locale);
            String resourceName = toResourceName(bundleName, "properties");
            URL url = loader.getResource(resourceName);
            if (url == null) {
                return null;
            }
            URLConnection connection = url.openConnection();
            if (reload) {
                connection.setUseCaches(false);
            }
            try (InputStream stream = connection.getInputStream();
                 InputStreamReader reader = new InputStreamReader(stream, StandardCharsets.UTF_8)) {
                return new PropertyResourceBundle(reader);
            }
        }
    };

    private MessagesUtils() {
    }

    private static ResourceBundle getResourceBundle() {
        ClassLoader classLoader = Thread.currentThread().getContextClassLoader();
        if (classLoader == null) {
            classLoader = MessagesUtils.class.getClassLoader();
        }
        Locale targetLocale = LocaleUtils.isVietnamese() ? VI_LOCALE : Locale.ROOT;
        try {
            return ResourceBundle.getBundle(BUNDLE_NAME, targetLocale, classLoader, UTF8_NO_FALLBACK_CONTROL);
        } catch (MissingResourceException e) {
            return ResourceBundle.getBundle(BUNDLE_NAME, Locale.ROOT, classLoader, UTF8_NO_FALLBACK_CONTROL);
        }
    }

    public static String getCleanMessage(String errorCode) {
        if (errorCode == null || errorCode.isBlank()) {
            return LocaleUtils.isVietnamese()
                    ? "Đã xảy ra lỗi không mong muốn"
                    : "An unexpected error occurred";
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
