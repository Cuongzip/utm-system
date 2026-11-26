package com.utm.weatherais.service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

public class SingleFlightTtlCache<T> {

    private record CacheEntry<T>(T value, Instant expiresAt) {
        boolean isFresh() {
            return Instant.now().isBefore(expiresAt);
        }
    }

    private final long ttlMillis;
    private final Map<String, CacheEntry<T>> store = new ConcurrentHashMap<>();
    private final Map<String, CompletableFuture<T>> inFlight = new ConcurrentHashMap<>();

    public SingleFlightTtlCache(long ttlMillis) {
        this.ttlMillis = Math.max(250L, ttlMillis);
    }

    public T getOrLoad(String key, Supplier<T> loader, Supplier<T> fallbackSupplier) {
        CacheEntry<T> existing = store.get(key);
        if (existing != null && existing.isFresh()) {
            return existing.value();
        }

        CompletableFuture<T> ownFuture = new CompletableFuture<>();
        CompletableFuture<T> running = inFlight.putIfAbsent(key, ownFuture);
        if (running != null) {
            return running.join();
        }

        try {
            T loaded = loader.get();
            store.put(key, new CacheEntry<>(loaded, Instant.now().plusMillis(ttlMillis)));
            ownFuture.complete(loaded);
            return loaded;
        } catch (Exception ex) {
            T fallback = existing != null ? existing.value() : fallbackSupplier.get();
            ownFuture.complete(fallback);
            return fallback;
        } finally {
            inFlight.remove(key, ownFuture);
        }
    }
}
