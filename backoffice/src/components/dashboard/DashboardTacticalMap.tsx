"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import {
    TacticalMapContainer,
    FlightsLayer,
    HubsLayer,
    AirspaceLayer,
    LiveTelemetryLayer,
    AdsbLayer,
    ForesightLayer,
    useCesium,
    fitCameraToBounds,
} from "@/components/map";
import { ForesightControls, AirTrafficDirectorPanel } from "@/components/foresight";
import { useAdsbAircraft, QUERY_KEYS } from "@/hooks";
import { intelligenceService } from "@/services";
import { cn } from "@/lib";
import {
    AIRSPACE_ZONE_STATUS,
    HUB_STATUS,
    type Flight,
    type Hub,
    type AirspaceZone,
    type TelemetryRecord,
    type ForesightPrediction,
    type ForesightPredictedConflict,
} from "@/types";
import { toast } from "sonner";
import { isValidGeoPoint } from "@/utils";

export interface DashboardTacticalMapProps {
    activeFlights: Flight[];
    hubs: Hub[];
    airspaceZones: AirspaceZone[];
    telemetryMap: Record<string, TelemetryRecord>;
}

function isRegionalPoint(lat: number, lng: number): boolean {
    return isValidGeoPoint(lat, lng) && lat >= 8 && lat <= 24 && lng >= 100 && lng <= 112;
}

function PerspectiveResetHandler({
    hubs,
    activeFlights,
    trigger,
}: {
    hubs: Hub[];
    activeFlights: Flight[];
    trigger: number;
}) {
    const { viewer, isLoaded } = useCesium();
    const hasInitialFitRef = useRef(false);

    useEffect(() => {
        if (!viewer || !isLoaded) return;
        if (trigger === 0 && hasInitialFitRef.current) return;

        const flightPoints = activeFlights.flatMap((f) => {
            const route = f.plannedRoute;
            if (
                route &&
                typeof route === "object" &&
                "coordinates" in route &&
                Array.isArray((route as { coordinates?: unknown }).coordinates)
            ) {
                return ((route as { coordinates: number[][] }).coordinates ?? [])
                    .filter((pt) => Array.isArray(pt) && pt.length >= 2)
                    .map((pt) => ({ lng: Number(pt[0]), lat: Number(pt[1]) }))
                    .filter((pt) => isRegionalPoint(pt.lat, pt.lng));
            }
            return [];
        });

        const hubPoints = hubs.flatMap((h) =>
            h.location &&
            h.location.latitude !== undefined &&
            h.location.longitude !== undefined &&
            isRegionalPoint(h.location.latitude, h.location.longitude)
                ? [{ lat: h.location.latitude, lng: h.location.longitude }]
                : []
        );

        const points = flightPoints.length > 0 ? [...flightPoints, ...hubPoints] : hubPoints;
        if (points.length > 0 || trigger > 0) {
            hasInitialFitRef.current = true;
            fitCameraToBounds(viewer, points.length ? points : [{ lat: 10.7769, lng: 106.7009 }], {
                animate: trigger > 0,
                duration: 1.0,
                minHeight: 2500,
                maxHeight: 80000,
            });
        }
    }, [viewer, isLoaded, trigger, hubs, activeFlights]);

    return null;
}

export function DashboardTacticalMap({
    activeFlights = [],
    hubs = [],
    airspaceZones = [],
    telemetryMap = {},
}: DashboardTacticalMapProps) {
    const t = useTranslations("dashboard");
    const tc = useTranslations("controlCenter");
    const [filterTraffic, setFilterTraffic] = useState(true);
    const [filterAirspace, setFilterAirspace] = useState(true);
    const [filterHubs, setFilterHubs] = useState(true);
    const [filterAdsb, setFilterAdsb] = useState(false);
    const [foresightOpen, setForesightOpen] = useState(false);
    const [horizonSec, setHorizonSec] = useState(300);
    const [frameIndex, setFrameIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [selectedConflict, setSelectedConflict] = useState<ForesightPredictedConflict | null>(
        null
    );
    const [simulatedPrediction, setSimulatedPrediction] = useState<ForesightPrediction | null>(
        null
    );
    const [resetTrigger, setResetTrigger] = useState(0);

    const activeHubs = useMemo(
        () => hubs.filter((h) => (h.status || "").toLowerCase() !== HUB_STATUS.INACTIVE),
        [hubs]
    );

    const activeZones = useMemo(
        () => airspaceZones.filter((z) => z.status === AIRSPACE_ZONE_STATUS.ACTIVE),
        [airspaceZones]
    );

    const { data: adsbData } = useAdsbAircraft(filterAdsb, 15000);
    const {
        data: foresightData,
        isFetching: foresightLoading,
        refetch: refetchForesight,
    } = useQuery({
        queryKey: QUERY_KEYS.foresightPredict(horizonSec, 10),
        queryFn: () => intelligenceService.predictForesight(horizonSec, 10),
        enabled: foresightOpen,
        staleTime: 1000 * 10,
    });

    const activeForesight = simulatedPrediction ?? foresightData ?? null;
    const totalFrames = activeForesight?.frames?.length ?? 0;

    useEffect(() => {
        if (!isPlaying || !foresightOpen || totalFrames <= 1) return;
        const timer = setInterval(() => {
            setFrameIndex((prev) => (prev + 1 >= totalFrames ? 0 : prev + 1));
        }, 700);
        return () => clearInterval(timer);
    }, [isPlaying, foresightOpen, totalFrames]);

    const handleReset = () => {
        setResetTrigger((prev) => prev + 1);
        toast.info(t("resetMapToast"));
    };

    const handleToggleForesight = () => {
        setForesightOpen((prev) => {
            const next = !prev;
            if (!next) {
                setIsPlaying(false);
                setSelectedConflict(null);
                setSimulatedPrediction(null);
            }
            return next;
        });
    };

    return (
        <TacticalMapContainer
            initialLayerType="satellite-hybrid"
            className="w-full h-[520px] sm:h-[580px]"
            hideBottomHud={foresightOpen}
            header={
                <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-panel)] z-10">
                    <span className="text-xs font-bold font-mono tracking-wider text-[var(--color-text-primary)] uppercase">
                        {t("tacticalMapTitle")}
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5">
                        <button
                            type="button"
                            aria-pressed={filterTraffic}
                            onClick={() => setFilterTraffic((prev) => !prev)}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                filterTraffic
                                    ? "bg-slate-800 text-white shadow-2xs"
                                    : "border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0",
                                    !filterTraffic && "opacity-45"
                                )}
                            />
                            <span>{t("liveTrafficCount", { count: activeFlights.length })}</span>
                        </button>
                        <button
                            type="button"
                            aria-pressed={filterAirspace}
                            onClick={() => setFilterAirspace((prev) => !prev)}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
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
                            <span>{tc("layerAirspace")}</span>
                        </button>
                        <button
                            type="button"
                            aria-pressed={filterHubs}
                            onClick={() => setFilterHubs((prev) => !prev)}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
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
                            <span>{tc("layerHubs")}</span>
                        </button>
                        <button
                            type="button"
                            aria-pressed={filterAdsb}
                            onClick={() => setFilterAdsb((prev) => !prev)}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
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
                                {tc("layerAdsb")}
                                {filterAdsb && adsbData?.aircraft
                                    ? ` (${adsbData.aircraft.length})`
                                    : ""}
                            </span>
                        </button>
                        <button
                            type="button"
                            aria-pressed={foresightOpen}
                            onClick={handleToggleForesight}
                            className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-semibold transition-all cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                                foresightOpen
                                    ? "bg-slate-800 text-white shadow-2xs"
                                    : "border border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-base)]"
                            )}
                        >
                            <span
                                aria-hidden="true"
                                className={cn(
                                    "w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0",
                                    !foresightOpen && "opacity-45"
                                )}
                            />
                            <span>{t("foresightBtn")}</span>
                        </button>
                    </div>
                </div>
            }
            overlay={
                <>
                    <div className="absolute top-3.5 left-3.5 z-30 pointer-events-auto">
                        <button
                            type="button"
                            onClick={handleReset}
                            className="h-8 px-2.5 inline-flex items-center gap-1.5 rounded-md bg-slate-950/88 border border-slate-700/80 backdrop-blur-md shadow-sm text-[11px] font-mono font-semibold text-slate-200 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                        >
                            <RotateCcw className="w-3.5 h-3.5 text-slate-300" aria-hidden="true" />
                            <span>{t("resetMap")}</span>
                        </button>
                    </div>

                    {foresightOpen && selectedConflict && (
                        <AirTrafficDirectorPanel
                            conflict={selectedConflict}
                            horizonSec={horizonSec}
                            onPreviewSimulated={(sim) => {
                                setSimulatedPrediction(sim);
                                setFrameIndex(0);
                                toast.success(
                                    t("resolutionPreviewToast", {
                                        count: sim.predictedConflicts?.length ?? 0,
                                    })
                                );
                            }}
                            onClose={() => setSelectedConflict(null)}
                        />
                    )}

                    {foresightOpen && (
                        <ForesightControls
                            prediction={foresightData ?? null}
                            simulatedPrediction={simulatedPrediction}
                            loading={foresightLoading}
                            horizonSec={horizonSec}
                            onHorizonChange={(h) => {
                                setHorizonSec(h);
                                setFrameIndex(0);
                                setSimulatedPrediction(null);
                            }}
                            frameIndex={frameIndex}
                            onFrameIndexChange={setFrameIndex}
                            isPlaying={isPlaying}
                            onTogglePlay={() => setIsPlaying((p) => !p)}
                            onRefresh={() => refetchForesight()}
                            selectedConflict={selectedConflict}
                            onSelectConflict={setSelectedConflict}
                            onClearSimulation={() => setSimulatedPrediction(null)}
                            onClose={handleToggleForesight}
                        />
                    )}
                </>
            }
        >
            {filterTraffic && (
                <>
                    <FlightsLayer
                        flights={activeFlights}
                        hubs={activeHubs}
                        showRouteLabels="focused"
                    />
                    <LiveTelemetryLayer
                        flights={activeFlights}
                        telemetryMap={telemetryMap}
                        autoFitInitialBounds={false}
                    />
                </>
            )}
            {filterHubs && <HubsLayer hubs={activeHubs} autoFitBounds={false} />}
            {filterAirspace && <AirspaceLayer zones={activeZones} />}
            {filterAdsb && <AdsbLayer aircraft={adsbData?.aircraft ?? []} />}
            {foresightOpen && (
                <ForesightLayer
                    prediction={foresightData ?? null}
                    simulatedPrediction={simulatedPrediction}
                    frameIndex={frameIndex}
                    selectedConflictId={selectedConflict?.id}
                />
            )}
            <PerspectiveResetHandler
                hubs={activeHubs}
                activeFlights={activeFlights}
                trigger={resetTrigger}
            />
        </TacticalMapContainer>
    );
}
