package com.utm.commonlibrary.exception;

import java.util.Map;

public class NotFoundException extends BaseBusinessException {

    public NotFoundException(String errorCode, String paramKey, Object paramValue) {
        super(errorCode, paramKey, paramValue);
    }

    public NotFoundException(String errorCode, Map<String, Object> params) {
        super(errorCode, params);
    }

    public NotFoundException(String errorCode, Object... legacyArgs) {
        super(errorCode, legacyArgs);
    }
}
