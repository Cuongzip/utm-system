"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { AirspaceZone, Hub, ProfilePoint } from "@/types";
import { computeAirspaceCrossings } from "@/utils/geo";
import { cn } from "@/lib";
import { AltitudeProfileChartSvg } from "./altitude-profile/AltitudeProfileChartSvg";
import { AltitudeProfileHeader } from "./altitude-profile/AltitudeProfileHeader";
import {
    type BaseAltitudeWaypoint,
    buildPlannedProfilePaths,
    buildRemainingTracePath,
    buildTracePath,
    CHART_HEIGHT,
    CHART_PADDING,
    computeProfileGeometry,
    type LiveAltitudeProgress,
    type LiveAltitudeTracePoint,
    projectAltitudeY,
    projectDistanceX,
} from "./altitude-profile/computeProfileGeometry";

export type { LiveAltitudeTracePoint, LiveAltitudeProgress };

interface AltitudeProfileProps<T extends BaseAltitudeWaypoint = BaseAltitudeWaypoint> {
    waypoints: T[];
    selectedWaypointId: string | null;
    onWaypointClick: (waypoint: T) => void;
    onPointClick: (point: ProfilePoint) => void;
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    airspaceZones?: AirspaceZone[];
    liveProgress?: LiveAltitudeProgress | null;
    fullTrace?: LiveAltitudeTracePoint[];
    cruisingAltitudeM?: number | null;
    tone?: "light" | "dark";
    hideHeader?: boolean;
    onSeekDistance?: (distanceM: number) => void;
}

const EMPTY_ZONES: AirspaceZone[] = [];

export function AltitudeProfile<T extends BaseAltitudeWaypoint = BaseAltitudeWaypoint>({
    waypoints,
    selectedWaypointId,
    onWaypointClick,
    onPointClick,
    departureHub,
    arrivalHub,
    airspaceZones = EMPTY_ZONES,
    liveProgress = null,
    fullTrace,
    cruisingAltitudeM,
    tone = "light",
    hideHeader = false,
    onSeekDistance,
}: AltitudeProfileProps<T>) {
    const t = useTranslations("map");
    const containerRef = useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = useState(600);
    const isDark = tone === "dark";

    useEffect(() => {
        if (!containerRef.current) return;
        const updateWidth = () => {
            if (containerRef.current) {
                const w = Math.floor(containerRef.current.clientWidth);
                if (w > 0) setChartWidth(w);
            }
        };
        updateWidth();
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const w = Math.floor(entry.contentRect.width);
                if (w > 0) setChartWidth(w);
            }
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    const { minAlt, maxAlt, totalDistance, segments } = useMemo(
        () =>
            computeProfileGeometry({
                waypoints,
                departureHub,
                arrivalHub,
                cruisingAltitudeM,
                liveProgress,
                fullTrace,
            }),
        [waypoints, departureHub, arrivalHub, cruisingAltitudeM, liveProgress, fullTrace]
    );

    const crossingBands = useMemo(
        () => computeAirspaceCrossings(segments, airspaceZones),
        [segments, airspaceZones]
    );

    const penetratedCount = useMemo(
        () => crossingBands.filter((b) => b.isPenetrated).length,
        [crossingBands]
    );

    const innerW = Math.max(10, chartWidth - CHART_PADDING.left - CHART_PADDING.right);
    const innerH = Math.max(10, CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom);

    const getX = useCallback(
        (dist: number) => projectDistanceX(dist, totalDistance, innerW),
        [totalDistance, innerW]
    );

    const getY = useCallback(
        (alt: number) => projectAltitudeY(alt, minAlt, maxAlt, innerH),
        [maxAlt, minAlt, innerH]
    );

    const { pathD, areaD } = useMemo(
        () => buildPlannedProfilePaths(segments, getX, getY, innerH),
        [segments, getX, getY, innerH]
    );

    const playedTraceLength = liveProgress?.trace?.length ?? 0;
    const remainingTraceD = useMemo(
        () => buildRemainingTracePath(fullTrace, playedTraceLength, getX, getY),
        [fullTrace, playedTraceLength, getX, getY]
    );

    const liveTraceD = useMemo(
        () => buildTracePath(liveProgress?.trace, getX, getY),
        [liveProgress?.trace, getX, getY]
    );

    const activeTraceColor = liveProgress?.isReplay ? "#f59e0b" : "#10b981";

    if (segments.length < 2) {
        return (
            <div
                ref={containerRef}
                className={cn(
                    "px-4 py-3 flex items-center justify-between text-xs select-none font-mono shrink-0 w-full",
                    isDark
                        ? "bg-slate-900/95 text-slate-400"
                        : "bg-[var(--color-surface-panel)] border-t border-[var(--color-border-subtle)] text-[var(--color-text-muted)]"
                )}
            >
                {!hideHeader && (
                    <span
                        className={cn(
                            "font-bold tracking-wider",
                            isDark ? "text-slate-200" : "text-[var(--color-text-secondary)]"
                        )}
                    >
                        {t("altitudeProfile")}
                    </span>
                )}
                <span>{t("altitudeProfileEmpty")}</span>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                "px-3.5 py-2 select-none relative shrink-0 w-full",
                isDark
                    ? "bg-slate-900/95 text-slate-200"
                    : "bg-[var(--color-surface-panel)] border-t border-[var(--color-border-subtle)] text-[var(--color-text-secondary)]"
            )}
        >
            <AltitudeProfileHeader
                isDark={isDark}
                hideHeader={hideHeader}
                penetratedCount={penetratedCount}
                crossingCount={crossingBands.length}
                liveProgress={liveProgress}
                activeTraceColor={activeTraceColor}
                totalDistance={totalDistance}
                maxAlt={maxAlt}
            />

            <AltitudeProfileChartSvg
                chartWidth={chartWidth}
                chartHeight={CHART_HEIGHT}
                innerW={innerW}
                innerH={innerH}
                minAlt={minAlt}
                maxAlt={maxAlt}
                totalDistance={totalDistance}
                segments={segments}
                crossingBands={crossingBands}
                areaD={areaD}
                pathD={pathD}
                remainingTraceD={remainingTraceD}
                liveTraceD={liveTraceD}
                isDark={isDark}
                activeTraceColor={activeTraceColor}
                liveProgress={liveProgress}
                selectedWaypointId={selectedWaypointId}
                departureHub={departureHub}
                arrivalHub={arrivalHub}
                onWaypointClick={onWaypointClick}
                onPointClick={onPointClick}
                onSeekDistance={onSeekDistance}
                getX={getX}
                getY={getY}
            />
        </div>
    );
}
