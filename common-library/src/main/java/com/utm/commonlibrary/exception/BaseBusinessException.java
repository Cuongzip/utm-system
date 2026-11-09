package com.utm.commonlibrary.exception;

import com.utm.commonlibrary.utils.MessagesUtils;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

public abstract class BaseBusinessException extends RuntimeException {

    private final String errorCode;
    private final Map<String, Object> params;

    protected BaseBusinessException(String errorCode, Map<String, Object> params) {
        super(MessagesUtils.getCleanMessage(errorCode));
        this.errorCode = errorCode;
        this.params = (params != null) ? Collections.unmodifiableMap(new LinkedHashMap<>(params))
                : Collections.emptyMap();
    }

    protected BaseBusinessException(String errorCode, String paramKey, Object paramValue) {
        this(errorCode,
                (paramKey != null && paramValue != null) ? Map.of(paramKey, paramValue) : Collections.emptyMap());
    }

    protected BaseBusinessException(String errorCode, Object... legacyArgs) {
        super(MessagesUtils.getCleanMessage(errorCode));
        this.errorCode = errorCode;
        this.params = LegacyParamResolver.resolve(errorCode, legacyArgs);
    }

    protected BaseBusinessException(String messageOrErrorCode, boolean isRaw) {
        super(isRaw ? messageOrErrorCode : MessagesUtils.getCleanMessage(messageOrErrorCode));
        this.errorCode = isRaw ? null : messageOrErrorCode;
        this.params = Collections.emptyMap();
    }

    public String getErrorCode() {
        return errorCode;
    }

    public Map<String, Object> getParams() {
        return params;
    }
}
