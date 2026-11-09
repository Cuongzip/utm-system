package com.utm.commonlibrary.viewmodel.error;

import java.util.Collections;
import java.util.List;
import java.util.Map;

public record ErrorVm(
        String statusCode,
        String errorCode,
        String title,
        String detail,
        Map<String, Object> params,
        List<String> fieldErrors) {
    public ErrorVm {
        params = (params != null) ? Collections.unmodifiableMap(params) : Collections.emptyMap();
        fieldErrors = (fieldErrors != null) ? Collections.unmodifiableList(fieldErrors) : Collections.emptyList();
    }

    public ErrorVm(String statusCode, String title, String detail) {
        this(statusCode, null, title, detail, Collections.emptyMap(), Collections.emptyList());
    }

    public ErrorVm(String statusCode, String title, String detail, List<String> fieldErrors) {
        this(statusCode, null, title, detail, Collections.emptyMap(), fieldErrors);
    }

    public ErrorVm(String statusCode, String errorCode, String title, String detail, Map<String, Object> params) {
        this(statusCode, errorCode, title, detail, params, Collections.emptyList());
    }
}
