"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import type { AirspaceZone, Hub, ProfilePoint } from "@/types";
import { calculateDistance, formatAltitude, formatDistance } from "@/utils";
import { computeAirspaceCrossings, isDuplicateCoord } from "@/utils/geo";
import { getAirspaceZoneColor } from "./mapTokens";
import { cn } from "@/lib";

const CHART_PADDING = { top: 20, bottom: 22, left: 44, right: 20 } as const;

export interface BaseAltitudeWaypoint {
    id?: string;
    tempId?: string;
    sequence?: number;
    name?: string;
    latitude?: number;
    longitude?: number;
    altitude?: number;
}

export interface LiveAltitudeTracePoint {
    distanceM: number;
    altitudeM: number;
}

export interface LiveAltitudeProgress {
    distanceM: number;
    altitudeM: number;
    isReplay?: boolean;
    trace?: LiveAltitudeTracePoint[];
}

export interface AltitudeProfileProps<T extends BaseAltitudeWaypoint = BaseAltitudeWaypoint> {
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

interface InternalSegment {
    point: ProfilePoint;
    distance: number;
    isSyntheticShaftCorner?: boolean;
}

export function AltitudeProfile<T extends BaseAltitudeWaypoint = BaseAltitudeWaypoint>({
    waypoints,
    selectedWaypointId,
    onWaypointClick,
    onPointClick,
    departureHub,
    arrivalHub,
    airspaceZones = [],
    liveProgress = null,
    fullTrace,
    cruisingAltitudeM,
    tone = "light",
    hideHeader = false,
    onSeekDistance,
}: AltitudeProfileProps<T>) {
    const t = useTranslations("map");
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [chartWidth, setChartWidth] = useState(600);
    const chartHeight = 112;
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

    const { minAlt, maxAlt, totalDistance, segments } = useMemo(() => {
        const sorted = [...waypoints].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
        const rawEntries: Array<{ point: ProfilePoint; isSyntheticShaftCorner?: boolean }> = [];

        const hasDep =
            departureHub?.location?.latitude !== undefined &&
            departureHub?.location?.longitude !== undefined;
        const hasArr =
            arrivalHub?.location?.latitude !== undefined &&
            arrivalHub?.location?.longitude !== undefined;

        const defaultCruise = Math.max(20, cruisingAltitudeM ?? 120);
        const firstAirborneWp = sorted.find((w) => (w.altitude ?? 0) > 15);
        const firstCruiseAlt = firstAirborneWp?.altitude ?? defaultCruise;

        if (hasDep) {
            const depLat = departureHub.location!.latitude;
            const depLng = departureHub.location!.longitude;
            rawEntries.push({
                point: {
                    id: "hub-dep",
                    label: departureHub.code || departureHub.name || "DEP",
                    altitude: 0,
                    latitude: depLat,
                    longitude: depLng,
                    isDeparture: true,
                },
            });
            rawEntries.push({
                point: {
                    id: "hub-dep-top",
                    label: "",
                    altitude: firstCruiseAlt,
                    latitude: depLat,
                    longitude: depLng,
                },
                isSyntheticShaftCorner: true,
            });
        }

        sorted.forEach((wp, idx) => {
            if (wp.latitude === undefined || wp.longitude === undefined) return;
            const lat = wp.latitude;
            const lng = wp.longitude;
            const alt = wp.altitude ?? defaultCruise;

            const isAtDep =
                hasDep &&
                isDuplicateCoord(departureHub.location!, { latitude: lat, longitude: lng });
            const isAtArr =
                hasArr && isDuplicateCoord(arrivalHub.location!, { latitude: lat, longitude: lng });
            if ((isAtDep || isAtArr) && alt <= 15) {
                return;
            }

            const last = rawEntries[rawEntries.length - 1]?.point;
            const isDupSameAlt =
                last &&
                isDuplicateCoord(last, { latitude: lat, longitude: lng }) &&
                Math.abs(last.altitude - alt) < 2;

            if (!isDupSameAlt) {
                rawEntries.push({
                    point: {
                        id: String(wp.id || wp.tempId || idx),
                        label: String(wp.sequence ?? idx + 1),
                        altitude: alt,
                        latitude: lat,
                        longitude: lng,
                        waypoint: wp as unknown as ProfilePoint["waypoint"],
                    },
                });
            }
        });

        if (hasArr) {
            const arrLat = arrivalHub.location!.latitude;
            const arrLng = arrivalHub.location!.longitude;
            const lastEntry = rawEntries[rawEntries.length - 1];
            const lastCruiseAlt =
                lastEntry && lastEntry.point.altitude > 15
                    ? lastEntry.point.altitude
                    : firstCruiseAlt;

            const isLastAtArrTop =
                lastEntry &&
                isDuplicateCoord(lastEntry.point, { latitude: arrLat, longitude: arrLng }) &&
                Math.abs(lastEntry.point.altitude - lastCruiseAlt) < 2;

            if (!isLastAtArrTop) {
                rawEntries.push({
                    point: {
                        id: "hub-arr-top",
                        label: "",
                        altitude: lastCruiseAlt,
                        latitude: arrLat,
                        longitude: arrLng,
                    },
                    isSyntheticShaftCorner: true,
                });
            }

            rawEntries.push({
                point: {
                    id: "hub-arr",
                    label: arrivalHub.code || arrivalHub.name || "ARR",
                    altitude: 0,
                    latitude: arrLat,
                    longitude: arrLng,
                    isArrival: true,
                },
            });
        }

        if (rawEntries.length === 0) {
            return { minAlt: 0, maxAlt: 100, totalDistance: 0, segments: [] as InternalSegment[] };
        }

        let cumDistance = 0;
        const segs: InternalSegment[] = rawEntries.map((entry, i) => {
            if (i > 0) {
                const prev = rawEntries[i - 1].point;
                const dist = calculateDistance(
                    { lat: prev.latitude, lng: prev.longitude },
                    { lat: entry.point.latitude, lng: entry.point.longitude }
                );
                cumDistance += dist;
            }
            return {
                point: entry.point,
                distance: cumDistance,
                isSyntheticShaftCorner: entry.isSyntheticShaftCorner,
            };
        });

        const altitudes = segs.map((s) => s.point.altitude);
        if (liveProgress) {
            altitudes.push(liveProgress.altitudeM);
            if (liveProgress.trace) {
                for (const tp of liveProgress.trace) {
                    altitudes.push(tp.altitudeM);
                }
            }
        }
        if (fullTrace) {
            for (const tp of fullTrace) {
                altitudes.push(tp.altitudeM);
            }
        }
        const minA = Math.min(0, ...altitudes);
        const maxA = Math.max(120, ...altitudes);

        return {
            minAlt: minA,
            maxAlt: Math.ceil(maxA / 20) * 20,
            totalDistance: cumDistance,
            segments: segs,
        };
    }, [waypoints, departureHub, arrivalHub, cruisingAltitudeM, liveProgress, fullTrace]);

    const crossingBands = useMemo(
        () => computeAirspaceCrossings(segments, airspaceZones),
        [segments, airspaceZones]
    );

    const penetratedCount = useMemo(
        () => crossingBands.filter((b) => b.isPenetrated).length,
        [crossingBands]
    );

    const innerW = Math.max(10, chartWidth - CHART_PADDING.left - CHART_PADDING.right);
    const innerH = Math.max(10, chartHeight - CHART_PADDING.top - CHART_PADDING.bottom);

    const getX = useCallback(
        (dist: number) => {
            if (totalDistance === 0) return CHART_PADDING.left;
            const clamped = Math.min(totalDistance, Math.max(0, dist));
            return CHART_PADDING.left + (clamped / totalDistance) * innerW;
        },
        [totalDistance, innerW]
    );

    const getY = useCallback(
        (alt: number) => {
            const diff = maxAlt - minAlt;
            const range = diff === 0 ? 1 : diff;
            const clampedAlt = Math.min(maxAlt, Math.max(minAlt, alt));
            const ratio = (clampedAlt - minAlt) / range;
            return CHART_PADDING.top + innerH * (1 - ratio);
        },
        [maxAlt, minAlt, innerH]
    );

    const pathD = useMemo(() => {
        if (segments.length === 0) return "";
        return segments.reduce((acc, seg, i) => {
            const x = getX(seg.distance);
            const y = getY(seg.point.altitude);
            return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
        }, "");
    }, [segments, getX, getY]);

    const areaD = useMemo(() => {
        if (segments.length === 0) return "";
        const baseY = CHART_PADDING.top + innerH;
        const firstX = getX(segments[0].distance);
        const lastX = getX(segments[segments.length - 1].distance);
        return `${pathD} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
    }, [pathD, segments, innerH, getX]);

    const remainingTraceD = useMemo(() => {
        if (!fullTrace || fullTrace.length < 2) return "";
        const playedLen = liveProgress?.trace?.length ?? 0;
        const startIdx = playedLen > 0 ? Math.max(0, playedLen - 1) : 0;
        const slice = fullTrace.slice(startIdx);
        if (slice.length < 2) return "";
        return slice.reduce((acc, pt, idx) => {
            const x = getX(pt.distanceM);
            const y = getY(pt.altitudeM);
            return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
        }, "");
    }, [fullTrace, liveProgress?.trace?.length, getX, getY]);

    const liveTraceD = useMemo(() => {
        const trace = liveProgress?.trace;
        if (!trace || trace.length < 2) return "";
        return trace.reduce((acc, pt, idx) => {
            const x = getX(pt.distanceM);
            const y = getY(pt.altitudeM);
            return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
        }, "");
    }, [liveProgress?.trace, getX, getY]);

    const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (!onSeekDistance || !svgRef.current || totalDistance <= 0) return;
        const rect = svgRef.current.getBoundingClientRect();
        const relX = e.clientX - rect.left - CHART_PADDING.left;
        const ratio = Math.min(1, Math.max(0, relX / innerW));
        onSeekDistance(ratio * totalDistance);
    };

    const altSteps = [maxAlt, Math.round((maxAlt + minAlt) / 2), minAlt];
    const gradientId = isDark ? "altitudeGradientDark" : "sharedAltitudeGradient";
    const plannedStroke = isDark ? "#38bdf8" : "#0369a1";
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
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono mb-1">
                <div className="flex items-center gap-2">
                    {!hideHeader && (
                        <span
                            className={cn(
                                "text-[11px] font-bold tracking-wider",
                                isDark ? "text-slate-100" : "text-[var(--color-text-primary)]"
                            )}
                        >
                            {t("altitudeProfile")}
                        </span>
                    )}
                    {penetratedCount > 0 ? (
                        <span
                            className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-bold border",
                                isDark
                                    ? "bg-red-950/80 border-red-500/50 text-red-300"
                                    : "bg-red-500/15 border-red-500/35 text-red-600"
                            )}
                        >
                            {t("zonePenetration", { count: penetratedCount })}
                        </span>
                    ) : crossingBands.length > 0 ? (
                        <span
                            className={cn(
                                "px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                                isDark
                                    ? "bg-sky-950/80 border-sky-500/40 text-sky-300"
                                    : "bg-cyan-500/10 border-cyan-500/30 text-cyan-700"
                            )}
                        >
                            {t("airspaceSector", { count: crossingBands.length })}
                        </span>
                    ) : null}
                </div>
                <div className="flex items-center gap-3 text-[10px] ml-auto">
                    {liveProgress && (
                        <span
                            className={cn(
                                "inline-flex items-center gap-1.5 font-semibold tabular-nums",
                                liveProgress.isReplay
                                    ? isDark
                                        ? "text-amber-300"
                                        : "text-amber-700"
                                    : isDark
                                      ? "text-emerald-300"
                                      : "text-emerald-700"
                            )}
                        >
                            <span
                                className="w-2 h-2 rounded-full inline-block"
                                style={{ backgroundColor: activeTraceColor }}
                            />
                            <span>UAV {formatAltitude(Math.round(liveProgress.altitudeM))}</span>
                        </span>
                    )}
                    <span className={isDark ? "text-slate-400" : undefined}>
                        {t("distance")}{" "}
                        <strong
                            className={
                                isDark ? "text-slate-100" : "text-[var(--color-text-primary)]"
                            }
                        >
                            {formatDistance(totalDistance)}
                        </strong>
                    </span>
                    <span className={isDark ? "text-slate-400" : undefined}>
                        {t("ceiling")}{" "}
                        <strong
                            className={
                                isDark ? "text-slate-100" : "text-[var(--color-text-primary)]"
                            }
                        >
                            {formatAltitude(maxAlt)}
                        </strong>
                    </span>
                </div>
            </div>

            <div className="relative w-full" style={{ height: chartHeight }}>
                <svg
                    ref={svgRef}
                    width="100%"
                    height={chartHeight}
                    onClick={handleSvgClick}
                    className={cn("overflow-visible", onSeekDistance && "cursor-crosshair")}
                >
                    <defs>
                        <linearGradient
                            id={gradientId}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2={chartHeight}
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop
                                offset="0%"
                                stopColor={plannedStroke}
                                stopOpacity={isDark ? 0.26 : 0.2}
                            />
                            <stop offset="100%" stopColor={plannedStroke} stopOpacity="0.01" />
                        </linearGradient>
                    </defs>

                    {altSteps.map((alt, i) => {
                        const y = getY(alt);
                        return (
                            <g key={i}>
                                <line
                                    x1={CHART_PADDING.left}
                                    y1={y}
                                    x2={chartWidth - CHART_PADDING.right}
                                    y2={y}
                                    stroke={
                                        isDark
                                            ? "rgba(148, 163, 184, 0.2)"
                                            : "var(--color-border-subtle)"
                                    }
                                    strokeWidth="1"
                                    strokeDasharray={i === altSteps.length - 1 ? undefined : "3 3"}
                                />
                                <text
                                    x={CHART_PADDING.left - 6}
                                    y={y + 3.5}
                                    textAnchor="end"
                                    className={cn(
                                        "text-[10px] font-mono",
                                        isDark ? "fill-slate-400" : "fill-[var(--color-text-muted)]"
                                    )}
                                >
                                    {formatAltitude(alt)}
                                </text>
                            </g>
                        );
                    })}

                    {crossingBands.map((band, idx) => {
                        const x1 = getX(band.startDistanceM);
                        const x2 = getX(band.endDistanceM);
                        const rectW = Math.max(3, x2 - x1);
                        const yTop = getY(band.ceilingM);
                        const yBottom = getY(band.floorM);
                        const rectH = Math.max(2, yBottom - yTop);
                        const color = getAirspaceZoneColor(band.zoneType);

                        return (
                            <g key={`${band.zoneId}-${idx}`}>
                                <title>
                                    {`${band.zoneName} (${band.floorM}–${band.ceilingM}m)${
                                        band.isPenetrated ? t("verticalPenetration") : ""
                                    }`}
                                </title>
                                <rect
                                    x={x1}
                                    y={yTop}
                                    width={rectW}
                                    height={rectH}
                                    fill={color}
                                    fillOpacity={band.isPenetrated ? 0.24 : 0.12}
                                    stroke={color}
                                    strokeOpacity={band.isPenetrated ? 0.85 : 0.45}
                                    strokeWidth={band.isPenetrated ? 1.4 : 1}
                                    strokeDasharray={band.isPenetrated ? undefined : "3 2"}
                                    rx={2}
                                />
                            </g>
                        );
                    })}

                    <path d={areaD} fill={`url(#${gradientId})`} />

                    <path
                        d={pathD}
                        fill="none"
                        stroke={plannedStroke}
                        strokeWidth="1.75"
                        strokeDasharray={liveProgress ? "4 3" : undefined}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {remainingTraceD && (
                        <path
                            d={remainingTraceD}
                            fill="none"
                            stroke={activeTraceColor}
                            strokeOpacity={0.34}
                            strokeWidth="1.75"
                            strokeDasharray="3 3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {liveTraceD && (
                        <path
                            d={liveTraceD}
                            fill="none"
                            stroke={activeTraceColor}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}

                    {segments.map((seg, idx) => {
                        if (seg.isSyntheticShaftCorner) return null;

                        const x = getX(seg.distance);
                        const y = getY(seg.point.altitude);
                        const isSelected =
                            selectedWaypointId &&
                            (seg.point.id === selectedWaypointId ||
                                seg.point.id === `wp-${selectedWaypointId}` ||
                                (seg.point.waypoint &&
                                    (seg.point.waypoint.id === selectedWaypointId ||
                                        seg.point.waypoint.tempId === selectedWaypointId)));

                        const pointColor = seg.point.isDeparture
                            ? "#10b981"
                            : seg.point.isArrival
                              ? "#0ea5e9"
                              : isDark
                                ? "#cbd5e1"
                                : "#334155";

                        const isLeftEdge = seg.distance <= totalDistance * 0.04;
                        const isRightEdge = seg.distance >= totalDistance * 0.96;
                        const labelAnchor = isLeftEdge ? "start" : isRightEdge ? "end" : "middle";
                        const labelX = isLeftEdge ? x + 4 : isRightEdge ? x - 4 : x;
                        const labelY = seg.point.altitude <= 5 ? y + 14 : y - 8;

                        return (
                            <g
                                key={seg.point.id || idx}
                                className="cursor-pointer group"
                                onClick={(ev) => {
                                    if (!onSeekDistance) {
                                        ev.stopPropagation();
                                    }
                                    if (seg.point.waypoint) {
                                        onWaypointClick(seg.point.waypoint as T);
                                    }
                                    onPointClick(seg.point);
                                }}
                            >
                                <title>
                                    {seg.point.isDeparture
                                        ? t("depTooltip", { name: departureHub?.name || "DEP" })
                                        : seg.point.isArrival
                                          ? t("arrTooltip", { name: arrivalHub?.name || "ARR" })
                                          : t("wpTooltip", {
                                                label: seg.point.label,
                                                alt: formatAltitude(seg.point.altitude),
                                            })}
                                </title>
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={isSelected ? 8 : 6}
                                    className="opacity-0 group-hover:opacity-25 transition-opacity"
                                    fill={isSelected ? "#0284c7" : pointColor}
                                />
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={isSelected ? 5.5 : 4}
                                    fill={isSelected ? "#0284c7" : pointColor}
                                    stroke={isDark ? "#0f172a" : "#ffffff"}
                                    strokeWidth={isSelected ? 2 : 1.5}
                                />
                                {seg.point.label && (
                                    <text
                                        x={labelX}
                                        y={labelY}
                                        textAnchor={labelAnchor}
                                        className={cn(
                                            "text-[10px] font-bold font-mono pointer-events-none transition-colors",
                                            isSelected
                                                ? isDark
                                                    ? "fill-sky-300"
                                                    : "fill-sky-700"
                                                : isDark
                                                  ? "fill-slate-300 group-hover:fill-white"
                                                  : "fill-[var(--color-text-secondary)] group-hover:fill-slate-900"
                                        )}
                                    >
                                        {seg.point.label}
                                    </text>
                                )}
                            </g>
                        );
                    })}

                    {liveProgress && (
                        <g className="pointer-events-none">
                            <line
                                x1={getX(liveProgress.distanceM)}
                                y1={CHART_PADDING.top}
                                x2={getX(liveProgress.distanceM)}
                                y2={CHART_PADDING.top + innerH}
                                stroke={activeTraceColor}
                                strokeWidth="1.25"
                                strokeDasharray="2 2"
                            />
                            <circle
                                cx={getX(liveProgress.distanceM)}
                                cy={getY(liveProgress.altitudeM)}
                                r={8}
                                fill={activeTraceColor}
                                fillOpacity={0.24}
                            />
                            <circle
                                cx={getX(liveProgress.distanceM)}
                                cy={getY(liveProgress.altitudeM)}
                                r={4.5}
                                fill={activeTraceColor}
                                stroke={isDark ? "#0f172a" : "#ffffff"}
                                strokeWidth="2"
                            />
                        </g>
                    )}
                </svg>
            </div>
        </div>
    );
}
