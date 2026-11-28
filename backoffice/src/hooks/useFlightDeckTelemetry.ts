"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { telemetryService } from "@/services";
import { useStomp, useTelemetryStream } from "./useStomp";
import { isTelemetryFresh } from "./useLiveTelemetry";
import { QUERY_KEYS } from "./useQueries";
import { ACTIVE_FLIGHT_STATUSES, FLIGHT_STATUS, type Flight, type TelemetryRecord } from "@/types";

type FlightDeckStreamMode = "live" | "replay";
export type PlaybackSpeed = 0.5 | 1 | 2 | 4 | 8;

const MAX_LIVE_FRAMES = 800;

interface SortedTelemetryBucket {
    records: TelemetryRecord[];
    timestamps: number[];
    keys: string[];
}

const EMPTY_BUCKET: SortedTelemetryBucket = {
    records: [],
    timestamps: [],
    keys: [],
};

export function getRecordTimestampMs(rec: TelemetryRecord): number {
    if (!rec.timestamp) return 0;
    const parsed = Date.parse(rec.timestamp);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function getRecordDedupKey(rec: TelemetryRecord): string {
    if (rec.id) return `id:${rec.id}`;
    return `ts:${rec.timestamp ?? ""}_${rec.latitude ?? ""}_${rec.longitude ?? ""}_${rec.altitude ?? ""}`;
}

function findInsertIndex(timestamps: number[], ts: number): number {
    let lo = 0;
    let hi = timestamps.length;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (timestamps[mid] <= ts) {
            lo = mid + 1;
        } else {
            hi = mid;
        }
    }
    return lo;
}

export function useFlightDeckTelemetry(flight: Flight | null, enabled = true) {
    const flightId = flight?.id ?? "";
    const isAirborne = Boolean(flight?.status && ACTIVE_FLIGHT_STATUSES.includes(flight.status));
    const isTerminal = Boolean(
        flight?.status &&
        (flight.status === FLIGHT_STATUS.COMPLETED ||
            flight.status === FLIGHT_STATUS.EMERGENCY_LANDING ||
            flight.status === FLIGHT_STATUS.CANCELLED)
    );
    const { isConnected: isSocketConnected } = useStomp({
        service: "telemetry",
        autoConnect: enabled && isAirborne,
    });

    const [liveBucket, setLiveBucket] = useState<SortedTelemetryBucket>(EMPTY_BUCKET);
    const [prevFlightId, setPrevFlightId] = useState(flightId);
    const [manualReplay, setManualReplay] = useState(false);
    const [cursorIndex, setCursorIndex] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState<PlaybackSpeed>(1);
    const pollingRef = useRef(false);
    const liveKeySetRef = useRef<Set<string>>(new Set());

    if (flightId !== prevFlightId) {
        setPrevFlightId(flightId);
        setLiveBucket(EMPTY_BUCKET);
        setManualReplay(false);
        setCursorIndex(null);
        setIsPlaying(false);
    }

    useEffect(() => {
        liveKeySetRef.current = new Set();
    }, [flightId]);

    const historyQuery = useQuery({
        queryKey: QUERY_KEYS.flightTelemetryHistory(flightId),
        queryFn: () => telemetryService.getHistoryByFlightId(flightId),
        enabled: Boolean(flightId) && enabled,
        staleTime: isAirborne ? 4000 : 60_000,
    });

    const historyBucket = useMemo<SortedTelemetryBucket>(() => {
        const raw = historyQuery.data;
        if (!raw || raw.length === 0) return EMPTY_BUCKET;
        const entries: Array<{ key: string; ts: number; record: TelemetryRecord }> = [];
        const seen = new Set<string>();
        for (const item of raw) {
            if (!item || item.latitude == null || item.longitude == null) continue;
            const key = getRecordDedupKey(item);
            if (seen.has(key)) continue;
            seen.add(key);
            entries.push({ key, ts: getRecordTimestampMs(item), record: item });
        }
        entries.sort((a, b) => a.ts - b.ts);
        return {
            records: entries.map((e) => e.record),
            timestamps: entries.map((e) => e.ts),
            keys: entries.map((e) => e.key),
        };
    }, [historyQuery.data]);

    // Incrementally insert live STOMP/poll samples in O(1) when chronological (99.9% of packets)
    // and O(log N) binary insert otherwise — avoids per-packet Date.parse() sorting.
    const appendRecords = useCallback((records: TelemetryRecord[]) => {
        if (records.length === 0) return;
        const seen = liveKeySetRef.current;

        const incoming: Array<{ key: string; ts: number; record: TelemetryRecord }> = [];
        for (const rec of records) {
            if (!rec || rec.latitude == null || rec.longitude == null) continue;
            const key = getRecordDedupKey(rec);
            if (seen.has(key)) continue;
            seen.add(key);
            incoming.push({ key, ts: getRecordTimestampMs(rec), record: rec });
        }
        if (incoming.length === 0) return;

        setLiveBucket((prev) => {
            const nextRecords = prev.records.slice();
            const nextTimestamps = prev.timestamps.slice();
            const nextKeys = prev.keys.slice();

            for (const item of incoming) {
                const len = nextTimestamps.length;
                if (len === 0 || item.ts >= nextTimestamps[len - 1]) {
                    nextRecords.push(item.record);
                    nextTimestamps.push(item.ts);
                    nextKeys.push(item.key);
                } else {
                    const idx = findInsertIndex(nextTimestamps, item.ts);
                    nextRecords.splice(idx, 0, item.record);
                    nextTimestamps.splice(idx, 0, item.ts);
                    nextKeys.splice(idx, 0, item.key);
                }
            }

            if (nextRecords.length > MAX_LIVE_FRAMES) {
                const trim = nextRecords.length - MAX_LIVE_FRAMES;
                for (let i = 0; i < trim; i++) {
                    seen.delete(nextKeys[i]);
                }
                return {
                    records: nextRecords.slice(trim),
                    timestamps: nextTimestamps.slice(trim),
                    keys: nextKeys.slice(trim),
                };
            }

            return {
                records: nextRecords,
                timestamps: nextTimestamps,
                keys: nextKeys,
            };
        });
    }, []);

    const appendSingleRecord = useCallback(
        (record: TelemetryRecord | null) => {
            if (!record) return;
            appendRecords([record]);
        },
        [appendRecords]
    );

    useTelemetryStream(
        appendSingleRecord,
        flightId || null,
        Boolean(flightId) && enabled && isAirborne
    );

    useEffect(() => {
        if (!flightId || !enabled || !isAirborne) return;
        let alive = true;

        const pollOnce = async () => {
            if (pollingRef.current) return;
            pollingRef.current = true;
            try {
                const items = await telemetryService.getHistoryByFlightId(flightId);
                if (alive && items.length > 0) {
                    appendRecords(items.slice(-5));
                }
            } catch {
                // ignore transient network poll errors; STOMP or next poll recovers
            } finally {
                pollingRef.current = false;
            }
        };

        pollOnce();
        const intervalMs = isSocketConnected ? 6000 : 1500;
        const timer = setInterval(pollOnce, intervalMs);
        return () => {
            alive = false;
            clearInterval(timer);
        };
    }, [flightId, enabled, isAirborne, isSocketConnected, appendRecords]);

    // Linear two-pointer merge of pre-sorted history + live buckets (zero Date.parse / sort).
    const timeline = useMemo<TelemetryRecord[]>(() => {
        const hLen = historyBucket.records.length;
        const lLen = liveBucket.records.length;
        if (hLen === 0) return liveBucket.records;
        if (lLen === 0) return historyBucket.records;

        if (liveBucket.timestamps[0] > historyBucket.timestamps[hLen - 1]) {
            const combined = new Array<TelemetryRecord>(hLen + lLen);
            for (let i = 0; i < hLen; i++) combined[i] = historyBucket.records[i];
            for (let j = 0; j < lLen; j++) combined[hLen + j] = liveBucket.records[j];
            return combined;
        }

        const merged: TelemetryRecord[] = [];
        const seen = new Set<string>();
        let i = 0;
        let j = 0;

        while (i < hLen && j < lLen) {
            if (historyBucket.timestamps[i] <= liveBucket.timestamps[j]) {
                const k = historyBucket.keys[i];
                if (!seen.has(k)) {
                    seen.add(k);
                    merged.push(historyBucket.records[i]);
                }
                i++;
            } else {
                const k = liveBucket.keys[j];
                if (!seen.has(k)) {
                    seen.add(k);
                    merged.push(liveBucket.records[j]);
                }
                j++;
            }
        }
        while (i < hLen) {
            const k = historyBucket.keys[i];
            if (!seen.has(k)) {
                seen.add(k);
                merged.push(historyBucket.records[i]);
            }
            i++;
        }
        while (j < lLen) {
            const k = liveBucket.keys[j];
            if (!seen.has(k)) {
                seen.add(k);
                merged.push(liveBucket.records[j]);
            }
            j++;
        }
        return merged;
    }, [historyBucket, liveBucket]);

    const mode: FlightDeckStreamMode = isTerminal || manualReplay ? "replay" : "live";
    const lastIdx = Math.max(0, timeline.length - 1);
    const effectiveIndex =
        mode === "live" || cursorIndex == null
            ? lastIdx
            : Math.min(lastIdx, Math.max(0, cursorIndex));

    useEffect(() => {
        if (!isPlaying || timeline.length <= 1) return;
        const stepMs = Math.max(80, Math.round(640 / playbackRate));
        const timer = setInterval(() => {
            setCursorIndex((prev) => {
                const cur = prev ?? effectiveIndex;
                if (cur >= timeline.length - 1) {
                    setIsPlaying(false);
                    return timeline.length - 1;
                }
                return cur + 1;
            });
        }, stepMs);
        return () => clearInterval(timer);
    }, [isPlaying, playbackRate, timeline.length, effectiveIndex]);

    const activeRecord: TelemetryRecord | null =
        timeline.length > 0 ? (timeline[effectiveIndex] ?? null) : null;

    const visibleTrail = useMemo(() => {
        if (timeline.length === 0) return [];
        return mode === "live" ? timeline : timeline.slice(0, effectiveIndex + 1);
    }, [timeline, mode, effectiveIndex]);

    const seekTo = useCallback(
        (index: number) => {
            const clamped = Math.min(Math.max(0, index), Math.max(0, timeline.length - 1));
            setManualReplay(true);
            setIsPlaying(false);
            setCursorIndex(clamped);
        },
        [timeline.length]
    );

    const stepFrame = useCallback(
        (delta: number) => {
            if (timeline.length === 0) return;
            setManualReplay(true);
            setIsPlaying(false);
            setCursorIndex((prev) => {
                const base = prev ?? effectiveIndex;
                return Math.min(Math.max(0, base + delta), timeline.length - 1);
            });
        },
        [timeline.length, effectiveIndex]
    );

    const seekToTimestamp = useCallback(
        (targetIsoOrMs?: string | number | null) => {
            if (targetIsoOrMs == null || timeline.length === 0) return;
            const targetMs =
                typeof targetIsoOrMs === "number" ? targetIsoOrMs : Date.parse(targetIsoOrMs);
            if (Number.isNaN(targetMs)) return;

            let bestIdx = 0;
            let bestDiff = Number.POSITIVE_INFINITY;
            for (let i = 0; i < timeline.length; i++) {
                const diff = Math.abs(getRecordTimestampMs(timeline[i]) - targetMs);
                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestIdx = i;
                }
            }
            seekTo(bestIdx);
        },
        [timeline, seekTo]
    );

    const togglePlay = useCallback(() => {
        if (timeline.length <= 1) return;
        setManualReplay(true);
        setIsPlaying((prev) => {
            if (!prev) {
                setCursorIndex((cur) => {
                    const resolved = cur ?? effectiveIndex;
                    return resolved >= lastIdx ? 0 : resolved;
                });
            }
            return !prev;
        });
    }, [timeline.length, effectiveIndex, lastIdx]);

    const returnToLive = useCallback(() => {
        setIsPlaying(false);
        setManualReplay(false);
        setCursorIndex(null);
    }, []);

    const isFresh = mode === "live" && isAirborne && isTelemetryFresh(activeRecord);

    return {
        timeline,
        visibleTrail,
        activeRecord,
        isFresh,
        isSocketConnected,
        isLoadingHistory: historyQuery.isLoading,
        refetchHistory: historyQuery.refetch,
        mode,
        isPlaying,
        playbackRate,
        setPlaybackRate,
        cursorIndex: effectiveIndex,
        totalFrames: timeline.length,
        seekTo,
        stepFrame,
        seekToTimestamp,
        togglePlay,
        returnToLive,
    };
}
