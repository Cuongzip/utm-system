"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
    ArrowLeft,
    ArrowUpRight,
    FileSearch,
    FileText,
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Maximize,
    Radio,
    Compass,
    BatteryCharging,
    Gauge,
    Satellite,
    ShieldCheck,
    Siren,
    AlertOctagon,
} from "lucide-react";
import {
    SplitMapLayout,
    ChamferCard,
    ChamferButton,
    StatusBadge,
    EmptyState,
} from "@/components/ui";
import {
    TacticalMapContainer,
    AirspaceLayer,
    FlightsLayer,
    HubsLayer,
    LiveTelemetryLayer,
    AdsbLayer,
    AltitudeProfile,
    type LiveAltitudeTracePoint,
} from "@/components/map";
import { PreFlightBriefingModal } from "./PreFlightBriefingModal";
import { FlightDeckMapOverlay } from "./FlightDeckMapOverlay";
import {
    buildFlightFitBoundsPoints,
    buildRouteDistanceNodes,
    computeLiveAltitudeProgress,
    getCardinalDirectionLabel,
    projectAlongRouteDistanceM,
    summarizeCommandParams,
} from "./routeProgressUtils";
import {
    getRecordTimestampMs,
    useAdsbAircraft,
    useAirspaceAll,
    useConflictsAll,
    useEmergencyIncidents,
    useFlightCommands,
    useFlightConformance,
    useFlightDeckTelemetry,
    type PlaybackSpeed,
} from "@/hooks";
import { translateStatusLabel, type AppLocale } from "@/i18n";
import { cn } from "@/lib";
import {
    calculateDistance,
    formatAltitude,
    formatCoordinates,
    formatDistance,
    formatTime,
    localizeAlertTypeTitle,
    localizeResponseAction,
    localizeServerText,
} from "@/utils";
import {
    AIRSPACE_ZONE_STATUS,
    CONFORMANCE_STATUS,
    DEFAULT_COMMAND_STATUS,
    DEFAULT_FLIGHT_STATUS,
    DRONE_PHYSICS_DEFAULTS,
    EMERGENCY_TYPES,
    RESPONSE_ACTION,
    type Drone,
    type EmergencyType,
    type Flight,
    type Hub,
    type TelemetryRecord,
} from "@/types";

export interface FlightReplayDossierProps {
    flight: Flight;
    hubs: Hub[];
    drones: Drone[];
    onViewPlan: () => void;
}

type ReplaySidebarTab = "telemetry" | "audit";

const PLAYBACK_SPEEDS: readonly PlaybackSpeed[] = [0.5, 1, 2, 4, 8];

function formatDurationSeconds(sec: number): string {
    const total = Math.max(0, Math.round(sec));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
    if (m > 0) return `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
    return `${s}s`;
}

function formatClockOffset(sec: number): string {
    const total = Math.max(0, Math.floor(sec));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FlightReplayDossier({
    flight,
    hubs,
    drones,
    onViewPlan,
}: FlightReplayDossierProps) {
    const router = useRouter();
    const t = useTranslations("flights");
    const td = useTranslations("flights.deck");
    const tEmergency = useTranslations("emergency");
    const tConflicts = useTranslations("conflicts");
    const tCtrl = useTranslations("controlCenter");
    const tCommon = useTranslations("common");
    const locale = useLocale() as AppLocale;

    const [activeTab, setActiveTab] = useState<ReplaySidebarTab>("telemetry");
    const [followUav, setFollowUav] = useState(false);
    const [filterAirspace, setFilterAirspace] = useState(true);
    const [filterHubs, setFilterHubs] = useState(true);
    const [filterAdsb, setFilterAdsb] = useState(false);
    const [fitTrigger, setFitTrigger] = useState(0);
    const [briefingOpen, setBriefingOpen] = useState(false);

    const { data: airspaceZones = [] } = useAirspaceAll();
    const { data: adsbData } = useAdsbAircraft(filterAdsb, 15000);
    const { data: conformance } = useFlightConformance(flight.id, Boolean(flight.id));
    const { data: flightCommands = [] } = useFlightCommands(flight.id, Boolean(flight.id));
    const { data: conflictsData } = useConflictsAll({ flightId: flight.id });
    const { data: incidentsData } = useEmergencyIncidents(
        { droneId: flight.droneId ?? undefined, limit: 200 },
        Boolean(flight.id)
    );

    const {
        timeline,
        visibleTrail,
        activeRecord,
        isPlaying,
        playbackRate,
        setPlaybackRate,
        cursorIndex,
        totalFrames,
        seekTo,
        stepFrame,
        seekToTimestamp,
        togglePlay,
    } = useFlightDeckTelemetry(flight, true);

    const activeZones = useMemo(
        () => airspaceZones.filter((z) => z.status === AIRSPACE_ZONE_STATUS.ACTIVE),
        [airspaceZones]
    );

    const drone = useMemo(
        () => drones.find((d) => d.id === flight.droneId) ?? null,
        [drones, flight.droneId]
    );
    const departureHub = useMemo(
        () => hubs.find((h) => h.id === flight.departureHubId) ?? null,
        [hubs, flight.departureHubId]
    );
    const arrivalHub = useMemo(
        () => hubs.find((h) => h.id === flight.arrivalHubId) ?? null,
        [hubs, flight.arrivalHubId]
    );

    const relevantHubs = useMemo(() => {
        const ids = new Set<string>();
        if (flight.departureHubId) ids.add(flight.departureHubId);
        if (flight.arrivalHubId) ids.add(flight.arrivalHubId);
        return hubs.filter((h) => ids.has(h.id));
    }, [hubs, flight.departureHubId, flight.arrivalHubId]);

    const hubCodeMap = useMemo(() => {
        const m = new Map<string, string>();
        for (const h of hubs) {
            if (h.id) m.set(h.id, h.code || h.name || h.id);
        }
        return m;
    }, [hubs]);

    const flightCallsignMap = useMemo(() => {
        const m = new Map<string, string>(hubCodeMap);
        if (flight.id && flight.flightNumber) {
            m.set(flight.id, flight.flightNumber);
            m.set(flight.id.toLowerCase(), flight.flightNumber);
        }
        if (drone?.id && drone.registrationNumber) {
            m.set(drone.id, drone.registrationNumber);
            m.set(drone.id.toLowerCase(), drone.registrationNumber);
        }
        return m;
    }, [hubCodeMap, flight.id, flight.flightNumber, drone]);

    const humanizeAuditText = useCallback(
        (raw: string): string => {
            return localizeServerText(raw, locale, { entityMap: flightCallsignMap });
        },
        [flightCallsignMap, locale]
    );

    const telemetryMap = useMemo<Record<string, TelemetryRecord>>(() => {
        if (!activeRecord) return {};
        return { [flight.id]: activeRecord };
    }, [flight.id, activeRecord]);

    const fitBoundsPoints = useMemo(
        () => buildFlightFitBoundsPoints(flight, departureHub, arrivalHub, activeRecord),
        [flight, departureHub, arrivalHub, activeRecord]
    );

    const routeDistanceNodes = useMemo(
        () => buildRouteDistanceNodes(flight, departureHub, arrivalHub),
        [flight, departureHub, arrivalHub]
    );

    const fullAltitudeTrace = useMemo<LiveAltitudeTracePoint[]>(() => {
        if (timeline.length < 2 || routeDistanceNodes.length === 0) return [];
        return timeline
            .filter((s) => s.latitude != null && s.longitude != null && s.altitude != null)
            .map((s) => ({
                distanceM: projectAlongRouteDistanceM(
                    s.latitude!,
                    s.longitude!,
                    routeDistanceNodes
                ),
                altitudeM: s.altitude!,
            }));
    }, [timeline, routeDistanceNodes]);

    const liveAltitudeProgress = useMemo(
        () =>
            computeLiveAltitudeProgress(
                activeRecord,
                timeline,
                visibleTrail,
                routeDistanceNodes,
                true
            ),
        [activeRecord, timeline, visibleTrail, routeDistanceNodes]
    );

    const handleSeekByDistance = useCallback(
        (targetDistanceM: number) => {
            if (timeline.length === 0 || routeDistanceNodes.length === 0) return;
            let bestIdx = 0;
            let bestDiff = Number.POSITIVE_INFINITY;
            for (let i = 0; i < timeline.length; i++) {
                const rec = timeline[i];
                if (rec.latitude == null || rec.longitude == null) continue;
                const d = projectAlongRouteDistanceM(
                    rec.latitude,
                    rec.longitude,
                    routeDistanceNodes
                );
                const diff = Math.abs(d - targetDistanceM);
                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestIdx = i;
                }
            }
            seekTo(bestIdx);
        },
        [timeline, routeDistanceNodes, seekTo]
    );

    const debriefMetrics = useMemo(() => {
        let trackDistM = 0;
        let peakAltM: number | null = null;
        let maxSpeedMs: number | null = null;
        let startSoc: number | null = null;
        let endSoc: number | null = null;

        for (let i = 0; i < timeline.length; i++) {
            const r = timeline[i];
            if (i > 0) {
                const prev = timeline[i - 1];
                if (
                    prev.latitude != null &&
                    prev.longitude != null &&
                    r.latitude != null &&
                    r.longitude != null
                ) {
                    trackDistM += calculateDistance(
                        prev.latitude,
                        prev.longitude,
                        r.latitude,
                        r.longitude
                    );
                }
            }
            if (r.altitude != null) {
                peakAltM = peakAltM == null ? r.altitude : Math.max(peakAltM, r.altitude);
            }
            if (r.speed != null) {
                maxSpeedMs = maxSpeedMs == null ? r.speed : Math.max(maxSpeedMs, r.speed);
            }
            if (r.batteryPercentage != null) {
                if (startSoc == null) startSoc = r.batteryPercentage;
                endSoc = r.batteryPercentage;
            }
        }

        const firstTs = timeline.length > 0 ? getRecordTimestampMs(timeline[0]) : 0;
        const lastTs =
            timeline.length > 0 ? getRecordTimestampMs(timeline[timeline.length - 1]) : 0;
        const depTs = flight.actualDeparture ? Date.parse(flight.actualDeparture) : 0;
        const arrTs = flight.actualArrival ? Date.parse(flight.actualArrival) : 0;

        let durationSec: number | null = null;
        if (firstTs > 0 && lastTs > firstTs) {
            durationSec = (lastTs - firstTs) / 1000;
        } else if (depTs > 0 && arrTs > depTs) {
            durationSec = (arrTs - depTs) / 1000;
        }

        const currentTs = activeRecord ? getRecordTimestampMs(activeRecord) : 0;
        const elapsedSec = firstTs > 0 && currentTs >= firstTs ? (currentTs - firstTs) / 1000 : 0;

        return {
            firstTs,
            lastTs,
            durationSec,
            elapsedSec,
            trackDistM: trackDistM > 1 ? trackDistM : null,
            peakAltM,
            maxSpeedKmh: maxSpeedMs != null ? Math.round(maxSpeedMs * 3.6) : null,
            startSoc,
            endSoc,
        };
    }, [timeline, activeRecord, flight.actualDeparture, flight.actualArrival]);

    const sortedCommands = useMemo(() => {
        return [...flightCommands].sort((a, b) => {
            const tA = Date.parse(a.issuedAt || a.createdOn || "") || 0;
            const tB = Date.parse(b.issuedAt || b.createdOn || "") || 0;
            return tB - tA;
        });
    }, [flightCommands]);

    const recordedConflicts = useMemo(() => {
        const list = conflictsData ?? [];
        return list.filter(
            (c) => c.primaryFlightId === flight.id || c.secondaryFlightId === flight.id
        );
    }, [conflictsData, flight.id]);

    const recordedIncidents = useMemo(() => {
        const list = incidentsData?.data ?? [];
        return list.filter((inc) => inc.flightId === flight.id);
    }, [incidentsData, flight.id]);

    const timelineMarkers = useMemo(() => {
        const { firstTs, lastTs } = debriefMetrics;
        if (firstTs <= 0 || lastTs <= firstTs || timeline.length < 2) return [];
        const span = lastTs - firstTs;
        const markers: Array<{ id: string; ratio: number; kind: "cmd" | "hazard"; label: string }> =
            [];

        for (const cmd of sortedCommands) {
            const ts = Date.parse(cmd.issuedAt || cmd.createdOn || "");
            if (!Number.isNaN(ts) && ts >= firstTs && ts <= lastTs) {
                markers.push({
                    id: `cmd-${cmd.id}`,
                    ratio: (ts - firstTs) / span,
                    kind: "cmd",
                    label: localizeResponseAction(cmd.commandType || "CMD", locale, true),
                });
            }
        }
        for (const inc of recordedIncidents) {
            const ts = Date.parse(inc.detectedAt || inc.createdOn || "");
            if (!Number.isNaN(ts) && ts >= firstTs && ts <= lastTs) {
                const incLabel =
                    inc.emergencyType &&
                    (EMERGENCY_TYPES as readonly string[]).includes(inc.emergencyType)
                        ? tEmergency(`types.${inc.emergencyType as EmergencyType}`).toUpperCase()
                        : localizeAlertTypeTitle(inc.emergencyType || "INCIDENT", locale);
                markers.push({
                    id: `inc-${inc.id}`,
                    ratio: (ts - firstTs) / span,
                    kind: "hazard",
                    label: incLabel,
                });
            }
        }
        for (const c of recordedConflicts) {
            const ts = Date.parse(c.detectedAt || c.createdOn || "");
            if (!Number.isNaN(ts) && ts >= firstTs && ts <= lastTs) {
                const cnfLabel =
                    c.conflictType && tConflicts.has(`types.${c.conflictType}`)
                        ? tConflicts(`types.${c.conflictType}`)
                        : localizeAlertTypeTitle(c.conflictType || "CONFLICT", locale);
                markers.push({
                    id: `cnf-${c.id}`,
                    ratio: (ts - firstTs) / span,
                    kind: "hazard",
                    label: cnfLabel,
                });
            }
        }
        return markers;
    }, [
        debriefMetrics,
        timeline.length,
        sortedCommands,
        recordedIncidents,
        recordedConflicts,
        locale,
        tEmergency,
        tConflicts,
    ]);

    const auditBadgeCount = recordedConflicts.length + recordedIncidents.length;
    const flightStatus = flight.status ?? DEFAULT_FLIGHT_STATUS;
    const conformanceStatus =
        conformance?.status ?? flight.conformanceStatus ?? CONFORMANCE_STATUS.UNKNOWN;
    const xteM = conformance?.crossTrackErrorM ?? 0;
    const corridorM = conformance?.corridorRadiusM ?? 15;
    const vertErrM = conformance?.verticalErrorM ?? 0;
    const vertBufM = conformance?.altitudeBufferM ?? 10;

    const altMsl = activeRecord?.altitude ?? null;
    const altAgl = activeRecord?.altitudeAgl ?? altMsl;
    const speedMs = activeRecord?.speed ?? null;
    const speedKmh = speedMs != null ? Math.round(speedMs * 3.6) : null;
    const vertSpeed = activeRecord?.verticalSpeed ?? null;
    const heading = activeRecord?.heading != null ? Math.round(activeRecord.heading) : null;
    const pitch = activeRecord?.pitch ?? null;
    const roll = activeRecord?.roll ?? null;
    const batteryPct = activeRecord?.batteryPercentage ?? null;
    const batteryVoltage = activeRecord?.batteryVoltage ?? null;
    const batteryTemp = activeRecord?.batteryTemperature ?? null;
    const powerDrawW =
        activeRecord?.batteryDischargeRate ??
        (speedMs != null && speedMs > 1
            ? (drone?.cruisePowerW ?? DRONE_PHYSICS_DEFAULTS.cruisePowerW)
            : null);

    const modeDisplay = activeRecord?.flightMode
        ? activeRecord.flightMode.replace(/_/g, " ").toUpperCase()
        : (translateStatusLabel(flightStatus, locale) ?? flightStatus.toUpperCase());

    const depCode = departureHub?.code || departureHub?.name || "—";
    const arrCode = arrivalHub?.code || arrivalHub?.name || "—";
    const fullRouteTooltip = `${departureHub?.name || depCode} → ${arrivalHub?.name || arrCode}`;

    return (
        <>
            <SplitMapLayout
                title={td("replayTitle", { flight: flight.flightNumber || flight.id })}
                badges={
                    <div className="flex items-center gap-2">
                        <StatusBadge status={flightStatus} showDot />
                        {drone?.registrationNumber && (
                            <span className="px-2 py-0.5 rounded border border-slate-200 bg-slate-100 text-[11px] font-mono font-semibold text-slate-700">
                                {drone.registrationNumber}
                            </span>
                        )}
                    </div>
                }
                headerActions={
                    <div className="flex flex-wrap items-center gap-2">
                        <ChamferButton variant="outline" size="sm" clip="xs" onClick={onViewPlan}>
                            <FileText className="w-3.5 h-3.5 text-current" />
                            <span>{td("viewOriginalPlan")}</span>
                        </ChamferButton>

                        <ChamferButton
                            variant="outline"
                            size="sm"
                            clip="xs"
                            onClick={() => setBriefingOpen(true)}
                        >
                            <FileSearch className="w-3.5 h-3.5 text-current" />
                            <span>{t("editor.briefing")}</span>
                        </ChamferButton>

                        <ChamferButton
                            variant="outline"
                            size="sm"
                            clip="xs"
                            onClick={() => router.push("/dashboard/flights")}
                        >
                            <ArrowLeft className="w-3.5 h-3.5 text-current" />
                            <span>{tCommon("back")}</span>
                        </ChamferButton>
                    </div>
                }
                mapContent={
                    <div className="flex flex-col h-full min-h-0">
                        <TacticalMapContainer
                            initialLayerType="satellite-hybrid"
                            className="w-full flex-1 min-h-0"
                            header={
                                <div className="px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white z-10">
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status="standby" label={td("replayBadge")} />
                                        <button
                                            type="button"
                                            aria-pressed={followUav}
                                            onClick={() => setFollowUav((prev) => !prev)}
                                            className={cn(
                                                "inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                                followUav
                                                    ? "bg-slate-800 text-white"
                                                    : "border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                                            )}
                                        >
                                            <Radio className="w-3 h-3" />
                                            <span>{td("followUav")}</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFollowUav(false);
                                                setFitTrigger((n) => n + 1);
                                            }}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-mono font-semibold text-slate-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                        >
                                            <Maximize className="w-3 h-3" />
                                            <span>{td("fitRoute")}</span>
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                            type="button"
                                            aria-pressed={filterAirspace}
                                            onClick={() => setFilterAirspace((p) => !p)}
                                            className={cn(
                                                "px-2.5 py-1 text-xs font-mono font-semibold rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                                filterAirspace
                                                    ? "bg-slate-800 text-white"
                                                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                                            )}
                                        >
                                            {tCtrl("layerAirspace")}
                                        </button>
                                        <button
                                            type="button"
                                            aria-pressed={filterHubs}
                                            onClick={() => setFilterHubs((p) => !p)}
                                            className={cn(
                                                "px-2.5 py-1 text-xs font-mono font-semibold rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                                filterHubs
                                                    ? "bg-slate-800 text-white"
                                                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                                            )}
                                        >
                                            {tCtrl("layerHubs")}
                                        </button>
                                        <button
                                            type="button"
                                            aria-pressed={filterAdsb}
                                            onClick={() => setFilterAdsb((p) => !p)}
                                            className={cn(
                                                "px-2.5 py-1 text-xs font-mono font-semibold rounded transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                                filterAdsb
                                                    ? "bg-slate-800 text-white"
                                                    : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                                            )}
                                        >
                                            {tCtrl("layerAdsb")}
                                        </button>
                                    </div>
                                </div>
                            }
                            footer={
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
                                        onSeekDistance={
                                            totalFrames > 1 ? handleSeekByDistance : undefined
                                        }
                                    />

                                    {totalFrames > 1 ? (
                                        <div className="px-3.5 py-2 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center gap-2.5 text-xs font-mono">
                                            <div className="inline-flex items-center gap-1 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => stepFrame(-1)}
                                                    disabled={cursorIndex <= 0}
                                                    title={td("stepBack")}
                                                    aria-label={td("stepBack")}
                                                    className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-100 inline-flex items-center justify-center text-slate-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                                >
                                                    <SkipBack className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={togglePlay}
                                                    aria-label={
                                                        isPlaying
                                                            ? td("pauseReplay")
                                                            : td("playReplay")
                                                    }
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
                                                    onClick={() => stepFrame(1)}
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
                                                            m.kind === "hazard"
                                                                ? "bg-red-500"
                                                                : "bg-amber-500"
                                                        )}
                                                    />
                                                ))}
                                                <input
                                                    type="range"
                                                    min={0}
                                                    max={Math.max(0, totalFrames - 1)}
                                                    value={cursorIndex}
                                                    onChange={(e) =>
                                                        seekTo(Number.parseInt(e.target.value, 10))
                                                    }
                                                    aria-label={td("timelineScrubberAria")}
                                                    className="w-full accent-slate-900 cursor-pointer"
                                                />
                                            </div>

                                            <span className="text-[11px] text-slate-700 tabular-nums shrink-0 whitespace-nowrap">
                                                {debriefMetrics.durationSec != null
                                                    ? `+${formatClockOffset(debriefMetrics.elapsedSec)} / ${formatClockOffset(debriefMetrics.durationSec)} · `
                                                    : ""}
                                                {activeRecord?.timestamp
                                                    ? formatTime(activeRecord.timestamp)
                                                    : "--:--:--"}{" "}
                                                <span className="text-slate-400">
                                                    ({cursorIndex + 1}/{totalFrames})
                                                </span>
                                            </span>

                                            <div className="inline-flex items-center rounded border border-slate-200 bg-white p-0.5 shrink-0">
                                                {PLAYBACK_SPEEDS.map((spd) => (
                                                    <button
                                                        key={spd}
                                                        type="button"
                                                        onClick={() => setPlaybackRate(spd)}
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
                            }
                        >
                            {filterAirspace && <AirspaceLayer zones={activeZones} />}
                            <FlightsLayer
                                flights={[flight]}
                                selectedFlightId={flight.id}
                                showRouteLabels="none"
                                hubs={hubs}
                            />
                            <LiveTelemetryLayer
                                flights={activeRecord ? [flight] : []}
                                telemetryMap={telemetryMap}
                                selectedFlightId={flight.id}
                                autoFollowSelected={false}
                                autoFitInitialBounds={false}
                            />
                            {filterHubs && <HubsLayer hubs={relevantHubs} autoFitBounds={false} />}
                            {filterAdsb && <AdsbLayer aircraft={adsbData?.aircraft ?? []} />}
                            <FlightDeckMapOverlay
                                flightId={flight.id}
                                visibleTrail={visibleTrail}
                                fullTrail={timeline}
                                isReplay={true}
                                followUav={followUav}
                                fitBoundsPoints={fitBoundsPoints}
                                fitTrigger={fitTrigger}
                            />
                        </TacticalMapContainer>
                    </div>
                }
                sidebarContent={
                    <ChamferCard size="lg" className="w-full h-full min-h-0">
                        <div className="flex flex-col h-full min-h-0 bg-white overflow-hidden">
                            <div
                                role="tablist"
                                className="grid grid-cols-2 border-b border-slate-200 bg-white text-xs shrink-0"
                            >
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === "telemetry"}
                                    onClick={() => setActiveTab("telemetry")}
                                    className={cn(
                                        "py-3 px-2 text-center border-b-2 font-bold transition-colors cursor-pointer truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400",
                                        activeTab === "telemetry"
                                            ? "border-slate-800 text-slate-900 bg-slate-50/70"
                                            : "border-transparent text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    {td("replayTabTelemetry")}
                                </button>
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={activeTab === "audit"}
                                    onClick={() => setActiveTab("audit")}
                                    className={cn(
                                        "py-3 px-2 text-center border-b-2 font-bold transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400",
                                        activeTab === "audit"
                                            ? "border-slate-800 text-slate-900 bg-slate-50/70"
                                            : "border-transparent text-slate-500 hover:text-slate-800"
                                    )}
                                >
                                    <span className="truncate">{td("replayTabAudit")}</span>
                                    {(sortedCommands.length > 0 || auditBadgeCount > 0) && (
                                        <span
                                            className={cn(
                                                "px-1.5 py-0.2 rounded-full text-white text-[10px] font-mono leading-tight shrink-0",
                                                auditBadgeCount > 0 ? "bg-red-600" : "bg-slate-800"
                                            )}
                                        >
                                            {sortedCommands.length + auditBadgeCount}
                                        </span>
                                    )}
                                </button>
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto utm-scroll p-3.5 space-y-3.5 text-xs">
                                {activeTab === "telemetry" ? (
                                    <>
                                        <section className="rounded-md border border-slate-200 bg-white overflow-hidden">
                                            <div className="px-3 py-2 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
                                                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-800 truncate">
                                                    {td("flightSummaryTitle")}
                                                </span>
                                                <StatusBadge status={conformanceStatus} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-px bg-slate-200 font-mono text-[11px]">
                                                <div
                                                    className="bg-white px-3 py-2"
                                                    title={fullRouteTooltip}
                                                >
                                                    <div className="text-[10px] text-slate-400 uppercase">
                                                        {td("debriefRoute")}
                                                    </div>
                                                    <div className="font-bold text-slate-900 truncate mt-0.5">
                                                        {depCode} → {arrCode}
                                                    </div>
                                                </div>

                                                <div className="bg-white px-3 py-2">
                                                    <div className="text-[10px] text-slate-400 uppercase">
                                                        {td("debriefDuration")}
                                                    </div>
                                                    <div className="font-bold text-slate-900 tabular-nums mt-0.5">
                                                        {debriefMetrics.durationSec != null
                                                            ? formatDurationSeconds(
                                                                  debriefMetrics.durationSec
                                                              )
                                                            : "—"}
                                                    </div>
                                                </div>

                                                <div className="bg-white px-3 py-2">
                                                    <div className="text-[10px] text-slate-400 uppercase">
                                                        {td("debriefDistance")}
                                                    </div>
                                                    <div className="font-bold text-slate-900 tabular-nums mt-0.5">
                                                        {debriefMetrics.trackDistM != null
                                                            ? formatDistance(
                                                                  debriefMetrics.trackDistM
                                                              )
                                                            : "—"}
                                                    </div>
                                                </div>

                                                <div className="bg-white px-3 py-2">
                                                    <div className="text-[10px] text-slate-400 uppercase">
                                                        {td("debriefPeakAltSpeed")}
                                                    </div>
                                                    <div className="font-bold text-slate-900 tabular-nums truncate mt-0.5">
                                                        {debriefMetrics.peakAltM != null
                                                            ? `${Math.round(debriefMetrics.peakAltM)}m`
                                                            : "—"}
                                                        {" · "}
                                                        {debriefMetrics.maxSpeedKmh != null
                                                            ? `${debriefMetrics.maxSpeedKmh} km/h`
                                                            : "—"}
                                                    </div>
                                                </div>

                                                <div className="bg-white px-3 py-2">
                                                    <div className="text-[10px] text-slate-400 uppercase">
                                                        {td("debriefBatteryDelta")}
                                                    </div>
                                                    <div className="font-bold text-slate-900 tabular-nums truncate mt-0.5">
                                                        {debriefMetrics.startSoc != null &&
                                                        debriefMetrics.endSoc != null
                                                            ? `${Math.round(debriefMetrics.startSoc)}% → ${Math.round(debriefMetrics.endSoc)}%`
                                                            : "—"}
                                                    </div>
                                                </div>

                                                <div className="bg-white px-3 py-2">
                                                    <div className="text-[10px] text-slate-400 uppercase">
                                                        4D XTE / ΔAlt
                                                    </div>
                                                    <div className="font-bold text-slate-900 tabular-nums truncate mt-0.5">
                                                        {xteM.toFixed(1)}/{Math.round(corridorM)}m ·{" "}
                                                        {vertErrM.toFixed(1)}/{Math.round(vertBufM)}
                                                        m
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="space-y-2">
                                            <div className="flex items-center justify-between font-mono text-[11px]">
                                                <span className="font-bold uppercase tracking-wider text-slate-800">
                                                    {td("frameSnapshotTitle")}
                                                </span>
                                                <span className="text-slate-500 tabular-nums">
                                                    {activeRecord?.timestamp
                                                        ? formatTime(activeRecord.timestamp)
                                                        : "—"}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-md overflow-hidden">
                                                <div className="bg-white p-2.5 flex flex-col justify-between min-h-[76px]">
                                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap truncate">
                                                        {td("altShortLabel")}
                                                    </span>
                                                    <div>
                                                        <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                                                            {altMsl != null
                                                                ? formatAltitude(Math.round(altMsl))
                                                                : "—"}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-slate-400 tabular-nums truncate">
                                                            {altAgl != null
                                                                ? `AGL ${Math.round(altAgl)}m`
                                                                : td("planAlt", {
                                                                      alt: Math.round(
                                                                          flight.cruisingAltitudeM ??
                                                                              120
                                                                      ),
                                                                  })}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-2.5 flex flex-col justify-between min-h-[76px]">
                                                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap truncate">
                                                        {tCtrl("groundSpeed")}
                                                    </span>
                                                    <div>
                                                        <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                                                            {speedKmh != null
                                                                ? `${speedKmh} km/h`
                                                                : "—"}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                                                            {speedMs != null
                                                                ? `${speedMs.toFixed(1)} m/s`
                                                                : "—"}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-2.5 flex flex-col justify-between min-h-[76px]">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap truncate">
                                                            {td("verticalSpeed")}
                                                        </span>
                                                        <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                    </div>
                                                    <div>
                                                        <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                                                            {vertSpeed != null
                                                                ? `${vertSpeed > 0 ? "+" : ""}${vertSpeed.toFixed(1)} m/s`
                                                                : "—"}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-slate-500 truncate">
                                                            {modeDisplay}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-white p-2.5 flex flex-col justify-between min-h-[76px]">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 whitespace-nowrap truncate">
                                                            {td("headingShortLabel")}
                                                        </span>
                                                        <Compass
                                                            className="w-3.5 h-3.5 text-slate-400 shrink-0"
                                                            style={
                                                                heading != null
                                                                    ? {
                                                                          transform: `rotate(${heading}deg)`,
                                                                      }
                                                                    : undefined
                                                            }
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="font-mono text-lg font-bold text-slate-900 tabular-nums">
                                                            {heading != null
                                                                ? `${String(heading).padStart(3, "0")}° ${getCardinalDirectionLabel(heading)}`
                                                                : "—"}
                                                        </div>
                                                        <div className="text-[10px] font-mono text-slate-400 tabular-nums truncate">
                                                            {pitch != null || roll != null
                                                                ? `P ${pitch != null ? `${pitch.toFixed(1)}°` : "0°"} · R ${roll != null ? `${roll.toFixed(1)}°` : "0°"}`
                                                                : "P — · R —"}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="rounded-md border border-slate-200 bg-white overflow-hidden font-mono">
                                            <div className="px-3 py-1.5 border-b border-slate-200 bg-slate-50/80 flex items-center gap-1.5 text-[11px] font-bold uppercase text-slate-800">
                                                <BatteryCharging className="w-3.5 h-3.5 text-slate-500" />
                                                <span>{td("powerPropulsion")}</span>
                                            </div>
                                            <div className="grid grid-cols-4 divide-x divide-slate-200 text-center py-2">
                                                <div>
                                                    <div className="text-[9px] text-slate-400 uppercase">
                                                        {td("soc")}
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                                                        {batteryPct != null
                                                            ? `${Math.round(batteryPct)}%`
                                                            : "—"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-slate-400 uppercase">
                                                        {td("voltage")}
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                                                        {batteryVoltage != null
                                                            ? `${batteryVoltage.toFixed(1)}V`
                                                            : "—"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-slate-400 uppercase">
                                                        {td("temp")}
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                                                        {batteryTemp != null
                                                            ? `${batteryTemp.toFixed(0)}°C`
                                                            : "—"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-slate-400 uppercase">
                                                        {td("load")}
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                                                        {powerDrawW != null
                                                            ? `${Math.round(powerDrawW)}W`
                                                            : "—"}
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        <section className="rounded-md border border-slate-200 bg-white overflow-hidden font-mono text-[11px]">
                                            <div className="px-3 py-1.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
                                                <span className="inline-flex items-center gap-1.5 font-bold uppercase text-slate-800">
                                                    <Satellite className="w-3.5 h-3.5 text-slate-500" />
                                                    <span>{td("gnssSignalTitle")}</span>
                                                </span>
                                                <span className="text-slate-600 tabular-nums">
                                                    {activeRecord?.latitude != null &&
                                                    activeRecord?.longitude != null
                                                        ? formatCoordinates({
                                                              latitude: activeRecord.latitude,
                                                              longitude: activeRecord.longitude,
                                                          })
                                                        : "—"}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 divide-x divide-slate-200 text-center py-2">
                                                <div>
                                                    <div className="text-[9px] text-slate-400 uppercase">
                                                        RSSI
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                                                        {activeRecord?.signalStrength != null
                                                            ? `${Math.round(activeRecord.signalStrength)}%`
                                                            : "—"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-slate-400 uppercase">
                                                        GNSS SATS
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                                                        {activeRecord?.gpsSatellites ?? "—"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-[9px] text-slate-400 uppercase">
                                                        HDOP
                                                    </div>
                                                    <div className="text-xs font-bold text-slate-900 tabular-nums mt-0.5">
                                                        {activeRecord?.gpsHdop != null
                                                            ? activeRecord.gpsHdop.toFixed(1)
                                                            : "—"}
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    </>
                                ) : (
                                    <>
                                        <section className="rounded-md border border-slate-200 bg-white overflow-hidden">
                                            <div className="px-3 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-slate-800">
                                                    {td("flightCommandLog")}
                                                </span>
                                                <span className="font-mono text-[10px] text-slate-500">
                                                    {sortedCommands.length}
                                                </span>
                                            </div>

                                            {sortedCommands.length === 0 ? (
                                                <div className="px-3 py-5 text-center text-[11px] text-slate-400 font-mono">
                                                    {tCtrl("noRecentCommands")}
                                                </div>
                                            ) : (
                                                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto utm-scroll">
                                                    {sortedCommands.map((cmd) => {
                                                        const paramSummary = summarizeCommandParams(
                                                            cmd.parameters,
                                                            hubCodeMap
                                                        );
                                                        const cmdTs = cmd.issuedAt || cmd.createdOn;
                                                        const canSeek =
                                                            totalFrames > 1 && Boolean(cmdTs);
                                                        const ackMs =
                                                            cmd.issuedAt && cmd.acknowledgedAt
                                                                ? Math.max(
                                                                      0,
                                                                      Date.parse(
                                                                          cmd.acknowledgedAt
                                                                      ) - Date.parse(cmd.issuedAt)
                                                                  )
                                                                : null;
                                                        return (
                                                            <button
                                                                key={cmd.id}
                                                                type="button"
                                                                disabled={!canSeek}
                                                                onClick={() =>
                                                                    seekToTimestamp(cmdTs)
                                                                }
                                                                className={cn(
                                                                    "w-full text-left px-3 py-2 flex items-center justify-between gap-2 font-mono text-[11px] transition-colors",
                                                                    canSeek
                                                                        ? "hover:bg-slate-50 cursor-pointer focus-visible:outline-none focus-visible:bg-slate-50"
                                                                        : "cursor-default"
                                                                )}
                                                            >
                                                                <div className="min-w-0 flex-1">
                                                                    <div className="flex items-center gap-1.5 truncate">
                                                                        <span className="text-slate-500 tabular-nums shrink-0">
                                                                            {cmdTs
                                                                                ? formatTime(cmdTs)
                                                                                : "--:--:--"}
                                                                        </span>
                                                                        <span className="font-bold text-slate-900 uppercase">
                                                                            {localizeResponseAction(
                                                                                cmd.commandType,
                                                                                locale,
                                                                                true
                                                                            )}
                                                                        </span>
                                                                        {paramSummary && (
                                                                            <span className="text-slate-500 truncate">
                                                                                {paramSummary}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                                                        {ackMs != null && (
                                                                            <span>
                                                                                ACK {ackMs}ms
                                                                            </span>
                                                                        )}
                                                                        {canSeek && (
                                                                            <span className="inline-flex items-center gap-0.5 text-amber-700 font-semibold">
                                                                                <span>
                                                                                    {td(
                                                                                        "seekToEvent"
                                                                                    )}
                                                                                </span>
                                                                                <ArrowUpRight className="w-2.5 h-2.5" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <StatusBadge
                                                                    status={
                                                                        cmd.status ??
                                                                        DEFAULT_COMMAND_STATUS
                                                                    }
                                                                />
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </section>

                                        {recordedIncidents.length === 0 &&
                                        recordedConflicts.length === 0 ? (
                                            <EmptyState
                                                compact
                                                icon={ShieldCheck}
                                                title={td("safetyNominalTitle")}
                                                description={td("safetyNominalDesc")}
                                                className="py-8"
                                            />
                                        ) : (
                                            <div className="space-y-3">
                                                {recordedIncidents.length > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-slate-800">
                                                            <Siren className="w-3.5 h-3.5 text-red-600" />
                                                            <span>
                                                                {td("recordedIncidentsHeading", {
                                                                    count: recordedIncidents.length,
                                                                })}
                                                            </span>
                                                        </div>
                                                        {recordedIncidents.map((inc) => {
                                                            const incTs =
                                                                inc.detectedAt || inc.createdOn;
                                                            const canSeek =
                                                                totalFrames > 1 && Boolean(incTs);
                                                            return (
                                                                <button
                                                                    key={inc.id}
                                                                    type="button"
                                                                    disabled={!canSeek}
                                                                    onClick={() =>
                                                                        seekToTimestamp(incTs)
                                                                    }
                                                                    className={cn(
                                                                        "w-full text-left rounded-md border border-slate-200 bg-white p-3 space-y-1.5 transition-colors",
                                                                        canSeek
                                                                            ? "hover:bg-slate-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                                                            : "cursor-default"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="font-mono text-xs font-bold uppercase text-slate-900">
                                                                            {inc.emergencyType &&
                                                                            (
                                                                                EMERGENCY_TYPES as readonly string[]
                                                                            ).includes(
                                                                                inc.emergencyType
                                                                            )
                                                                                ? tEmergency(
                                                                                      `types.${inc.emergencyType as EmergencyType}`
                                                                                  )
                                                                                : localizeAlertTypeTitle(
                                                                                      inc.emergencyType ||
                                                                                          "INCIDENT",
                                                                                      locale
                                                                                  )}
                                                                        </span>
                                                                        <StatusBadge
                                                                            status={inc.severity}
                                                                        />
                                                                    </div>
                                                                    {inc.message && (
                                                                        <p className="text-xs text-slate-600 leading-relaxed">
                                                                            {humanizeAuditText(
                                                                                inc.message
                                                                            )}
                                                                        </p>
                                                                    )}
                                                                    <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-slate-500">
                                                                        <div className="flex items-center gap-2">
                                                                            {inc.responseAction &&
                                                                                inc.responseAction !==
                                                                                    RESPONSE_ACTION.NONE && (
                                                                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-slate-700">
                                                                                        {localizeResponseAction(
                                                                                            inc.responseAction,
                                                                                            locale,
                                                                                            true
                                                                                        )}
                                                                                    </span>
                                                                                )}
                                                                            {incTs && (
                                                                                <span className="tabular-nums">
                                                                                    {formatTime(
                                                                                        incTs
                                                                                    )}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        {canSeek && (
                                                                            <span className="inline-flex items-center gap-0.5 text-amber-700 font-semibold">
                                                                                <span>
                                                                                    {td(
                                                                                        "seekToEvent"
                                                                                    )}
                                                                                </span>
                                                                                <ArrowUpRight className="w-2.5 h-2.5" />
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}

                                                {recordedConflicts.length > 0 && (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase text-slate-800">
                                                            <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
                                                            <span>
                                                                {td("recordedConflictsHeading", {
                                                                    count: recordedConflicts.length,
                                                                })}
                                                            </span>
                                                        </div>
                                                        {recordedConflicts.map((c) => {
                                                            const cnfTs =
                                                                c.detectedAt || c.createdOn;
                                                            const canSeek =
                                                                totalFrames > 1 && Boolean(cnfTs);
                                                            return (
                                                                <button
                                                                    key={c.id}
                                                                    type="button"
                                                                    disabled={!canSeek}
                                                                    onClick={() =>
                                                                        seekToTimestamp(cnfTs)
                                                                    }
                                                                    className={cn(
                                                                        "w-full text-left rounded-md border border-slate-200 bg-white p-3 space-y-1.5 transition-colors",
                                                                        canSeek
                                                                            ? "hover:bg-slate-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                                                            : "cursor-default"
                                                                    )}
                                                                >
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <span className="font-mono text-xs font-bold uppercase text-slate-900">
                                                                            {c.conflictType &&
                                                                            tConflicts.has(
                                                                                `types.${c.conflictType}`
                                                                            )
                                                                                ? tConflicts(
                                                                                      `types.${c.conflictType}`
                                                                                  )
                                                                                : localizeAlertTypeTitle(
                                                                                      c.conflictType ??
                                                                                          "SEPARATION",
                                                                                      locale
                                                                                  )}
                                                                        </span>
                                                                        <StatusBadge
                                                                            status={
                                                                                c.severity ??
                                                                                "warning"
                                                                            }
                                                                        />
                                                                    </div>
                                                                    {c.description && (
                                                                        <p className="text-xs text-slate-600 leading-relaxed">
                                                                            {humanizeAuditText(
                                                                                c.description
                                                                            )}
                                                                        </p>
                                                                    )}
                                                                    {(cnfTs || canSeek) && (
                                                                        <div className="flex items-center justify-between gap-2 font-mono text-[10px] text-slate-500">
                                                                            <span className="tabular-nums">
                                                                                {cnfTs
                                                                                    ? formatTime(
                                                                                          cnfTs
                                                                                      )
                                                                                    : ""}
                                                                            </span>
                                                                            {canSeek && (
                                                                                <span className="inline-flex items-center gap-0.5 text-amber-700 font-semibold">
                                                                                    <span>
                                                                                        {td(
                                                                                            "seekToEvent"
                                                                                        )}
                                                                                    </span>
                                                                                    <ArrowUpRight className="w-2.5 h-2.5" />
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </ChamferCard>
                }
            />

            <PreFlightBriefingModal
                isOpen={briefingOpen}
                flightId={flight.id}
                flightNumber={flight.flightNumber}
                onClose={() => setBriefingOpen(false)}
            />
        </>
    );
}
