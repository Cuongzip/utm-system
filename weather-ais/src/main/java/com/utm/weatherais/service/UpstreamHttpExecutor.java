package com.utm.weatherais.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import java.util.Optional;

@Component
@Slf4j
public class UpstreamHttpExecutor {

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    public Optional<String> getString(String url, Map<String, String> headers, int timeoutMs) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofMillis(Math.max(1000, timeoutMs)))
                    .header("Accept", "application/json")
                    .header("User-Agent", "UTM-WeatherAIS/1.0")
                    .GET();
            if (headers != null) {
                headers.forEach(builder::header);
            }
            HttpResponse<String> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return Optional.ofNullable(response.body());
            }
            log.warn("Upstream GET {} returned HTTP {}", url, response.statusCode());
            return Optional.empty();
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (Exception ex) {
            log.warn("Upstream GET {} failed: {}", url, ex.getMessage());
            return Optional.empty();
        }
    }

    public Optional<byte[]> getBytes(String url, Map<String, String> headers, int timeoutMs) {
        try {
            HttpRequest.Builder builder = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofMillis(Math.max(1000, timeoutMs)))
                    .header("User-Agent", "UTM-WeatherAIS/1.0")
                    .GET();
            if (headers != null) {
                headers.forEach(builder::header);
            }
            HttpResponse<byte[]> response = httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 200 && response.statusCode() < 300 && response.body() != null && response.body().length > 0) {
                return Optional.of(response.body());
            }
            return Optional.empty();
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (Exception ex) {
            log.warn("Upstream binary GET {} failed: {}", url, ex.getMessage());
            return Optional.empty();
        }
    }

    public Optional<String> postFormUrlEncoded(String url, String formBody, int timeoutMs) {
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofMillis(Math.max(1000, timeoutMs)))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(formBody))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 200 && response.statusCode() < 300) {
                return Optional.ofNullable(response.body());
            }
            log.warn("Upstream POST {} returned HTTP {}", url, response.statusCode());
            return Optional.empty();
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return Optional.empty();
        } catch (Exception ex) {
            log.warn("Upstream POST {} failed: {}", url, ex.getMessage());
            return Optional.empty();
        }
    }
}
