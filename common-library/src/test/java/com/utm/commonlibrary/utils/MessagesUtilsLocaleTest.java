package com.utm.commonlibrary.utils;

import com.utm.commonlibrary.constants.MessageCode;
import com.utm.commonlibrary.exception.NotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.i18n.LocaleContextHolder;

import java.lang.reflect.Modifier;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Unit Tests: MessagesUtils & LocaleUtils Localization")
class MessagesUtilsLocaleTest {

    @BeforeEach
    void setUp() {
        LocaleContextHolder.resetLocaleContext();
    }

    @AfterEach
    void tearDown() {
        LocaleContextHolder.resetLocaleContext();
    }

    @Test
    @DisplayName("Should return deterministic English messages when LocaleContext is unset or English")
    void getCleanMessage_englishOrDefaultLocale_returnsEnglishMessages() {
        assertThat(LocaleUtils.isVietnamese()).isFalse();
        assertThat(LocaleUtils.currentLanguageTag()).isEqualTo("en");
        assertThat(MessagesUtils.getCleanMessage(MessageCode.HUB_NOT_FOUND))
                .isEqualTo("Hub / Vertiport is not found");

        LocaleContextHolder.setLocale(Locale.ENGLISH);
        assertThat(LocaleUtils.isVietnamese()).isFalse();
        assertThat(MessagesUtils.getCleanMessage(MessageCode.FLIGHT_REJECTED))
                .isEqualTo("Flight was rejected by ATC");
        assertThat(MessagesUtils.getCleanMessage(MessageCode.API_KEY_INVALID_OR_REVOKED))
                .isEqualTo("Invalid, expired, or revoked X-API-Key");
    }

    @Test
    @DisplayName("Should return UTF-8 Vietnamese messages when LocaleContext is vi or vi-VN")
    void getCleanMessage_vietnameseLocale_returnsUtf8VietnameseMessages() {
        LocaleContextHolder.setLocale(Locale.forLanguageTag("vi"));

        assertThat(LocaleUtils.isVietnamese()).isTrue();
        assertThat(LocaleUtils.currentLanguageTag()).isEqualTo("vi");
        assertThat(MessagesUtils.getCleanMessage(MessageCode.HUB_NOT_FOUND))
                .isEqualTo("Kh\u00f4ng t\u00ecm th\u1ea5y Hub / Vertiport");
        assertThat(MessagesUtils.getCleanMessage(MessageCode.FLIGHT_REJECTED))
                .isEqualTo("Chuy\u1ebfn bay \u0111\u00e3 b\u1ecb ATC t\u1eeb ch\u1ed1i c\u1ea5p ph\u00e9p");
        assertThat(MessagesUtils.getCleanMessage(MessageCode.API_KEY_INVALID_OR_REVOKED))
                .isEqualTo("X-API-Key kh\u00f4ng h\u1ee3p l\u1ec7, \u0111\u00e3 h\u1ebft h\u1ea1n ho\u1eb7c \u0111\u00e3 b\u1ecb thu h\u1ed3i");

        LocaleContextHolder.setLocale(Locale.of("vi", "VN"));
        NotFoundException ex = new NotFoundException(MessageCode.DRONE_NOT_FOUND, "id", "drn-01");
        assertThat(ex.getMessage()).isEqualTo("Kh\u00f4ng t\u00ecm th\u1ea5y Drone");
    }

    @Test
    @DisplayName("Should propagate and restore LocaleContext across async CompletableFuture threads")
    void withLocale_completableFuture_propagatesAndRestoresLocaleContext() {
        Locale viLocale = Locale.forLanguageTag("vi");

        String asyncMessage = CompletableFuture.supplyAsync(
                LocaleUtils.withLocale(viLocale, () -> MessagesUtils.getCleanMessage(MessageCode.HUB_NOT_FOUND))
        ).join();

        assertThat(asyncMessage).isEqualTo("Kh\u00f4ng t\u00ecm th\u1ea5y Hub / Vertiport");
        assertThat(LocaleUtils.isVietnamese()).isFalse();
        assertThat(MessagesUtils.getCleanMessage(MessageCode.HUB_NOT_FOUND))
                .isEqualTo("Hub / Vertiport is not found");
    }

    @Test
    @DisplayName("Should resolve every MessageCode constant to a translated Vietnamese message")
    void getCleanMessage_allMessageCodes_haveVietnameseTranslation() {
        List<String> codes = Arrays.stream(MessageCode.class.getDeclaredFields())
                .filter(f -> Modifier.isPublic(f.getModifiers())
                        && Modifier.isStatic(f.getModifiers())
                        && f.getType() == String.class)
                .map(f -> {
                    try {
                        return (String) f.get(null);
                    } catch (IllegalAccessException ex) {
                        throw new IllegalStateException(ex);
                    }
                })
                .toList();

        LocaleContextHolder.setLocale(Locale.forLanguageTag("vi"));
        assertThat(codes).isNotEmpty().allSatisfy(code ->
                assertThat(MessagesUtils.getCleanMessage(code))
                        .as("Vietnamese translation for %s", code)
                        .isNotBlank()
                        .isNotEqualTo(code));
    }
}
