"use client";

import { type MouseEvent, useRef } from "react";
import { useTranslations } from "next-intl";
import type { Hub, ProfilePoint } from "@/types";
import { formatAltitude } from "@/utils";
import type { computeAirspaceCrossings } from "@/utils/geo";
import { cn } from "@/lib";
import { getAirspaceZoneColor } from "../mapTokens";
import {
    type BaseAltitudeWaypoint,
    CHART_PADDING,
    type LiveAltitudeProgress,
    type ProfileSegment,
} from "./computeProfileGeometry";

type CrossingBand = ReturnType<typeof computeAirspaceCrossings>[number];

interface AltitudeProfileChartSvgProps<T extends BaseAltitudeWaypoint = BaseAltitudeWaypoint> {
    chartWidth: number;
    chartHeight: number;
    innerW: number;
    innerH: number;
    minAlt: number;
    maxAlt: number;
    totalDistance: number;
    segments: ProfileSegment[];
    crossingBands: CrossingBand[];
    areaD: string;
    pathD: string;
    remainingTraceD: string;
    liveTraceD: string;
    isDark: boolean;
    activeTraceColor: string;
    liveProgress: LiveAltitudeProgress | null;
    selectedWaypointId: string | null;
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    onWaypointClick: (waypoint: T) => void;
    onPointClick: (point: ProfilePoint) => void;
    onSeekDistance?: (distanceM: number) => void;
    getX: (dist: number) => number;
    getY: (alt: number) => number;
}

export function AltitudeProfileChartSvg<T extends BaseAltitudeWaypoint = BaseAltitudeWaypoint>({
    chartWidth,
    chartHeight,
    innerW,
    innerH,
    minAlt,
    maxAlt,
    totalDistance,
    segments,
    crossingBands,
    areaD,
    pathD,
    remainingTraceD,
    liveTraceD,
    isDark,
    activeTraceColor,
    liveProgress,
    selectedWaypointId,
    departureHub,
    arrivalHub,
    onWaypointClick,
    onPointClick,
    onSeekDistance,
    getX,
    getY,
}: AltitudeProfileChartSvgProps<T>) {
    const t = useTranslations("map");
    const svgRef = useRef<SVGSVGElement>(null);

    const handleSvgClick = (e: MouseEvent<SVGSVGElement>) => {
        if (!onSeekDistance || !svgRef.current || totalDistance <= 0) return;
        const rect = svgRef.current.getBoundingClientRect();
        const relX = e.clientX - rect.left - CHART_PADDING.left;
        const ratio = Math.min(1, Math.max(0, relX / innerW));
        onSeekDistance(ratio * totalDistance);
    };

    const altSteps = [maxAlt, Math.round((maxAlt + minAlt) / 2), minAlt];
    const gradientId = isDark ? "altitudeGradientDark" : "sharedAltitudeGradient";
    const plannedStroke = isDark ? "#38bdf8" : "#0369a1";

    return (
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
    );
}
