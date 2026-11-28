"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { telemetryService } from "@/services";
import { useStomp, useTelemetryStream } from "./useStomp";
import { isTelemetryFresh } from "./useLiveTelemetry";
import { QUERY_KEYS } from "./useQueries";
import { ACTIVE_FLIGHT_STATUSES, FLIGHT_STATUS, type Flight, type TelemetryRecord } from "@/types";

export type FlightDeckStreamMode = "live" | "replay";
export type PlaybackSpeed = 0.5 | 1 | 2 | 4 | 8;

export function getRecordTimestampMs(rec: TelemetryRecord): number {
    if (!rec.timestamp) return 0;
    const parsed = Date.parse(rec.timestamp);
    return Number.isNaN(parsed) ? 0 : parsed;
}

function getRecordDedupKey(rec: TelemetryRecord): string {
    if (rec.id) return `id:${rec.id}`;
    return `ts:${rec.timestamp ?? ""}_${rec.latitude ?? ""}_${rec.longitude ?? ""}_${rec.altitude ?? ""}`;
}

function pickInitialReplayIndex(frames: TelemetryRecord[]): number {
    if (frames.length <= 1) return 0;
    const mid = Math.floor(frames.length * 0.5);
    for (let offset = 0; offset < frames.length; offset++) {
        const right = mid + offset;
        if (right < frames.length && (frames[right]?.altitude ?? 0) > 5) {
            return right;
        }
        const left = mid - offset;
        if (left >= 0 && (frames[left]?.altitude ?? 0) > 5) {
            return left;
        }
    }
    return mid;
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

    const [liveFrames, setLiveFrames] = useState<TelemetryRecord[]>([]);
    const [prevFlightId, setPrevFlightId] = useState(flightId);
    const [manualReplay, setManualReplay] = useState(false);
    const [cursorIndex, setCursorIndex] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackRate, setPlaybackRate] = useState<PlaybackSpeed>(1);
    const pollingRef = useRef(false);

    if (flightId !== prevFlightId) {
        setPrevFlightId(flightId);
        setLiveFrames([]);
        setManualReplay(false);
        setCursorIndex(null);
        setIsPlaying(false);
    }

    const historyQuery = useQuery({
        queryKey: QUERY_KEYS.flightTelemetryHistory(flightId),
        queryFn: () => telemetryService.getHistoryByFlightId(flightId),
        enabled: Boolean(flightId) && enabled,
        staleTime: isAirborne ? 4000 : 60_000,
        refetchInterval: isAirborne && !isSocketConnected ? 2500 : false,
    });

    const appendRecords = useCallback((records: TelemetryRecord[]) => {
        if (records.length === 0) return;
        setLiveFrames((prev) => {
            const seen = new Set(prev.map(getRecordDedupKey));
            let changed = false;
            const next = [...prev];
            for (const rec of records) {
                if (!rec || rec.latitude == null || rec.longitude == null) continue;
                const key = getRecordDedupKey(rec);
                if (!seen.has(key)) {
                    seen.add(key);
                    next.push(rec);
                    changed = true;
                }
            }
            if (!changed) return prev;
            return next.length > 800 ? next.slice(next.length - 800) : next;
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

    const timeline = useMemo(() => {
        const merged = new Map<string, TelemetryRecord>();
        for (const item of historyQuery.data ?? []) {
            if (item && item.latitude != null && item.longitude != null) {
                merged.set(getRecordDedupKey(item), item);
            }
        }
        for (const item of liveFrames) {
            if (item && item.latitude != null && item.longitude != null) {
                merged.set(getRecordDedupKey(item), item);
            }
        }
        return Array.from(merged.values()).sort(
            (a, b) => getRecordTimestampMs(a) - getRecordTimestampMs(b)
        );
    }, [historyQuery.data, liveFrames]);

    const defaultReplayIndex = useMemo(() => pickInitialReplayIndex(timeline), [timeline]);

    const mode: FlightDeckStreamMode = isTerminal || manualReplay ? "replay" : "live";
    const lastIdx = Math.max(0, timeline.length - 1);
    const effectiveIndex =
        mode === "live"
            ? lastIdx
            : cursorIndex == null
              ? defaultReplayIndex
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
