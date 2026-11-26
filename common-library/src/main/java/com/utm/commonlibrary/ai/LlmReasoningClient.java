package com.utm.commonlibrary.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
@Slf4j
public class LlmReasoningClient {

    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final HttpClient httpClient;
    private final String apiKey;
    private final String baseUrl;
    private final String defaultModel;
    private final int timeoutMs;

    public LlmReasoningClient(
            @Value("${utm.ai.api-key:${UTM_AI_API_KEY:${ANTHROPIC_API_KEY:}}}") String apiKey,
            @Value("${utm.ai.base-url:https://api.anthropic.com}") String baseUrl,
            @Value("${utm.ai.model:claude-haiku-4-5-20251001}") String defaultModel,
            @Value("${utm.ai.timeout-ms:10000}") int timeoutMs) {
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.baseUrl = baseUrl != null && baseUrl.endsWith("/")
                ? baseUrl.substring(0, baseUrl.length() - 1)
                : (baseUrl != null ? baseUrl : "https://api.anthropic.com");
        this.defaultModel = defaultModel;
        this.timeoutMs = Math.max(1000, timeoutMs);
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofMillis(Math.min(5000, this.timeoutMs)))
                .build();
    }

    public boolean isEnabled() {
        return !apiKey.isBlank();
    }

    public String getDefaultModel() {
        return defaultModel;
    }

    public Optional<String> generateText(String systemPrompt, String userPrompt, int maxTokens) {
        if (!isEnabled()) {
            return Optional.empty();
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", defaultModel);
        payload.put("max_tokens", Math.max(64, maxTokens));
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            payload.put("system", systemPrompt);
        }
        payload.put("messages", List.of(Map.of("role", "user", "content", userPrompt)));

        return sendRawRequest(payload).flatMap(this::extractFirstTextBlock);
    }

    public <T> Optional<T> generateStructuredJson(
            String systemPrompt,
            String userPrompt,
            Class<T> responseType,
            int maxTokens) {
        return generateText(systemPrompt, userPrompt, maxTokens).flatMap(raw -> {
            try {
                String cleaned = extractJsonObject(raw);
                return Optional.of(OBJECT_MAPPER.readValue(cleaned, responseType));
            } catch (Exception ex) {
                log.warn("Failed to parse LLM JSON output for {}: {}", responseType.getSimpleName(), ex.getMessage());
                return Optional.empty();
            }
        });
    }

    public Optional<JsonNode> sendMessagesWithTools(
            String systemPrompt,
            List<Map<String, Object>> messages,
            List<Map<String, Object>> tools,
            int maxTokens) {
        if (!isEnabled()) {
            return Optional.empty();
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("model", defaultModel);
        payload.put("max_tokens", Math.max(128, maxTokens));
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            payload.put("system", systemPrompt);
        }
        payload.put("messages", messages);
        if (tools != null && !tools.isEmpty()) {
            payload.put("tools", tools);
        }
        return sendRawRequest(payload);
    }

    private Optional<JsonNode> sendRawRequest(Map<String, Object> payload) {
        try {
            String requestJson = OBJECT_MAPPER.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/v1/messages"))
                    .timeout(Duration.ofMillis(timeoutMs))
                    .header("Content-Type", "application/json")
                    .header("x-api-key", apiKey)
                    .header("anthropic-version", ANTHROPIC_VERSION)
                    .POST(HttpRequest.BodyPublishers.ofString(requestJson))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                log.warn("Anthropic API returned HTTP {} during reasoning call", response.statusCode());
                return Optional.empty();
            }
            return Optional.of(OBJECT_MAPPER.readTree(response.body()));
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            log.warn("LLM reasoning call interrupted");
            return Optional.empty();
        } catch (Exception ex) {
            log.warn("LLM reasoning call failed, falling back to deterministic logic: {}", ex.getMessage());
            return Optional.empty();
        }
    }

    private Optional<String> extractFirstTextBlock(JsonNode root) {
        JsonNode content = root.get("content");
        if (content != null && content.isArray()) {
            StringBuilder sb = new StringBuilder();
            for (JsonNode block : content) {
                if ("text".equals(block.path("type").asText()) && block.hasNonNull("text")) {
                    if (!sb.isEmpty()) {
                        sb.append('\n');
                    }
                    sb.append(block.get("text").asText());
                }
            }
            if (!sb.isEmpty()) {
                return Optional.of(sb.toString().trim());
            }
        }
        return Optional.empty();
    }

    private String extractJsonObject(String raw) {
        String trimmed = raw.trim();
        int firstBrace = trimmed.indexOf('{');
        int lastBrace = trimmed.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            return trimmed.substring(firstBrace, lastBrace + 1);
        }
        return trimmed;
    }
}
