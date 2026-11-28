"use client";

import { memo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { ConfirmDialog } from "@/components/ui";
import type { GotoDraftTarget } from "../FlightDeckMapOverlay";
import type { Drone, Flight, Hub, TelemetryRecord } from "@/types";
import { CockpitVectorPopover } from "./CockpitVectorPopover";
import { CockpitManeuverToolbar } from "./CockpitManeuverToolbar";
import { useCockpitCommands, type VectorPopoverType } from "./useCockpitCommands";

export type { VectorPopoverType };

interface CockpitCommandDockProps {
    flight: Flight;
    drone: Drone | null;
    hubs: Hub[];
    telemetry: TelemetryRecord | null;
    gotoPickMode: boolean;
    onToggleGotoPickMode: (next: boolean) => void;
    gotoDraft: GotoDraftTarget | null;
    onChangeGotoDraft: (next: GotoDraftTarget | null) => void;
    activePopover: VectorPopoverType;
    onChangeActivePopover: (next: VectorPopoverType) => void;
}

export const CockpitCommandDock = memo(function CockpitCommandDock({
    flight,
    drone,
    hubs,
    telemetry,
    gotoPickMode,
    onToggleGotoPickMode,
    gotoDraft,
    onChangeGotoDraft,
    activePopover,
    onChangeActivePopover,
}: CockpitCommandDockProps) {
    const t = useTranslations("flights.deck");
    const tCtrl = useTranslations("controlCenter");
    const tc = useTranslations("common");

    const {
        isControllableStatus,
        isTerminal,
        isAirborne,
        c2Enabled,
        showPreTakeoffBar,
        altitudeInput,
        setAltitudeInput,
        speedInput,
        setSpeedInput,
        divertHubId,
        setDivertHubId,
        divertReason,
        setDivertReason,
        pendingConfirm,
        setPendingConfirm,
        gotoAltInput,
        handleGotoAltInputChange,
        activeCommandType,
        alternateHubOptions,
        sendCommandMutation,
        airborneButtons,
        adjustAltitudeBy,
        handleApplyAltitude,
        handleApplySpeed,
        handleDispatchGoto,
        handleRequestDivert,
        speedPreviewKmh,
        toggleVectorPopover,
        isTakeoffPending,
    } = useCockpitCommands({
        flight,
        drone,
        hubs,
        telemetry,
        gotoPickMode,
        onToggleGotoPickMode,
        gotoDraft,
        onChangeGotoDraft,
        activePopover,
        onChangeActivePopover,
    });

    return (
        <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 z-30 max-w-[calc(100vw-1.5rem)] flex flex-col items-center gap-2 pointer-events-auto">
            {!isControllableStatus && (
                <div className="px-3.5 py-2 rounded-md border border-slate-700 bg-slate-900/95 text-slate-200 text-xs font-mono shadow-xl backdrop-blur-md flex flex-wrap items-center justify-center gap-3">
                    <span>
                        {isTerminal ? t("postFlightReadOnlyNotice") : t("awaitingAuthNotice")}
                    </span>
                    <Link
                        href={`/dashboard/flights/${flight.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] no-underline shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
                    >
                        <span>{isTerminal ? t("openReplayDossier") : t("exitToDossier")}</span>
                        <ArrowRight className="w-3 h-3" aria-hidden="true" />
                    </Link>
                </div>
            )}

            {activePopover && c2Enabled && isAirborne && (
                <CockpitVectorPopover
                    activePopover={activePopover}
                    altitudeInput={altitudeInput}
                    onChangeAltitudeInput={setAltitudeInput}
                    onAdjustAltitudeBy={adjustAltitudeBy}
                    onApplyAltitude={handleApplyAltitude}
                    speedInput={speedInput}
                    onChangeSpeedInput={setSpeedInput}
                    speedPreviewKmh={speedPreviewKmh}
                    onApplySpeed={handleApplySpeed}
                    gotoDraft={gotoDraft}
                    gotoPickMode={gotoPickMode}
                    onToggleGotoPickMode={onToggleGotoPickMode}
                    gotoAltInput={gotoAltInput}
                    onChangeGotoAltInput={handleGotoAltInputChange}
                    onDispatchGoto={handleDispatchGoto}
                    divertHubId={divertHubId}
                    onChangeDivertHubId={setDivertHubId}
                    alternateHubOptions={alternateHubOptions}
                    divertReason={divertReason}
                    onChangeDivertReason={setDivertReason}
                    onRequestDivert={handleRequestDivert}
                    isSubmitting={sendCommandMutation.isPending}
                    onClose={() => {
                        onChangeActivePopover(null);
                        onToggleGotoPickMode(false);
                    }}
                />
            )}

            {isControllableStatus && (
                <CockpitManeuverToolbar
                    cruisingAltitudeM={flight.cruisingAltitudeM}
                    c2Enabled={c2Enabled}
                    isAirborne={isAirborne}
                    showPreTakeoffBar={showPreTakeoffBar}
                    isTakeoffPending={isTakeoffPending}
                    isSubmitting={sendCommandMutation.isPending}
                    pendingCommandType={sendCommandMutation.variables?.commandType}
                    activeCommandType={activeCommandType}
                    airborneButtons={airborneButtons}
                    activePopover={activePopover}
                    gotoPickMode={gotoPickMode}
                    onDispatchDirect={(commandType) => sendCommandMutation.mutate({ commandType })}
                    onRequestConfirm={setPendingConfirm}
                    onToggleVectorPopover={toggleVectorPopover}
                />
            )}

            <ConfirmDialog
                isOpen={Boolean(pendingConfirm)}
                onClose={() => setPendingConfirm(null)}
                onConfirm={() => {
                    if (pendingConfirm) {
                        sendCommandMutation.mutate({
                            commandType: pendingConfirm.commandType,
                            parameters: pendingConfirm.parameters,
                        });
                    }
                }}
                title={pendingConfirm?.title ?? tCtrl("confirmDialogs.defaultTitle")}
                description={pendingConfirm?.description ?? ""}
                confirmText={pendingConfirm?.confirmText ?? tc("confirm")}
                loading={sendCommandMutation.isPending}
            />
        </div>
    );
});
