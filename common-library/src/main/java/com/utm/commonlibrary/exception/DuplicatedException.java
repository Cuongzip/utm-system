package com.utm.commonlibrary.exception;

import java.util.Map;

public class DuplicatedException extends BaseBusinessException {

    public DuplicatedException(String errorCode, String paramKey, Object paramValue) {
        super(errorCode, paramKey, paramValue);
    }

    public DuplicatedException(String errorCode, Map<String, Object> params) {
        super(errorCode, params);
    }

    public DuplicatedException(String errorCode, Object... legacyArgs) {
        super(errorCode, legacyArgs);
    }
}
