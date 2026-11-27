package com.utm.commonlibrary.utils;

import org.springframework.context.i18n.LocaleContext;
import org.springframework.context.i18n.LocaleContextHolder;

import java.util.Locale;
import java.util.function.Supplier;

public final class LocaleUtils {

    private LocaleUtils() {
    }

    public static Locale currentLocale() {
        LocaleContext localeContext = LocaleContextHolder.getLocaleContext();
        if (localeContext != null) {
            Locale locale = localeContext.getLocale();
            if (locale != null) {
                return locale;
            }
        }
        return Locale.ENGLISH;
    }

    public static boolean isVietnamese() {
        return "vi".equalsIgnoreCase(currentLocale().getLanguage());
    }

    public static String currentLanguageTag() {
        return isVietnamese() ? "vi" : "en";
    }

    public static <T> Supplier<T> withLocale(Locale locale, Supplier<T> delegate) {
        Locale effectiveLocale = locale != null ? locale : Locale.ENGLISH;
        return () -> {
            LocaleContext previous = LocaleContextHolder.getLocaleContext();
            try {
                LocaleContextHolder.setLocale(effectiveLocale);
                return delegate.get();
            } finally {
                if (previous == null) {
                    LocaleContextHolder.resetLocaleContext();
                } else {
                    LocaleContextHolder.setLocaleContext(previous);
                }
            }
        };
    }
}
