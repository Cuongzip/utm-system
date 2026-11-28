"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, FileSearch, FileText } from "lucide-react";
import { SplitMapLayout, ChamferCard, ChamferButton, StatusBadge } from "@/components/ui";
import {
    TacticalMapContainer,
    AirspaceLayer,
    FlightsLayer,
    HubsLayer,
    LiveTelemetryLayer,
    AdsbLayer,
} from "@/components/map";
import { PreFlightBriefingModal } from "./PreFlightBriefingModal";
import { FlightDeckMapOverlay } from "./FlightDeckMapOverlay";
import { ReplayMapToolbar } from "./replay/ReplayMapToolbar";
import { ReplayScrubberFooter } from "./replay/ReplayScrubberFooter";
import { ReplayTelemetryTab } from "./replay/ReplayTelemetryTab";
import { ReplayAuditTab } from "./replay/ReplayAuditTab";
import { useFlightReplayDossierData } from "./replay/useFlightReplayDossierData";
import { cn } from "@/lib";
import { DEFAULT_FLIGHT_STATUS, type Drone, type Flight, type Hub } from "@/types";

interface FlightReplayDossierProps {
    flight: Flight;
    hubs: Hub[];
    drones: Drone[];
    onViewPlan: () => void;
}

type ReplaySidebarTab = "telemetry" | "audit";

export function FlightReplayDossier({
    flight,
    hubs,
    drones,
    onViewPlan,
}: FlightReplayDossierProps) {
    const router = useRouter();
    const t = useTranslations("flights");
    const td = useTranslations("flights.deck");
    const tMap = useTranslations("map");
    const tCommon = useTranslations("common");

    const [activeTab, setActiveTab] = useState<ReplaySidebarTab>("telemetry");
    const [followUav, setFollowUav] = useState(false);
    const [filterAirspace, setFilterAirspace] = useState(true);
    const [filterHubs, setFilterHubs] = useState(true);
    const [filterAdsb, setFilterAdsb] = useState(false);
    const [fitTrigger, setFitTrigger] = useState(0);
    const [briefingOpen, setBriefingOpen] = useState(false);

    const {
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
    } = useFlightReplayDossierData({ flight, hubs, drones, filterAdsb });

    const flightStatus = flight.status ?? DEFAULT_FLIGHT_STATUS;

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
                                <ReplayMapToolbar
                                    followUav={followUav}
                                    onToggleFollowUav={() => setFollowUav((prev) => !prev)}
                                    onFitRoute={() => {
                                        setFollowUav(false);
                                        setFitTrigger((n) => n + 1);
                                    }}
                                    filterAirspace={filterAirspace}
                                    onToggleAirspace={() => setFilterAirspace((p) => !p)}
                                    filterHubs={filterHubs}
                                    onToggleHubs={() => setFilterHubs((p) => !p)}
                                    filterAdsb={filterAdsb}
                                    onToggleAdsb={() => setFilterAdsb((p) => !p)}
                                />
                            }
                            legendSlot={
                                <>
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
                                            className="w-4 h-[2.5px] rounded-full bg-amber-500"
                                        />
                                        <span>{tMap("legendActual")}</span>
                                    </span>
                                    {totalFrames > 1 && cursorIndex < totalFrames - 1 && (
                                        <span className="inline-flex items-center gap-1.5 text-slate-400">
                                            <span
                                                aria-hidden="true"
                                                className="w-4 border-t-2 border-dotted border-amber-400/60"
                                            />
                                            <span>{tMap("legendRemaining")}</span>
                                        </span>
                                    )}
                                </>
                            }
                            footer={
                                <ReplayScrubberFooter
                                    flight={flight}
                                    departureHub={departureHub}
                                    arrivalHub={arrivalHub}
                                    activeZones={activeZones}
                                    liveAltitudeProgress={liveAltitudeProgress}
                                    fullAltitudeTrace={fullAltitudeTrace}
                                    totalFrames={totalFrames}
                                    cursorIndex={cursorIndex}
                                    isPlaying={isPlaying}
                                    playbackRate={playbackRate}
                                    timelineMarkers={timelineMarkers}
                                    debriefMetrics={debriefMetrics}
                                    activeRecord={activeRecord}
                                    onSeekByDistance={handleSeekByDistance}
                                    onStepFrame={stepFrame}
                                    onTogglePlay={togglePlay}
                                    onSeekTo={seekTo}
                                    onSetPlaybackRate={setPlaybackRate}
                                />
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
                                interpolate={false}
                                variant="replay"
                            />
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
                                    <ReplayTelemetryTab
                                        flight={flight}
                                        drone={drone}
                                        departureHub={departureHub}
                                        arrivalHub={arrivalHub}
                                        conformance={conformance}
                                        activeRecord={activeRecord}
                                        debriefMetrics={debriefMetrics}
                                    />
                                ) : (
                                    <ReplayAuditTab
                                        sortedCommands={sortedCommands}
                                        recordedIncidents={recordedIncidents}
                                        recordedConflicts={recordedConflicts}
                                        hubCodeMap={hubCodeMap}
                                        totalFrames={totalFrames}
                                        seekToTimestamp={seekToTimestamp}
                                        getEventWindowStatus={getEventWindowStatus}
                                        humanizeAuditText={humanizeAuditText}
                                    />
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
