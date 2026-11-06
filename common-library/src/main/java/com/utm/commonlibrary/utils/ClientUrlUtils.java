package com.utm.commonlibrary.utils;

public final class ClientUrlUtils {

    private ClientUrlUtils() {
    }

    /**
     * Normalizes a microservice base URL by applying a fallback default,
     * trimming trailing slashes, and ensuring the context-path is appended exactly once.
     *
     * @param configuredUrl the URL injected from configuration properties (may be null/blank)
     * @param defaultUrl    the fallback Docker service URL (e.g. "http://hub:8084")
     * @param contextPath   the service context path (e.g. "hub" or "/hub")
     * @return the normalized base URL (e.g. "http://hub:8084/hub")
     */
    public static String normalizeBaseUrl(String configuredUrl, String defaultUrl, String contextPath) {
        String url = (configuredUrl == null || configuredUrl.isBlank()) ? defaultUrl : configuredUrl;
        if (url == null || url.isBlank()) {
            return "";
        }
        String cleanUrl = url.replaceAll("/+$", "");
        String ctx = (contextPath != null && contextPath.startsWith("/")) ? contextPath : "/" + contextPath;
        return cleanUrl.endsWith(ctx) ? cleanUrl : cleanUrl + ctx;
    }
}

