"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Navigation,
    Gauge,
    Battery,
    Wifi,
    MapPin,
} from "lucide-react";
import { ChamferCard, ChamferButton, CustomSelect, EmptyState, KpiStrip } from "@/components/ui";
import { TacticalMapContainer, IncidentReplayLayer } from "@/components/map";
import { formatTime, formatSpeed } from "@/utils";
import type { BlackboxEntryVm, EmergencyIncidentVm } from "@/types";

const PLAYBACK_SPEED_OPTIONS = [
    { value: "0.5", label: "0.5x" },
    { value: "1", label: "1x" },
    { value: "2", label: "2x" },
    { value: "4", label: "4x" },
];

interface IncidentBlackboxReplayCardProps {
    incident: EmergencyIncidentVm;
    incidentCode: string;
    blackboxEntries: BlackboxEntryVm[];
    safeIndex: number;
    isPlaying: boolean;
    setIsPlaying: Dispatch<SetStateAction<boolean>>;
    setPlaybackIndex: Dispatch<SetStateAction<number>>;
}

export function IncidentBlackboxReplayCard({
    incident,
    incidentCode,
    blackboxEntries,
    safeIndex,
    isPlaying,
    setIsPlaying,
    setPlaybackIndex,
}: IncidentBlackboxReplayCardProps) {
    const t = useTranslations("emergency");
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    const frameCount = blackboxEntries.length;
    const currentFrame = blackboxEntries[safeIndex] ?? null;

    useEffect(() => {
        if (!isPlaying || frameCount <= 1) return;
        const intervalMs = Math.max(150, Math.round(1000 / playbackSpeed));
        const timer = setInterval(() => {
            setPlaybackIndex((prev) => {
                if (prev >= frameCount - 1) {
                    setIsPlaying(false);
                    return prev;
                }
                return prev + 1;
            });
        }, intervalMs);
        return () => clearInterval(timer);
    }, [isPlaying, playbackSpeed, frameCount, setIsPlaying, setPlaybackIndex]);

    const hasCoordinates =
        (typeof incident.latitude === "number" && typeof incident.longitude === "number") ||
        blackboxEntries.some(
            (e) => typeof e.latitude === "number" && typeof e.longitude === "number"
        );

    return (
        <>
            <ChamferCard size="lg" className="w-full">
                <div className="p-5 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                            {t("detail.replayHeading")}
                        </span>
                        {frameCount > 0 && (
                            <span className="text-xs font-mono text-slate-500 tabular-nums">
                                {t("detail.frameProgress", {
                                    current: safeIndex + 1,
                                    total: frameCount,
                                })}
                            </span>
                        )}
                    </div>

                    {hasCoordinates ? (
                        <div className="h-[420px] w-full">
                            <TacticalMapContainer initialLayerType="satellite-hybrid">
                                <IncidentReplayLayer
                                    incidentLat={incident.latitude}
                                    incidentLng={incident.longitude}
                                    incidentAlt={incident.altitude}
                                    incidentLabel={incidentCode}
                                    blackboxEntries={blackboxEntries}
                                    playbackIndex={safeIndex}
                                />
                            </TacticalMapContainer>
                        </div>
                    ) : (
                        <EmptyState
                            compact
                            icon={MapPin}
                            title={t("detail.noCoordsTitle")}
                            description={t("detail.noCoordsDesc")}
                        />
                    )}

                    {frameCount > 0 && (
                        <div className="flex flex-col gap-3 pt-1">
                            <div className="flex items-center gap-3">
                                <input
                                    type="range"
                                    min={0}
                                    max={Math.max(0, frameCount - 1)}
                                    value={safeIndex}
                                    onChange={(e) => {
                                        setIsPlaying(false);
                                        setPlaybackIndex(Number(e.target.value));
                                    }}
                                    aria-label={t("detail.timelineAria")}
                                    className="flex-1 accent-slate-800 cursor-pointer"
                                />
                                <span className="text-xs font-mono text-slate-600 tabular-nums shrink-0">
                                    {currentFrame ? formatTime(currentFrame.timestamp) : "—"}
                                </span>
                            </div>

                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <ChamferButton
                                        variant="outline"
                                        size="xs"
                                        onClick={() => {
                                            setIsPlaying(false);
                                            setPlaybackIndex(0);
                                        }}
                                        title={t("detail.jumpStart")}
                                        aria-label={t("detail.jumpStart")}
                                    >
                                        <SkipBack className="w-3.5 h-3.5" />
                                    </ChamferButton>
                                    <ChamferButton
                                        variant="dark"
                                        size="xs"
                                        onClick={() => {
                                            if (safeIndex >= frameCount - 1) {
                                                setPlaybackIndex(0);
                                            }
                                            setIsPlaying((prev) => !prev);
                                        }}
                                    >
                                        {isPlaying ? (
                                            <>
                                                <Pause className="w-3.5 h-3.5" />
                                                <span>{t("detail.pause")}</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-3.5 h-3.5" />
                                                <span>{t("detail.replay")}</span>
                                            </>
                                        )}
                                    </ChamferButton>
                                    <ChamferButton
                                        variant="outline"
                                        size="xs"
                                        onClick={() => {
                                            setIsPlaying(false);
                                            setPlaybackIndex(Math.max(0, frameCount - 1));
                                        }}
                                        title={t("detail.jumpEnd")}
                                        aria-label={t("detail.jumpEnd")}
                                    >
                                        <SkipForward className="w-3.5 h-3.5" />
                                    </ChamferButton>
                                </div>

                                <div className="w-24">
                                    <CustomSelect
                                        id="replay-speed"
                                        value={String(playbackSpeed)}
                                        onValueChange={(v) => setPlaybackSpeed(Number(v))}
                                        options={PLAYBACK_SPEED_OPTIONS}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ChamferCard>

            {currentFrame && (
                <KpiStrip
                    items={[
                        {
                            id: "frame-battery",
                            label: t("detail.frameBattery"),
                            value:
                                currentFrame.batteryLevel != null
                                    ? `${Math.round(currentFrame.batteryLevel)}%`
                                    : "—",
                            icon: Battery,
                        },
                        {
                            id: "frame-signal",
                            label: t("detail.frameSignal"),
                            value:
                                currentFrame.signalStrength != null
                                    ? `${Math.round(currentFrame.signalStrength)}%`
                                    : "—",
                            icon: Wifi,
                        },
                        {
                            id: "frame-altitude",
                            label: t("detail.frameAltitude"),
                            value:
                                currentFrame.altitudeMsl != null
                                    ? `${Math.round(currentFrame.altitudeMsl)}m`
                                    : "—",
                            icon: Navigation,
                        },
                        {
                            id: "frame-speed",
                            label: t("detail.frameSpeed"),
                            value: formatSpeed(currentFrame.groundSpeed),
                            icon: Gauge,
                        },
                    ]}
                />
            )}
        </>
    );
}
