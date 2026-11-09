package com.utm.commonlibrary.exception;

import java.util.Map;

public class BadRequestException extends BaseBusinessException {

    public BadRequestException(String messageOrErrorCode) {
        super(messageOrErrorCode, !isErrorCode(messageOrErrorCode));
    }

    public BadRequestException(String errorCode, String paramKey, Object paramValue) {
        super(errorCode, paramKey, paramValue);
    }

    public BadRequestException(String errorCode, Map<String, Object> params) {
        super(errorCode, params);
    }

    public BadRequestException(String errorCode, Object... legacyArgs) {
        super(errorCode, legacyArgs);
    }

    private static boolean isErrorCode(String key) {
        if (key == null || key.isBlank()) {
            return false;
        }
        return key.matches("^[A-Z0-9_]+$");
    }
}
