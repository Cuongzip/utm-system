"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { Waypoint, Hub, ProfilePoint } from "@/types";
import { calculateDistance } from "@/utils";

export interface AltitudeProfileProps {
    waypoints: Waypoint[];
    selectedWaypointId?: string | null;
    onWaypointClick?: (waypoint: Waypoint) => void;
    onPointClick?: (point: ProfilePoint) => void;
    departureHub?: Hub | null;
    arrivalHub?: Hub | null;
    className?: string;
}

export function AltitudeProfile({
    waypoints,
    selectedWaypointId,
    onWaypointClick,
    onPointClick,
    departureHub,
    arrivalHub,
    className = "",
}: AltitudeProfileProps) {
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

    const sortedWaypoints = useMemo(
        () => [...waypoints].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)),
        [waypoints]
    );

    const { minAlt, maxAlt, totalDistance, segments } = useMemo(() => {
        if (sortedWaypoints.length === 0) {
            return { minAlt: 0, maxAlt: 100, totalDistance: 0, segments: [] };
        }

        const hasDep =
            departureHub?.location?.lat !== undefined && departureHub?.location?.lng !== undefined;
        const depLat = departureHub?.location?.lat ?? 0;
        const depLng = departureHub?.location?.lng ?? 0;

        const hasArr =
            arrivalHub?.location?.lat !== undefined && arrivalHub?.location?.lng !== undefined;
        const arrLat = arrivalHub?.location?.lat ?? 0;
        const arrLng = arrivalHub?.location?.lng ?? 0;

        const pts: ProfilePoint[] = [];

        if (hasDep) {
            pts.push({
                id: "hub-dep",
                label: departureHub.code || "DEP",
                altitude: 0,
                latitude: depLat,
                longitude: depLng,
                isDeparture: true,
            });
        }

        sortedWaypoints.forEach((wp, idx) => {
            const lat = wp.latitude ?? 0;
            const lng = wp.longitude ?? 0;
            const alt = wp.altitude ?? 50;

            const last = pts[pts.length - 1];
            const isDup =
                last &&
                Math.abs(last.latitude - lat) < 0.0001 &&
                Math.abs(last.longitude - lng) < 0.0001;

            if (!isDup) {
                pts.push({
                    id: String(wp.id || wp.tempId || idx),
                    label: String(wp.sequence ?? idx + 1),
                    altitude: alt,
                    latitude: lat,
                    longitude: lng,
                    waypoint: wp,
                });
            }
        });

        if (hasArr) {
            const last = pts[pts.length - 1];
            const isDup =
                last &&
                Math.abs(last.latitude - arrLat) < 0.0001 &&
                Math.abs(last.longitude - arrLng) < 0.0001;

            if (!isDup) {
                pts.push({
                    id: "hub-arr",
                    label: arrivalHub.code || "ARR",
                    altitude: 0,
                    latitude: arrLat,
                    longitude: arrLng,
                    isArrival: true,
                });
            }
        }

        let cumDistance = 0;
        const segs = pts.map((pt, i) => {
            if (i > 0) {
                const prev = pts[i - 1];
                const dist = calculateDistance(
                    prev.latitude,
                    prev.longitude,
                    pt.latitude,
                    pt.longitude
                );
                cumDistance += dist;
            }
            return {
                point: pt,
                distance: cumDistance,
            };
        });

        const altitudes = pts.map((p) => p.altitude);
        const min = Math.min(...altitudes, 0);
        const max = Math.max(...altitudes, 50);
        const padding = Math.max((max - min) * 0.2, 10);

        return {
            minAlt: Math.max(0, Math.floor(min - padding)),
            maxAlt: Math.ceil(max + padding),
            totalDistance: cumDistance || 1,
            segments: segs,
        };
    }, [sortedWaypoints, departureHub, arrivalHub]);

    if (waypoints.length === 0) {
        return (
            <div
                className={`p-4 bg-[var(--color-surface-panel)] border-t border-[var(--color-border-subtle)] ${className}`}
            >
                <div className="text-xs font-mono text-[var(--color-text-muted)] text-center py-6">
                    Add waypoints to see altitude profile
                </div>
            </div>
        );
    }

    const chartPadding = { top: 20, right: 35, bottom: 25, left: 45 };
    const plotWidth = Math.max(chartWidth - chartPadding.left - chartPadding.right, 100);
    const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom;

    const getY = (altitude: number) => {
        const range = maxAlt - minAlt;
        if (range === 0) return chartPadding.top + plotHeight / 2;
        return chartPadding.top + ((maxAlt - altitude) / range) * plotHeight;
    };

    const getX = (distance: number) => {
        if (totalDistance === 0) return chartPadding.left;
        return chartPadding.left + (distance / totalDistance) * plotWidth;
    };

    const pathD = segments
        .map((seg, i) => {
            const x = getX(seg.distance);
            const y = getY(seg.point.altitude);
            return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
        })
        .join(" ");

    const baselineY = chartPadding.top + plotHeight;
    const areaD =
        pathD + ` L ${getX(totalDistance)} ${baselineY} L ${chartPadding.left} ${baselineY} Z`;

    const altSteps = [maxAlt, Math.round((maxAlt + minAlt) / 2), minAlt];

    return (
        <div
            className={`bg-[var(--color-surface-panel)] border-t border-[var(--color-border-subtle)] px-4 py-3 select-none ${className}`}
        >
            <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-xs font-bold text-[var(--color-text-primary)] tracking-wide font-mono">
                    ALTITUDE PROFILE
                </span>
                <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                    Distance: {(totalDistance / 1000).toFixed(1)} km
                </span>
            </div>

            <div ref={containerRef} className="w-full overflow-hidden">
                <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    width={chartWidth}
                    height={chartHeight}
                    className="w-full h-[110px]"
                >
                    <defs>
                        <linearGradient id="altitudeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#00a3bf" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#00a3bf" stopOpacity="0.02" />
                        </linearGradient>
                    </defs>

                    {altSteps.map((alt, i) => {
                        const y = getY(alt);
                        return (
                            <g key={i}>
                                <line
                                    x1={chartPadding.left}
                                    y1={y}
                                    x2={chartWidth - chartPadding.right}
                                    y2={y}
                                    stroke="var(--color-border-subtle)"
                                    strokeWidth="1"
                                    strokeDasharray={i === altSteps.length - 1 ? undefined : "3 3"}
                                />
                                <text
                                    x={chartPadding.left - 8}
                                    y={y + 3.5}
                                    textAnchor="end"
                                    className="text-[10px] fill-[var(--color-text-muted)] font-mono"
                                >
                                    {alt}m
                                </text>
                            </g>
                        );
                    })}

                    <path d={areaD} fill="url(#altitudeGradient)" />

                    <path
                        d={pathD}
                        fill="none"
                        stroke="var(--color-tech-cyan)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {segments.map((seg, idx) => {
                        const x = getX(seg.distance);
                        const y = getY(seg.point.altitude);
                        const isSelected =
                            seg.point.waypoint &&
                            (seg.point.waypoint.id === selectedWaypointId ||
                                seg.point.waypoint.tempId === selectedWaypointId);

                        const pointColor = seg.point.isDeparture
                            ? "var(--color-tech-cyan)"
                            : seg.point.isArrival
                              ? "var(--color-tech-amber)"
                              : idx === segments.length - 1
                                ? "var(--color-status-alert)"
                                : "var(--color-status-online)";

                        return (
                            <g
                                key={seg.point.id || idx}
                                className="cursor-pointer group"
                                onClick={() => {
                                    if (seg.point.waypoint) {
                                        onWaypointClick?.(seg.point.waypoint);
                                    }
                                    onPointClick?.(seg.point);
                                }}
                            >
                                <title>
                                    {seg.point.isDeparture
                                        ? `Departure Hub: ${departureHub?.name || "DEP"} (Click to navigate)`
                                        : seg.point.isArrival
                                          ? `Arrival Hub: ${arrivalHub?.name || "ARR"} (Click to navigate)`
                                          : `Waypoint ${seg.point.label} (${seg.point.altitude}m) (Click to navigate)`}
                                </title>
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={isSelected ? 9 : 7}
                                    className="opacity-0 group-hover:opacity-25 transition-opacity"
                                    fill={pointColor}
                                />
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={isSelected ? 6 : 4.5}
                                    fill={pointColor}
                                    stroke="#ffffff"
                                    strokeWidth={isSelected ? 2.5 : 1.5}
                                />
                                <text
                                    x={x}
                                    y={y - 8}
                                    textAnchor="middle"
                                    className="text-[10px] font-bold font-mono fill-[var(--color-text-primary)] pointer-events-none group-hover:fill-[var(--color-tech-cyan)]"
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

export default AltitudeProfile;
