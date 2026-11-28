"use client";

import { useTranslations } from "next-intl";
import {
    AlertTriangle,
    ArrowLeft,
    ArrowUpRight,
    CheckCircle2,
    FileSearch,
    Loader2,
    Play,
    Radio,
    RotateCcw,
    Save,
    ShieldCheck,
} from "lucide-react";
import { ChamferButton } from "@/components/ui";
import { CONTROLLABLE_FLIGHT_STATUSES, type FlightStatus } from "@/types";

interface FlightEditorHeaderActionsProps {
    mode: "create" | "edit";
    flightId: string | undefined;
    flightStatus: FlightStatus;
    isReadOnly: boolean;
    submitting: boolean;
    loading: boolean;
    isLifecyclePending: boolean;
    isAuthorizing: boolean;
    isStarting: boolean;
    canAuthorizeNow: boolean;
    canStartNow: boolean;
    canCompleteOrAbortNow: boolean;
    onBackToReplay?: () => void;
    onOpenBriefing: () => void;
    onAuthorize: () => void;
    onStart: () => void;
    onComplete: () => void;
    onRequestAbort: () => void;
    onCancelOrBack: () => void;
    onSave: () => void;
}

export function FlightEditorHeaderActions({
    mode,
    flightId,
    flightStatus,
    isReadOnly,
    submitting,
    loading,
    isLifecyclePending,
    isAuthorizing,
    isStarting,
    canAuthorizeNow,
    canStartNow,
    canCompleteOrAbortNow,
    onBackToReplay,
    onOpenBriefing,
    onAuthorize,
    onStart,
    onComplete,
    onRequestAbort,
    onCancelOrBack,
    onSave,
}: FlightEditorHeaderActionsProps) {
    const t = useTranslations("flights");
    const td = useTranslations("flights.deck");
    const tCommon = useTranslations("common");

    return (
        <div className="flex flex-wrap items-center gap-2">
            {mode === "edit" && flightId && onBackToReplay && (
                <ChamferButton variant="dark" size="sm" clip="sm" onClick={onBackToReplay}>
                    <RotateCcw className="w-3.5 h-3.5 text-white" />
                    <span>{td("backToReplay")}</span>
                </ChamferButton>
            )}

            {mode === "edit" && flightId && CONTROLLABLE_FLIGHT_STATUSES.includes(flightStatus) && (
                <ChamferButton
                    href={`/dashboard/flights/${flightId}/cockpit`}
                    variant="dark"
                    size="sm"
                    clip="sm"
                >
                    <Radio className="w-3.5 h-3.5 text-white" />
                    <span>{td("enterCockpit")}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                </ChamferButton>
            )}

            {mode === "edit" && flightId && (
                <ChamferButton variant="outline" size="sm" clip="xs" onClick={onOpenBriefing}>
                    <FileSearch className="w-3.5 h-3.5 text-current" />
                    <span>{t("editor.briefing")}</span>
                </ChamferButton>
            )}

            {canAuthorizeNow && (
                <ChamferButton
                    variant="outline"
                    size="sm"
                    clip="xs"
                    onClick={onAuthorize}
                    disabled={isLifecyclePending || submitting}
                >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isAuthorizing ? t("editor.authorizing") : t("editor.authorize")}</span>
                </ChamferButton>
            )}

            {canStartNow && (
                <ChamferButton
                    variant="outline"
                    size="sm"
                    clip="xs"
                    onClick={onStart}
                    disabled={isLifecyclePending || submitting}
                >
                    <Play className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{isStarting ? t("editor.starting") : t("editor.startFlight")}</span>
                </ChamferButton>
            )}

            {canCompleteOrAbortNow && (
                <>
                    <ChamferButton
                        variant="outline"
                        size="sm"
                        clip="xs"
                        onClick={onComplete}
                        disabled={isLifecyclePending}
                    >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{t("editor.complete")}</span>
                    </ChamferButton>
                    <ChamferButton
                        variant="outline"
                        size="sm"
                        clip="xs"
                        onClick={onRequestAbort}
                        disabled={isLifecyclePending}
                    >
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                        <span>{t("editor.abort")}</span>
                    </ChamferButton>
                </>
            )}

            <ChamferButton
                variant="outline"
                size="sm"
                clip="xs"
                onClick={onCancelOrBack}
                disabled={submitting || isLifecyclePending}
            >
                <ArrowLeft className="w-3.5 h-3.5 text-current" />
                <span>{isReadOnly ? tCommon("back") : tCommon("cancel")}</span>
            </ChamferButton>

            {!isReadOnly && (
                <ChamferButton
                    variant="dark"
                    size="sm"
                    clip="sm"
                    onClick={onSave}
                    disabled={submitting || loading || isLifecyclePending}
                >
                    {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                        <Save className="w-4 h-4 text-white" />
                    )}
                    <span>
                        {mode === "create" ? t("editor.saveFlight") : t("editor.updatePlan")}
                    </span>
                </ChamferButton>
            )}
        </div>
    );
}
