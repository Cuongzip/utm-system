"use client";

import { Suspense, useEffect, useState, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PageEditorSkeleton, PageHeader } from "@/components/ui";
import {
    LiveTelemetry,
    FlightControl,
    RecentCommands,
    ActiveAlerts,
} from "@/components/control-center";
import {
    AirspaceLayer,
    HubsLayer,
    LiveTelemetryLayer,
    FlightsLayer,
    AdsbLayer,
    TacticalMapContainer,
    useCesium,
    fitCameraToBounds,
} from "@/components/map";
import {
    isTelemetryFresh,
    useLiveTelemetry,
    useFlightsAll,
    useHubsAll,
    useDronesAll,
    useAirspaceAll,
    useAdsbAircraft,
} from "@/hooks";
import { cn } from "@/lib";
import { compareCreatedDesc } from "@/utils";
import {
    type Flight,
    type Hub,
    ACTIVE_FLIGHT_STATUSES,
    CONTROLLABLE_FLIGHT_STATUSES,
    AIRSPACE_ZONE_STATUS,
} from "@/types";

function PerspectiveResetHandler({ hubs, flights }: { hubs: Hub[]; flights: Flight[] }) {
    const { viewer, isLoaded } = useCesium();
    const hasInitialFitRef = useRef(false);

    useEffect(() => {
        if (!viewer || !isLoaded || hasInitialFitRef.current) return;

        const hubPoints = hubs
            .filter(
                (h) => h.location?.latitude !== undefined && h.location?.longitude !== undefined
            )
            .map((h) => ({ lat: h.location!.latitude, lng: h.location!.longitude }))
            .filter((pt) => pt.lat >= 8 && pt.lat <= 24 && pt.lng >= 100 && pt.lng <= 112);

        const flightPoints = flights
            .flatMap((f) => {
                const route = f.plannedRoute;
                if (
                    route &&
                    typeof route === "object" &&
                    "coordinates" in route &&
                    Array.isArray((route as { coordinates?: unknown }).coordinates)
                ) {
                    return (route as { coordinates: number[][] }).coordinates;
                }
                return [];
            })
            .filter((pt) => Array.isArray(pt) && pt.length >= 2 && !isNaN(pt[0]) && !isNaN(pt[1]))
            .map((pt) => ({ lng: Number(pt[0]), lat: Number(pt[1]) }))
            .filter((pt) => pt.lat >= 8 && pt.lat <= 24 && pt.lng >= 100 && pt.lng <= 112);

        const points = [...hubPoints, ...flightPoints];

        if (points.length > 0) {
            hasInitialFitRef.current = true;
            fitCameraToBounds(viewer, points, {
                animate: false,
                duration: 1.0,
                minHeight: 2500,
                paddingMultiplier: 1.4,
            });
        }
    }, [viewer, isLoaded, hubs, flights]);

    return null;
}

function ControlCenterContent() {
    const t = useTranslations("controlCenter");
    const searchParams = useSearchParams();
    const queryFlightId = searchParams.get("flightId");
    const { data: allFlights = [] } = useFlightsAll(3000);
    const { data: hubs = [] } = useHubsAll();
    const { data: drones = [] } = useDronesAll();
    const { data: airspaceZones = [] } = useAirspaceAll();
    const [rawSelectedFlightId, setSelectedFlightId] = useState<string | null>(queryFlightId);
    const [filterAirspace, setFilterAirspace] = useState(true);
    const [filterHubs, setFilterHubs] = useState(true);
    const [filterAdsb, setFilterAdsb] = useState(false);

    const { data: adsbData } = useAdsbAircraft(filterAdsb, 15000);

    const activeZones = useMemo(
        () => airspaceZones.filter((z) => z.status === AIRSPACE_ZONE_STATUS.ACTIVE),
        [airspaceZones]
    );

    const flights = useMemo(() => {
        return allFlights
            .filter((f) => f.status && CONTROLLABLE_FLIGHT_STATUSES.includes(f.status))
            .sort((a, b) => {
                const aAirborne = a.status && ACTIVE_FLIGHT_STATUSES.includes(a.status) ? 0 : 1;
                const bAirborne = b.status && ACTIVE_FLIGHT_STATUSES.includes(b.status) ? 0 : 1;
                if (aAirborne !== bAirborne) return aAirborne - bAirborne;
                return compareCreatedDesc(a, b);
            });
    }, [allFlights]);

    const relevantHubs = useMemo(() => {
        if (flights.length === 0) return [];
        const activeHubIds = new Set<string>();
        for (const f of flights) {
            if (f.departureHubId) activeHubIds.add(f.departureHubId);
            if (f.arrivalHubId) activeHubIds.add(f.arrivalHubId);
        }
        return hubs.filter((h) => activeHubIds.has(h.id));
    }, [flights, hubs]);

    const selectedFlightId = useMemo(() => {
        if (flights.length === 0) return null;
        return rawSelectedFlightId && flights.some((f) => f.id === rawSelectedFlightId)
            ? rawSelectedFlightId
            : flights[0].id;
    }, [flights, rawSelectedFlightId]);

    const { telemetryMap } = useLiveTelemetry(flights);

    const selectedFlight = flights.find((f) => f.id === selectedFlightId) ?? null;
    const isSelectedAirborne = Boolean(
        selectedFlight?.status && ACTIVE_FLIGHT_STATUSES.includes(selectedFlight.status)
    );
    const selectedTelemetry =
        selectedFlightId && isSelectedAirborne ? (telemetryMap[selectedFlightId] ?? null) : null;
    const hasFreshLink = isSelectedAirborne && isTelemetryFresh(selectedTelemetry);
    const airborneFlights = useMemo(
        () => flights.filter((f) => f.status && ACTIVE_FLIGHT_STATUSES.includes(f.status)),
        [flights]
    );

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-5 shrink-0">
            <PageHeader title={t("title")} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-8 h-[520px]">
                    <TacticalMapContainer
                        initialLayerType="satellite-hybrid"
                        className="w-full"
                        header={
                            <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-panel)] z-10">
                                <span className="text-xs font-bold font-mono tracking-wider text-[var(--color-text-primary)] uppercase">
                                    {t("operationsRadar")}
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <button
                                        type="button"
                                        aria-pressed={filterAirspace}
                                        onClick={() => setFilterAirspace((prev) => !prev)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                            filterAirspace
                                                ? "bg-slate-800 text-white shadow-2xs"
                                                : "border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                                        )}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                "w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0",
                                                !filterAirspace && "opacity-45"
                                            )}
                                        />
                                        <span>{t("layerAirspace")}</span>
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={filterHubs}
                                        onClick={() => setFilterHubs((prev) => !prev)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                            filterHubs
                                                ? "bg-slate-800 text-white shadow-2xs"
                                                : "border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                                        )}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                "w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0",
                                                !filterHubs && "opacity-45"
                                            )}
                                        />
                                        <span>{t("layerHubs")}</span>
                                    </button>
                                    <button
                                        type="button"
                                        aria-pressed={filterAdsb}
                                        onClick={() => setFilterAdsb((prev) => !prev)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-colors cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                            filterAdsb
                                                ? "bg-slate-800 text-white shadow-2xs"
                                                : "border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                                        )}
                                    >
                                        <span
                                            aria-hidden="true"
                                            className={cn(
                                                "w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0",
                                                !filterAdsb && "opacity-45"
                                            )}
                                        />
                                        <span>
                                            {t("layerAdsb")}
                                            {filterAdsb && adsbData?.aircraft
                                                ? ` (${adsbData.aircraft.length})`
                                                : ""}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        }
                        onEntityClick={(entityId) => {
                            const rawId = entityId
                                .replace(/^drone-live-/, "")
                                .replace(/^drone-trail-/, "")
                                .replace(/^drone-tether-/, "")
                                .replace(/^drone-heading-/, "")
                                .replace(/^flight-route-/, "")
                                .replace(/^flight-heading-/, "")
                                .replace(/^flight-curtain-/, "")
                                .replace(/^flight-label-/, "");
                            const found = flights.find((f) => f.id === rawId);
                            if (found) {
                                setSelectedFlightId(found.id);
                            }
                        }}
                    >
                        {filterAirspace && <AirspaceLayer zones={activeZones} />}
                        <FlightsLayer
                            flights={flights}
                            selectedFlightId={selectedFlightId}
                            dimUnselected
                            showRouteLabels={selectedTelemetry ? "none" : "focused"}
                            hubs={hubs}
                        />
                        <LiveTelemetryLayer
                            flights={airborneFlights}
                            telemetryMap={telemetryMap}
                            selectedFlightId={selectedFlightId}
                            autoFollowSelected={false}
                            autoFitInitialBounds={false}
                        />
                        {filterHubs && <HubsLayer hubs={relevantHubs} autoFitBounds={false} />}
                        {filterAdsb && <AdsbLayer aircraft={adsbData?.aircraft ?? []} />}
                        <PerspectiveResetHandler hubs={relevantHubs} flights={flights} />
                    </TacticalMapContainer>
                </div>

                <div className="lg:col-span-4">
                    <LiveTelemetry
                        telemetry={selectedTelemetry}
                        flight={selectedFlight}
                        flights={flights}
                        drones={drones}
                        selectedFlightId={selectedFlightId}
                        onSelectFlight={setSelectedFlightId}
                        telemetryMap={telemetryMap}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <FlightControl
                    droneId={selectedFlight?.droneId}
                    flightId={selectedFlight?.id}
                    flightStatus={selectedFlight?.status}
                    altitudeM={selectedTelemetry?.altitude ?? null}
                    hasLiveLink={hasFreshLink}
                />
                <RecentCommands droneId={selectedFlight?.droneId} />
                <ActiveAlerts />
            </div>
        </div>
    );
}

export default function ControlCenterPage() {
    return (
        <Suspense fallback={<PageEditorSkeleton />}>
            <ControlCenterContent />
        </Suspense>
    );
}
