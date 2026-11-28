"use client";

import { useTranslations } from "next-intl";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import {
    AltitudeProfile,
    type LiveAltitudeProgress,
    type LiveAltitudeTracePoint,
} from "@/components/map";
import type { PlaybackSpeed } from "@/hooks";
import { cn } from "@/lib";
import { formatTime } from "@/utils";
import type { AirspaceZone, Flight, Hub, TelemetryRecord } from "@/types";
import type { ReplayDebriefMetrics, ReplayTimelineMarker } from "./useFlightReplayDossierData";

const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = [0.5, 1, 2, 4, 8];

function formatClockOffset(sec: number): string {
    const total = Math.max(0, Math.floor(sec));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

interface ReplayScrubberFooterProps {
    flight: Flight;
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    activeZones: AirspaceZone[];
    liveAltitudeProgress: LiveAltitudeProgress | null;
    fullAltitudeTrace: LiveAltitudeTracePoint[];
    totalFrames: number;
    cursorIndex: number;
    isPlaying: boolean;
    playbackRate: PlaybackSpeed;
    timelineMarkers: ReplayTimelineMarker[];
    debriefMetrics: ReplayDebriefMetrics;
    activeRecord: TelemetryRecord | null;
    onSeekByDistance: (targetDistanceM: number) => void;
    onStepFrame: (delta: number) => void;
    onTogglePlay: () => void;
    onSeekTo: (index: number) => void;
    onSetPlaybackRate: (rate: PlaybackSpeed) => void;
}

export function ReplayScrubberFooter({
    flight,
    departureHub,
    arrivalHub,
    activeZones,
    liveAltitudeProgress,
    fullAltitudeTrace,
    totalFrames,
    cursorIndex,
    isPlaying,
    playbackRate,
    timelineMarkers,
    debriefMetrics,
    activeRecord,
    onSeekByDistance,
    onStepFrame,
    onTogglePlay,
    onSeekTo,
    onSetPlaybackRate,
}: ReplayScrubberFooterProps) {
    const td = useTranslations("flights.deck");

    return (
        <div className="flex flex-col w-full shrink-0">
            <AltitudeProfile
                waypoints={flight.waypoints ?? []}
                selectedWaypointId={null}
                onWaypointClick={() => {}}
                onPointClick={() => {}}
                departureHub={departureHub}
                arrivalHub={arrivalHub}
                airspaceZones={activeZones}
                liveProgress={liveAltitudeProgress}
                fullTrace={fullAltitudeTrace}
                cruisingAltitudeM={flight.cruisingAltitudeM}
                onSeekDistance={totalFrames > 1 ? onSeekByDistance : undefined}
            />

            {totalFrames > 1 ? (
                <div className="px-3.5 py-2 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2.5 text-xs font-mono">
                    <div className="inline-flex items-center gap-1 shrink-0">
                        <button
                            type="button"
                            onClick={() => onStepFrame(-1)}
                            disabled={cursorIndex <= 0}
                            title={td("stepBack")}
                            aria-label={td("stepBack")}
                            className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-100 inline-flex items-center justify-center text-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                            <SkipBack className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={onTogglePlay}
                            aria-label={isPlaying ? td("pauseReplay") : td("playReplay")}
                            className="w-8 h-7 rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 inline-flex items-center justify-center text-white cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                            {isPlaying ? (
                                <Pause className="w-3.5 h-3.5" />
                            ) : (
                                <Play className="w-3.5 h-3.5" />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => onStepFrame(1)}
                            disabled={cursorIndex >= totalFrames - 1}
                            title={td("stepForward")}
                            aria-label={td("stepForward")}
                            className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-100 inline-flex items-center justify-center text-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                            <SkipForward className="w-3.5 h-3.5" />
                        </button>
                    </div>

                    <div className="relative flex-1 min-w-[140px] h-7 flex items-center">
                        {timelineMarkers.map((m) => (
                            <span
                                key={m.id}
                                title={m.label}
                                style={{
                                    left: `${Math.min(99, Math.max(1, m.ratio * 100))}%`,
                                }}
                                className={cn(
                                    "absolute top-1 w-1 h-2 rounded-xs pointer-events-none -translate-x-1/2",
                                    m.kind === "hazard" ? "bg-red-500" : "bg-amber-500"
                                )}
                            />
                        ))}
                        <input
                            type="range"
                            min={0}
                            max={Math.max(0, totalFrames - 1)}
                            value={cursorIndex}
                            onChange={(e) => onSeekTo(Number.parseInt(e.target.value, 10))}
                            aria-label={td("timelineScrubberAria")}
                            className="w-full accent-slate-900 cursor-pointer"
                        />
                    </div>

                    <span className="text-[11px] text-slate-700 tabular-nums shrink-0 whitespace-nowrap">
                        {debriefMetrics.durationSec != null
                            ? `+${formatClockOffset(debriefMetrics.elapsedSec)} / ${formatClockOffset(debriefMetrics.durationSec)} · `
                            : ""}
                        {activeRecord?.timestamp ? formatTime(activeRecord.timestamp) : "--:--:--"}{" "}
                        <span className="text-slate-400">
                            ({cursorIndex + 1}/{totalFrames})
                        </span>
                    </span>

                    <div className="inline-flex items-center rounded border border-slate-200 bg-white p-0.5 shrink-0">
                        {PLAYBACK_SPEEDS.map((spd) => (
                            <button
                                key={spd}
                                type="button"
                                onClick={() => onSetPlaybackRate(spd)}
                                className={cn(
                                    "px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                    playbackRate === spd
                                        ? "bg-slate-800 text-white"
                                        : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                {spd}x
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-xs font-mono text-slate-500 text-center">
                    {td("noReplayFrames")}
                </div>
            )}
        </div>
    );
}
