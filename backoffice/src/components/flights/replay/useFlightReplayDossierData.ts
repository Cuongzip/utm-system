"use client";

import { useMemo, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { LiveAltitudeTracePoint } from "@/components/map";
import {
    buildFlightFitBoundsPoints,
    buildRouteDistanceNodes,
    computeLiveAltitudeProgress,
    projectAlongRouteDistanceM,
} from "../routeProgressUtils";
import {
    getRecordTimestampMs,
    useAdsbAircraft,
    useAirspaceAll,
    useConflictsAll,
    useEmergencyIncidents,
    useFlightCommands,
    useFlightConformance,
    useFlightDeckTelemetry,
} from "@/hooks";
import type { AppLocale } from "@/i18n";
import {
    calculateDistance,
    localizeAlertTypeTitle,
    localizeResponseAction,
    localizeServerText,
} from "@/utils";
import {
    AIRSPACE_ZONE_STATUS,
    EMERGENCY_TYPES,
    type Drone,
    type EmergencyType,
    type Flight,
    type Hub,
    type TelemetryRecord,
} from "@/types";

export type ReplayEventWindowStatus = "in_window" | "pre_flight" | "post_flight" | "unknown";

export interface ReplayTimelineMarker {
    id: string;
    ratio: number;
    kind: "cmd" | "hazard";
    label: string;
}

export interface ReplayDebriefMetrics {
    firstTs: number;
    lastTs: number;
    durationSec: number | null;
    elapsedSec: number;
    trackDistM: number | null;
    peakAltM: number | null;
    maxSpeedKmh: number | null;
    startSoc: number | null;
    endSoc: number | null;
}

interface UseFlightReplayDossierDataParams {
    flight: Flight;
    hubs: Hub[];
    drones: Drone[];
    filterAdsb: boolean;
}

export function useFlightReplayDossierData({
    flight,
    hubs,
    drones,
    filterAdsb,
}: UseFlightReplayDossierDataParams) {
    const tEmergency = useTranslations("emergency");
    const tConflicts = useTranslations("conflicts");
    const locale = useLocale() as AppLocale;

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

    const singleFlightList = useMemo(() => [flight], [flight]);
    const hasActiveRecord = Boolean(activeRecord);
    const telemetryFlights = useMemo(
        () => (hasActiveRecord ? singleFlightList : []),
        [hasActiveRecord, singleFlightList]
    );

    const telemetryMap = useMemo<Record<string, TelemetryRecord>>(() => {
        if (!activeRecord) return {};
        return { [flight.id]: activeRecord };
    }, [flight.id, activeRecord]);

    const fitBoundsPoints = useMemo(
        () => buildFlightFitBoundsPoints(flight, departureHub, arrivalHub, timeline[0] ?? null),
        [flight, departureHub, arrivalHub, timeline]
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

    const debriefMetrics = useMemo<ReplayDebriefMetrics>(() => {
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

    const getEventWindowStatus = useCallback(
        (iso?: string | null): ReplayEventWindowStatus => {
            if (
                !iso ||
                debriefMetrics.firstTs <= 0 ||
                debriefMetrics.lastTs < debriefMetrics.firstTs
            ) {
                return "unknown";
            }
            const ts = Date.parse(iso);
            if (Number.isNaN(ts)) return "unknown";
            if (ts < debriefMetrics.firstTs - 5_000) return "pre_flight";
            if (ts > debriefMetrics.lastTs + 5_000) return "post_flight";
            return "in_window";
        },
        [debriefMetrics.firstTs, debriefMetrics.lastTs]
    );

    const timelineMarkers = useMemo<ReplayTimelineMarker[]>(() => {
        const { firstTs, lastTs } = debriefMetrics;
        if (firstTs <= 0 || lastTs <= firstTs || timeline.length < 2) return [];
        const span = lastTs - firstTs;
        const markers: ReplayTimelineMarker[] = [];

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

    return {
        adsbData,
        conformance,
        activeZones,
        drone,
        departureHub,
        arrivalHub,
        relevantHubs,
        hubCodeMap,
        humanizeAuditText,
        singleFlightList,
        telemetryFlights,
        telemetryMap,
        fitBoundsPoints,
        fullAltitudeTrace,
        liveAltitudeProgress,
        handleSeekByDistance,
        debriefMetrics,
        sortedCommands,
        recordedConflicts,
        recordedIncidents,
        getEventWindowStatus,
        timelineMarkers,
        auditBadgeCount,
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
    };
}
