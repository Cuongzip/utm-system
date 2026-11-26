"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { Hub, ProfilePoint } from "@/types";
import { calculateDistance, formatAltitude, formatDistance } from "@/utils";
import { isDuplicateCoord } from "@/utils/geo";

const CHART_PADDING = { top: 18, bottom: 22, left: 36, right: 36 } as const;

export interface BaseAltitudeWaypoint {
    id?: string;
    tempId?: string;
    sequence?: number;
    name?: string;
    latitude?: number;
    longitude?: number;
    altitude?: number;
}

export interface AltitudeProfileProps<T extends BaseAltitudeWaypoint = BaseAltitudeWaypoint> {
    waypoints: T[];
    selectedWaypointId: string | null;
    onWaypointClick: (waypoint: T) => void;
    onPointClick: (point: ProfilePoint) => void;
    departureHub: Hub | null;
    arrivalHub: Hub | null;
}

export function AltitudeProfile<T extends BaseAltitudeWaypoint = BaseAltitudeWaypoint>({
    waypoints,
    selectedWaypointId,
    onWaypointClick,
    onPointClick,
    departureHub,
    arrivalHub,
}: AltitudeProfileProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = useState(600);
    const chartHeight = 110;

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
        const pts: ProfilePoint[] = [];

        const hasDep =
            departureHub?.location?.latitude !== undefined &&
            departureHub?.location?.longitude !== undefined;
        const hasArr =
            arrivalHub?.location?.latitude !== undefined &&
            arrivalHub?.location?.longitude !== undefined;

        if (hasDep) {
            pts.push({
                id: "hub-dep",
                label: departureHub.code || departureHub.name || "DEP",
                altitude: departureHub.altitudeMsl ?? 0,
                latitude: departureHub.location!.latitude,
                longitude: departureHub.location!.longitude,
                isDeparture: true,
            });
        }

        sorted.forEach((wp, idx) => {
            if (wp.latitude === undefined || wp.longitude === undefined) return;
            const lat = wp.latitude;
            const lng = wp.longitude;
            const alt = wp.altitude ?? 50;

            const last = pts[pts.length - 1];
            const isDup = last && isDuplicateCoord(last, { latitude: lat, longitude: lng });

            if (!isDup) {
                pts.push({
                    id: String(wp.id || wp.tempId || idx),
                    label: String(wp.sequence ?? idx + 1),
                    altitude: alt,
                    latitude: lat,
                    longitude: lng,
                    waypoint: wp as unknown as ProfilePoint["waypoint"],
                });
            }
        });

        if (hasArr) {
            const arrLat = arrivalHub.location!.latitude;
            const arrLng = arrivalHub.location!.longitude;
            const last = pts[pts.length - 1];
            const isDup = last && isDuplicateCoord(last, { latitude: arrLat, longitude: arrLng });

            if (!isDup) {
                pts.push({
                    id: "hub-arr",
                    label: arrivalHub.code || arrivalHub.name || "ARR",
                    altitude: arrivalHub.altitudeMsl ?? 0,
                    latitude: arrLat,
                    longitude: arrLng,
                    isArrival: true,
                });
            }
        }

        if (pts.length === 0) {
            return { minAlt: 0, maxAlt: 100, totalDistance: 0, segments: [] };
        }

        let cumDistance = 0;
        const segs = pts.map((pt, i) => {
            if (i > 0) {
                const prev = pts[i - 1];
                const dist = calculateDistance(
                    { lat: prev.latitude, lng: prev.longitude },
                    { lat: pt.latitude, lng: pt.longitude }
                );
                cumDistance += dist;
            }
            return {
                point: pt,
                distance: cumDistance,
            };
        });

        const altitudes = pts.map((p) => p.altitude);
        const minA = Math.min(0, ...altitudes);
        const maxA = Math.max(120, ...altitudes);

        return {
            minAlt: minA,
            maxAlt: Math.ceil(maxA / 20) * 20,
            totalDistance: cumDistance,
            segments: segs,
        };
    }, [waypoints, departureHub, arrivalHub]);

    const innerW = Math.max(10, chartWidth - CHART_PADDING.left - CHART_PADDING.right);
    const innerH = Math.max(10, chartHeight - CHART_PADDING.top - CHART_PADDING.bottom);

    const getX = useCallback(
        (dist: number) => {
            if (totalDistance === 0) return CHART_PADDING.left;
            return CHART_PADDING.left + (dist / totalDistance) * innerW;
        },
        [totalDistance, innerW]
    );

    const getY = useCallback(
        (alt: number) => {
            const diff = maxAlt - minAlt;
            const range = diff === 0 ? 1 : diff;
            const ratio = (alt - minAlt) / range;
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

    const altSteps = [maxAlt, Math.round((maxAlt + minAlt) / 2), minAlt];

    if (segments.length < 2) {
        return (
            <div
                ref={containerRef}
                className="bg-[var(--color-surface-panel)] border-t border-[var(--color-border-subtle)] px-4 py-3 flex items-center justify-between text-xs text-[var(--color-text-muted)] select-none font-mono shrink-0 w-full"
            >
                <span className="font-bold tracking-wider text-[var(--color-text-secondary)]">
                    ALTITUDE PROFILE
                </span>
                <span>Add waypoints or hubs to inspect vertical trajectory profile</span>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="bg-[var(--color-surface-panel)] border-t border-[var(--color-border-subtle)] px-4 py-2 select-none relative shrink-0 w-full"
        >
            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--color-text-secondary)] mb-1">
                <span className="font-bold tracking-wider text-[var(--color-text-primary)]">
                    ALTITUDE PROFILE
                </span>
                <div className="flex items-center gap-4 text-[10px]">
                    <span>
                        DISTANCE:{" "}
                        <strong className="text-[var(--color-text-primary)]">
                            {formatDistance(totalDistance)}
                        </strong>
                    </span>
                    <span>
                        CEILING:{" "}
                        <strong className="text-[var(--color-text-primary)]">
                            {formatAltitude(maxAlt)}
                        </strong>
                    </span>
                </div>
            </div>

            <div className="relative w-full" style={{ height: chartHeight }}>
                <svg width="100%" height={chartHeight} className="overflow-visible">
                    <defs>
                        <linearGradient
                            id="sharedAltitudeGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2={chartHeight}
                            gradientUnits="userSpaceOnUse"
                        >
                            <stop offset="0%" stopColor="#475569" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="#475569" stopOpacity="0.0" />
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
                                    stroke="var(--color-border-subtle)"
                                    strokeWidth="1"
                                    strokeDasharray={i === altSteps.length - 1 ? undefined : "3 3"}
                                />
                                <text
                                    x={CHART_PADDING.left - 8}
                                    y={y + 3.5}
                                    textAnchor="end"
                                    className="text-[10px] fill-[var(--color-text-muted)] font-mono"
                                >
                                    {formatAltitude(alt)}
                                </text>
                            </g>
                        );
                    })}

                    <path d={areaD} fill="url(#sharedAltitudeGradient)" />

                    <path
                        d={pathD}
                        fill="none"
                        stroke="#334155"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {segments.map((seg, idx) => {
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
                            ? "#334155"
                            : seg.point.isArrival
                              ? "#475569"
                              : "#64748b";

                        return (
                            <g
                                key={seg.point.id || idx}
                                className="cursor-pointer group"
                                onClick={() => {
                                    if (seg.point.waypoint) {
                                        onWaypointClick(seg.point.waypoint as T);
                                    }
                                    onPointClick(seg.point);
                                }}
                            >
                                <title>
                                    {seg.point.isDeparture
                                        ? `Departure Vertiport: ${departureHub?.name || "DEP"} (Click to navigate)`
                                        : seg.point.isArrival
                                          ? `Arrival Vertiport: ${arrivalHub?.name || "ARR"} (Click to navigate)`
                                          : `Waypoint ${seg.point.label} (${formatAltitude(seg.point.altitude)}) (Click to navigate)`}
                                </title>
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={isSelected ? 9 : 7}
                                    className="opacity-0 group-hover:opacity-25 transition-opacity"
                                    fill={isSelected ? "#0f172a" : pointColor}
                                />
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={isSelected ? 6 : 4.5}
                                    fill={isSelected ? "#0f172a" : pointColor}
                                    stroke="#ffffff"
                                    strokeWidth={isSelected ? 2.5 : 1.5}
                                />
                                <text
                                    x={x}
                                    y={y - 8}
                                    textAnchor="middle"
                                    className={`text-[10px] font-bold font-mono pointer-events-none transition-colors ${
                                        isSelected
                                            ? "fill-slate-900 font-bold"
                                            : "fill-[var(--color-text-secondary)] group-hover:fill-slate-900"
                                    }`}
                                >
                                    {seg.point.label}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
}
