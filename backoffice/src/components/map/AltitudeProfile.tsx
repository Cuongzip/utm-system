"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import type { Hub, ProfilePoint } from "@/types";
import { calculateDistance, formatDistance } from "@/utils";

export interface BaseAltitudeWaypoint {
    id?: string;
    tempId?: string;
    sequence?: number;
    name?: string;
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    altitude?: number;
}

export interface AltitudeProfileProps<T extends BaseAltitudeWaypoint = BaseAltitudeWaypoint> {
    waypoints?: T[];
    selectedWaypointId?: string | null;
    onWaypointClick?: (waypoint: T) => void;
    onPointClick?: (point: ProfilePoint) => void;
    departureHub?: Hub | null;
    arrivalHub?: Hub | null;
    title?: string;
    className?: string;
}

export function AltitudeProfile<T extends BaseAltitudeWaypoint = BaseAltitudeWaypoint>({
    waypoints = [],
    selectedWaypointId,
    onWaypointClick,
    onPointClick,
    departureHub,
    arrivalHub,
    title = "ALTITUDE PROFILE",
    className = "",
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
            departureHub?.location?.lat !== undefined && departureHub?.location?.lng !== undefined;
        const hasArr =
            arrivalHub?.location?.lat !== undefined && arrivalHub?.location?.lng !== undefined;

        if (hasDep) {
            pts.push({
                id: "hub-dep",
                label: departureHub.code || departureHub.name || "DEP",
                altitude: departureHub.altitudeMsl ?? 0,
                latitude: departureHub.location!.lat,
                longitude: departureHub.location!.lng,
                isDeparture: true,
            });
        }

        sorted.forEach((wp, idx) => {
            const lat = wp.latitude !== undefined ? wp.latitude : (wp.lat ?? 0);
            const lng = wp.longitude !== undefined ? wp.longitude : (wp.lng ?? 0);
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
                    waypoint: wp as any,
                });
            }
        });

        if (hasArr) {
            const arrLat = arrivalHub.location!.lat;
            const arrLng = arrivalHub.location!.lng;
            const last = pts[pts.length - 1];
            const isDup =
                last &&
                Math.abs(last.latitude - arrLat) < 0.0001 &&
                Math.abs(last.longitude - arrLng) < 0.0001;

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
        const min = Math.min(...altitudes, 0);
        const max = Math.max(...altitudes, 50);
        const padding = Math.max((max - min) * 0.2, 10);

        return {
            minAlt: Math.max(0, Math.floor(min - padding)),
            maxAlt: Math.ceil(max + padding),
            totalDistance: cumDistance || 1,
            segments: segs,
        };
    }, [waypoints, departureHub, arrivalHub]);

    if (waypoints.length === 0) {
        return (
            <div
                className={`p-4 bg-[var(--color-surface-panel)] border-t border-[var(--color-border-subtle)] ${className}`}
            >
                <div className="text-xs font-mono text-[var(--color-text-muted)] text-center py-4">
                    Add waypoints to inspect vertical altitude profile
                </div>
            </div>
        );
    }

    const chartPadding = { top: 18, right: 35, bottom: 22, left: 45 };
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
            className={`bg-[var(--color-surface-panel)] border-t border-[var(--color-border-subtle)] px-4 py-2.5 select-none ${className}`}
        >
            <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-xs font-bold text-[var(--color-text-primary)] tracking-wide font-mono">
                    {title}
                </span>
                <span className="text-[11px] font-mono text-[var(--color-text-muted)]">
                    Distance: {formatDistance(totalDistance)}
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
                        <linearGradient
                            id="sharedAltitudeGradient"
                            x1="0%"
                            y1="0%"
                            x2="0%"
                            y2="100%"
                        >
                            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
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

                    <path d={areaD} fill="url(#sharedAltitudeGradient)" />

                    <path
                        d={pathD}
                        fill="none"
                        stroke="var(--color-tech-cyan, #06b6d4)"
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
                            ? "var(--color-status-online, #10b981)"
                            : seg.point.isArrival
                              ? "var(--color-tech-cyan, #06b6d4)"
                              : "#06b6d4";

                        return (
                            <g
                                key={seg.point.id || idx}
                                className="cursor-pointer group"
                                onClick={() => {
                                    if (seg.point.waypoint) {
                                        onWaypointClick?.(seg.point.waypoint as T);
                                    }
                                    onPointClick?.(seg.point);
                                }}
                            >
                                <title>
                                    {seg.point.isDeparture
                                        ? `Departure Vertiport: ${departureHub?.name || "DEP"} (Click to navigate)`
                                        : seg.point.isArrival
                                          ? `Arrival Vertiport: ${arrivalHub?.name || "ARR"} (Click to navigate)`
                                          : `Waypoint ${seg.point.label} (${seg.point.altitude}m) (Click to navigate)`}
                                </title>
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={isSelected ? 9 : 7}
                                    className="opacity-0 group-hover:opacity-25 transition-opacity"
                                    fill={isSelected ? "#38bdf8" : pointColor}
                                />
                                <circle
                                    cx={x}
                                    cy={y}
                                    r={isSelected ? 6 : 4.5}
                                    fill={isSelected ? "#38bdf8" : pointColor}
                                    stroke="#ffffff"
                                    strokeWidth={isSelected ? 2.5 : 1.5}
                                />
                                <text
                                    x={x}
                                    y={y - 8}
                                    textAnchor="middle"
                                    className={`text-[10px] font-bold font-mono pointer-events-none transition-colors ${
                                        isSelected
                                            ? "fill-cyan-400 font-bold"
                                            : "fill-[var(--color-text-primary)] group-hover:fill-[var(--color-tech-cyan)]"
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

export default AltitudeProfile;
