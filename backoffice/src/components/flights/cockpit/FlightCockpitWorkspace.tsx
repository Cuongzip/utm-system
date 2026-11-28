"use client";

import { useState, useMemo } from "react";
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
import {
    buildFlightFitBoundsPoints,
    buildRouteDistanceNodes,
    computeLegEtaProgress,
    computeLiveAltitudeProgress,
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

export interface FlightCockpitWorkspaceProps {
    flight: Flight;
    hubs: Hub[];
    drones: Drone[];
}

export function FlightCockpitWorkspace({ flight, hubs, drones }: FlightCockpitWorkspaceProps) {
    const t = useTranslations("flights");
    const td = useTranslations("flights.deck");
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

    const liveAltitudeProgress = useMemo(
        () =>
            computeLiveAltitudeProgress(
                activeRecord,
                timeline,
                visibleTrail,
                routeDistanceNodes,
                false
            ),
        [activeRecord, timeline, visibleTrail, routeDistanceNodes]
    );

    const legProgress = useMemo(
        () => computeLegEtaProgress(flight, departureHub, arrivalHub, activeRecord, drone),
        [flight, departureHub, arrivalHub, activeRecord, drone]
    );

    const invalidateFlightQueries = () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightDetail(flight.id) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flights });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightsAll });
    };

    const flightLabel = flight.flightNumber || flight.id;

    const evaluateMutation = useMutation({
        mutationFn: () => flightService.evaluateConformance(flight.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightConformance(flight.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightDetail(flight.id) });
            toast.success(td("conformanceRefreshed"));
        },
        meta: { defaultErrorMessage: td("conformanceRefreshFailed") },
    });

    const authorizeMutation = useMutation({
        mutationFn: () => flightService.authorizeFlight(flight.id),
        onSuccess: () => {
            toast.success(t("toasts.authorized", { flight: flightLabel }));
            invalidateFlightQueries();
        },
        meta: { defaultErrorMessage: t("toasts.authorizeFailed") },
    });

    const abortMutation = useMutation({
        mutationFn: () => flightService.abortFlight(flight.id),
        onSuccess: () => {
            toast.success(t("toasts.aborted", { flight: flightLabel }));
            setConfirmAbortOpen(false);
            invalidateFlightQueries();
        },
        meta: { defaultErrorMessage: t("toasts.abortFailed") },
    });

    const isLifecycleBusy = authorizeMutation.isPending || abortMutation.isPending;

    const handlePickGotoCoordinate = (latitude: number, longitude: number) => {
        const defaultAlt = Math.round(
            activeRecord?.altitude && activeRecord.altitude > 10
                ? activeRecord.altitude
                : (flight.cruisingAltitudeM ?? 80)
        );
        setGotoDraft({ latitude, longitude, altitude: defaultAlt });
        setGotoPickMode(false);
        setActivePopover("goto");
    };

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
                onEvaluateConformance={() => evaluateMutation.mutate()}
                legProgress={legProgress}
                followUav={followUav}
                onToggleFollowUav={() => setFollowUav((p) => !p)}
                onFitRoute={() => {
                    setFollowUav(false);
                    setFitTrigger((n) => n + 1);
                }}
                filterAirspace={filterAirspace}
                onToggleAirspace={() => setFilterAirspace((p) => !p)}
                filterHubs={filterHubs}
                onToggleHubs={() => setFilterHubs((p) => !p)}
                filterAdsb={filterAdsb}
                adsbCount={adsbData?.aircraft?.length}
                onToggleAdsb={() => setFilterAdsb((p) => !p)}
                onOpenBriefing={() => setBriefingOpen(true)}
                canAuthorize={canAuthorizeFlight}
                isLifecycleBusy={isLifecycleBusy}
                onAuthorize={() => authorizeMutation.mutate()}
                onAbort={() => setConfirmAbortOpen(true)}
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
                            liveAltitudeProgress={liveAltitudeProgress}
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
                    </>
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
                onConfirm={() => abortMutation.mutate()}
                title={t("editor.abortActiveTitle")}
                description={t("editor.abortActiveDesc", { flight: flightLabel })}
                confirmText={t("abortDialog.confirm")}
                loading={abortMutation.isPending}
            />
        </div>
    );
}
