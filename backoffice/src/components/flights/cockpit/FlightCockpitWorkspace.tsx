"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui";
import {
    TacticalMapContainer,
    AirspaceLayer,
    FlightsLayer,
    HubsLayer,
    LiveTelemetryLayer,
    AdsbLayer,
} from "@/components/map";
import { PreFlightBriefingModal } from "../PreFlightBriefingModal";
import { FlightDeckMapOverlay, type GotoDraftTarget } from "../FlightDeckMapOverlay";
import { useFlightLifecycleActions } from "../useFlightLifecycleActions";
import {
    buildFlightFitBoundsPoints,
    buildRouteDistanceNodes,
    computeLegEtaProgress,
} from "../routeProgressUtils";
import { CockpitTopBar } from "./CockpitTopBar";
import { CockpitTelemetryHud } from "./CockpitTelemetryHud";
import { CockpitCommandDock, type VectorPopoverType } from "./CockpitCommandDock";
import { CockpitSideDrawer } from "./CockpitSideDrawer";
import {
    QUERY_KEYS,
    useAdsbAircraft,
    useAirspaceAll,
    useFlightCommands,
    useFlightConformance,
    useFlightDeckTelemetry,
    usePermissions,
} from "@/hooks";
import { flightService } from "@/services/flightService";
import { isValidGeoPoint } from "@/utils";
import {
    AIRSPACE_ZONE_STATUS,
    FLIGHT_STATUS,
    IN_PROGRESS_COMMAND_STATUSES,
    type Drone,
    type Flight,
    type Hub,
    type TelemetryRecord,
} from "@/types";

interface FlightCockpitWorkspaceProps {
    flight: Flight;
    hubs: Hub[];
    drones: Drone[];
}

const EMPTY_FLIGHTS: Flight[] = [];

export function FlightCockpitWorkspace({ flight, hubs, drones }: FlightCockpitWorkspaceProps) {
    const t = useTranslations("flights");
    const td = useTranslations("flights.deck");
    const tMap = useTranslations("map");
    const queryClient = useQueryClient();
    const { canAuthorizeFlight } = usePermissions();

    const [followUav, setFollowUav] = useState(false);
    const [filterAirspace, setFilterAirspace] = useState(true);
    const [filterHubs, setFilterHubs] = useState(true);
    const [filterAdsb, setFilterAdsb] = useState(false);
    const [gotoPickMode, setGotoPickMode] = useState(false);
    const [gotoDraft, setGotoDraft] = useState<GotoDraftTarget | null>(null);
    const [activePopover, setActivePopover] = useState<VectorPopoverType>(null);
    const [fitTrigger, setFitTrigger] = useState(0);
    const [briefingOpen, setBriefingOpen] = useState(false);
    const [confirmAbortOpen, setConfirmAbortOpen] = useState(false);

    const { data: airspaceZones = [] } = useAirspaceAll();
    const { data: adsbData } = useAdsbAircraft(filterAdsb, 15000);
    const { data: conformance } = useFlightConformance(flight.id, Boolean(flight.id));
    const { data: flightCommands = [] } = useFlightCommands(flight.id, Boolean(flight.id));

    const { timeline, visibleTrail, activeRecord, isFresh } = useFlightDeckTelemetry(flight, true);

    const activeC2Target = useMemo<GotoDraftTarget | null>(() => {
        const latestCmd = flightCommands[0];
        if (!latestCmd || !latestCmd.commandType) return null;
        const cmdUpper = latestCmd.commandType.toUpperCase();
        if (cmdUpper !== "GOTO") return null;
        const cmdStatus = (latestCmd.status ?? "").toLowerCase();
        const isInProgress = IN_PROGRESS_COMMAND_STATUSES.includes(cmdStatus);
        const isHoldingDiverted =
            cmdStatus === "completed" && flight.status === FLIGHT_STATUS.DIVERTED;
        if (!isInProgress && !isHoldingDiverted) return null;

        const rawParams = latestCmd.parameters;
        if (!rawParams) return null;
        try {
            const parsed =
                typeof rawParams === "string"
                    ? (JSON.parse(rawParams) as Record<string, unknown>)
                    : (rawParams as Record<string, unknown>);
            if (typeof parsed.targetHubId === "string" && parsed.targetHubId.trim().length > 0) {
                return null;
            }
            const lat = Number(parsed.latitude ?? parsed.lat);
            const lng = Number(parsed.longitude ?? parsed.lon ?? parsed.lng);
            const alt = Number(parsed.altitude ?? parsed.alt ?? flight.cruisingAltitudeM ?? 80);
            if (isValidGeoPoint(lat, lng)) {
                return { latitude: lat, longitude: lng, altitude: Number.isFinite(alt) ? alt : 80 };
            }
        } catch {
            return null;
        }
        return null;
    }, [flightCommands, flight.status, flight.cruisingAltitudeM]);

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

    const singleFlightList = useMemo(() => [flight], [flight]);
    const hasActiveRecord = Boolean(activeRecord);
    const telemetryFlights = useMemo(
        () => (hasActiveRecord ? singleFlightList : EMPTY_FLIGHTS),
        [hasActiveRecord, singleFlightList]
    );

    const activeRecordRef = useRef<TelemetryRecord | null>(activeRecord);
    useEffect(() => {
        activeRecordRef.current = activeRecord;
    }, [activeRecord]);

    const telemetryMap = useMemo<Record<string, TelemetryRecord>>(() => {
        if (!activeRecord) return {};
        return { [flight.id]: activeRecord };
    }, [flight.id, activeRecord]);

    const firstValidSample = timeline[0] ?? null;
    const fitBoundsPoints = useMemo(() => {
        const routePts = buildFlightFitBoundsPoints(flight, departureHub, arrivalHub, null);
        if (routePts.length > 0) return routePts;
        return buildFlightFitBoundsPoints(flight, departureHub, arrivalHub, firstValidSample);
    }, [flight, departureHub, arrivalHub, firstValidSample]);

    const routeDistanceNodes = useMemo(
        () => buildRouteDistanceNodes(flight, departureHub, arrivalHub),
        [flight, departureHub, arrivalHub]
    );

    const legProgress = useMemo(
        () => computeLegEtaProgress(flight, departureHub, arrivalHub, activeRecord, drone),
        [flight, departureHub, arrivalHub, activeRecord, drone]
    );

    const flightLabel = flight.flightNumber || flight.id;
    const { authorizeFlightMutation, abortFlightMutation } = useFlightLifecycleActions({
        onAborted: () => setConfirmAbortOpen(false),
    });

    const evaluateMutation = useMutation({
        mutationFn: () => flightService.evaluateConformance(flight.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightConformance(flight.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightDetail(flight.id) });
            toast.success(td("conformanceRefreshed"));
        },
        meta: { defaultErrorMessage: td("conformanceRefreshFailed") },
    });

    const isLifecycleBusy = authorizeFlightMutation.isPending || abortFlightMutation.isPending;

    const handlePickGotoCoordinate = useCallback(
        (latitude: number, longitude: number) => {
            const currentAlt = activeRecordRef.current?.altitude;
            const defaultAlt = Math.round(
                currentAlt && currentAlt > 10 ? currentAlt : (flight.cruisingAltitudeM ?? 80)
            );
            setGotoDraft({ latitude, longitude, altitude: defaultAlt });
            setGotoPickMode(false);
            setActivePopover("goto");
        },
        [flight.cruisingAltitudeM]
    );

    const handleToggleFollowUav = useCallback(() => setFollowUav((p) => !p), []);
    const handleFitRoute = useCallback(() => {
        setFollowUav(false);
        setFitTrigger((n) => n + 1);
    }, []);
    const handleToggleAirspace = useCallback(() => setFilterAirspace((p) => !p), []);
    const handleToggleHubs = useCallback(() => setFilterHubs((p) => !p), []);
    const handleToggleAdsb = useCallback(() => setFilterAdsb((p) => !p), []);
    const handleOpenBriefing = useCallback(() => setBriefingOpen(true), []);
    const handleOpenAbort = useCallback(() => setConfirmAbortOpen(true), []);
    const { mutate: evaluateConformance } = evaluateMutation;
    const { mutate: authorizeMutate } = authorizeFlightMutation;
    const handleEvaluateConformance = useCallback(
        () => evaluateConformance(),
        [evaluateConformance]
    );
    const handleAuthorize = useCallback(
        () => authorizeMutate({ flight, label: flightLabel }),
        [authorizeMutate, flight, flightLabel]
    );

    return (
        <div className="flex-1 w-full h-full min-h-0 flex flex-col overflow-hidden bg-slate-950">
            <CockpitTopBar
                flight={flight}
                drone={drone}
                departureHub={departureHub}
                arrivalHub={arrivalHub}
                telemetry={activeRecord}
                isFresh={isFresh}
                conformance={conformance}
                isEvaluatingConformance={evaluateMutation.isPending}
                onEvaluateConformance={handleEvaluateConformance}
                legProgress={legProgress}
                followUav={followUav}
                onToggleFollowUav={handleToggleFollowUav}
                onFitRoute={handleFitRoute}
                filterAirspace={filterAirspace}
                onToggleAirspace={handleToggleAirspace}
                filterHubs={filterHubs}
                onToggleHubs={handleToggleHubs}
                filterAdsb={filterAdsb}
                adsbCount={adsbData?.aircraft?.length}
                onToggleAdsb={handleToggleAdsb}
                onOpenBriefing={handleOpenBriefing}
                canAuthorize={canAuthorizeFlight}
                isLifecycleBusy={isLifecycleBusy}
                onAuthorize={handleAuthorize}
                onAbort={handleOpenAbort}
            />

            <TacticalMapContainer
                initialLayerType="satellite-hybrid"
                frameless
                hideBottomHud
                className="flex-1 min-h-0"
                overlay={
                    <>
                        <CockpitTelemetryHud
                            flight={flight}
                            drone={drone}
                            departureHub={departureHub}
                            arrivalHub={arrivalHub}
                            telemetry={activeRecord}
                            conformance={conformance}
                            legProgress={legProgress}
                        />

                        <CockpitSideDrawer
                            flight={flight}
                            hubs={hubs}
                            departureHub={departureHub}
                            arrivalHub={arrivalHub}
                            airspaceZones={activeZones}
                            telemetry={activeRecord}
                            timeline={timeline}
                            visibleTrail={visibleTrail}
                            routeDistanceNodes={routeDistanceNodes}
                        />

                        <CockpitCommandDock
                            flight={flight}
                            drone={drone}
                            hubs={hubs}
                            telemetry={activeRecord}
                            gotoPickMode={gotoPickMode}
                            onToggleGotoPickMode={setGotoPickMode}
                            gotoDraft={gotoDraft}
                            onChangeGotoDraft={setGotoDraft}
                            activePopover={activePopover}
                            onChangeActivePopover={setActivePopover}
                        />

                        <div className="hidden xl:flex absolute bottom-3.5 left-3.5 z-20 items-center gap-2.5 px-2.5 py-1 rounded-md bg-slate-950/88 text-slate-100 border border-slate-700/80 backdrop-blur-md text-[10px] font-mono shadow-md pointer-events-none">
                            <span className="inline-flex items-center gap-1.5">
                                <span
                                    aria-hidden="true"
                                    className="w-4 border-t-2 border-dashed border-sky-400"
                                />
                                <span>{tMap("legendPlan")}</span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span
                                    aria-hidden="true"
                                    className="w-4 h-[2.5px] rounded-full bg-emerald-500"
                                />
                                <span>{tMap("legendLive")}</span>
                            </span>
                            {(gotoDraft || activeC2Target) && (
                                <span className="inline-flex items-center gap-1.5 text-amber-300">
                                    <span
                                        aria-hidden="true"
                                        className="w-4 border-t-2 border-dashed border-amber-400"
                                    />
                                    <span>{tMap("legendGoto")}</span>
                                </span>
                            )}
                        </div>
                    </>
                }
            >
                {filterAirspace && <AirspaceLayer zones={activeZones} />}
                {filterHubs && <HubsLayer hubs={relevantHubs} autoFitBounds={false} />}
                <FlightsLayer
                    flights={singleFlightList}
                    selectedFlightId={flight.id}
                    showRouteLabels="none"
                    routeStyle="reference"
                    hubs={hubs}
                />
                <LiveTelemetryLayer
                    flights={telemetryFlights}
                    telemetryMap={telemetryMap}
                    selectedFlightId={flight.id}
                    autoFollowSelected={false}
                    autoFitInitialBounds={false}
                    showTrail={false}
                />
                {filterAdsb && <AdsbLayer aircraft={adsbData?.aircraft ?? []} />}
                <FlightDeckMapOverlay
                    flightId={flight.id}
                    visibleTrail={visibleTrail}
                    isReplay={false}
                    followUav={followUav}
                    gotoPickMode={gotoPickMode}
                    gotoDraft={gotoDraft}
                    activeC2Target={activeC2Target}
                    onPickGotoCoordinate={handlePickGotoCoordinate}
                    fitBoundsPoints={fitBoundsPoints}
                    fitTrigger={fitTrigger}
                />
            </TacticalMapContainer>

            <PreFlightBriefingModal
                isOpen={briefingOpen}
                flightId={flight.id}
                flightNumber={flight.flightNumber}
                onClose={() => setBriefingOpen(false)}
            />

            <ConfirmDialog
                isOpen={confirmAbortOpen}
                onClose={() => setConfirmAbortOpen(false)}
                onConfirm={() => abortFlightMutation.mutate({ flight, label: flightLabel })}
                title={t("editor.abortActiveTitle")}
                description={t("editor.abortActiveDesc", { flight: flightLabel })}
                confirmText={t("abortDialog.confirm")}
                loading={abortFlightMutation.isPending}
            />
        </div>
    );
}
