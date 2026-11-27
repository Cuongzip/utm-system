"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import {
    CloudSun,
    Shield,
    Plane,
    FileWarning,
    Sparkles,
    Loader2,
    CheckCircle2,
    AlertTriangle,
} from "lucide-react";
import {
    Modal,
    ChamferButton,
    StatusBadge,
    Skeleton,
    ErrorState,
    TacticalCallout,
} from "@/components/ui";
import { useFlightBriefing } from "@/hooks";
import { intelligenceService } from "@/services";
import { translateStatusLabel, useAppLocale } from "@/i18n";
import type { FlightAssessment } from "@/types";
import { formatDateTime } from "@/utils";

export interface PreFlightBriefingModalProps {
    isOpen: boolean;
    flightId?: string | null;
    flightNumber?: string | null;
    onClose: () => void;
}

function readNum(rec: Record<string, unknown> | undefined, key: string): number | undefined {
    const v = rec?.[key];
    return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function readStr(rec: Record<string, unknown> | undefined, key: string): string | undefined {
    const v = rec?.[key];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

export function PreFlightBriefingModal({
    isOpen,
    flightId,
    flightNumber,
    onClose,
}: PreFlightBriefingModalProps) {
    const t = useTranslations("flights.briefing");
    const tCommon = useTranslations("common");
    const locale = useAppLocale();
    const {
        data: briefing,
        isLoading,
        isError,
        refetch,
    } = useFlightBriefing(flightId, isOpen && Boolean(flightId));
    const [assessment, setAssessment] = useState<FlightAssessment | null>(null);

    const assessMutation = useMutation({
        mutationFn: () => intelligenceService.assessFlight(flightId!),
        meta: { defaultErrorMessage: t("assessFailed") },
        onSuccess: (res) => setAssessment(res),
    });

    const handleClose = () => {
        setAssessment(null);
        onClose();
    };

    const sections = briefing?.sections;
    const verdict = briefing?.verdict ?? "UNKNOWN";

    const wx = sections?.weather;
    const wxVerdict = readStr(wx, "verdict");
    const wxCat = readStr(wx, "flightCategory");
    const wxWind = readNum(wx, "windMs") ?? readNum(wx, "windSpeedMs");
    const wxIcao = readStr(wx, "icao") ?? readStr(wx, "nearestStation");

    const air = sections?.airspace;
    const airSafe = typeof air?.safe === "boolean" ? air.safe : undefined;
    const breachCount =
        readNum(air, "breachCount") ?? (Array.isArray(air?.violations) ? air.violations.length : 0);

    const tr = sections?.traffic;
    const nearbyAircraft = readNum(tr, "nearbyCount") ?? readNum(tr, "total") ?? 0;
    const warningContacts = readNum(tr, "warningCount") ?? 0;
    const cautionContacts = readNum(tr, "cautionCount") ?? 0;

    const nt = sections?.notam;
    const notamRelevant = readNum(nt, "relevantCount") ?? readNum(nt, "total") ?? 0;
    const notamCritical = readNum(nt, "criticalCount") ?? 0;

    const rawDecisionCode =
        assessment?.ai?.decision ?? assessment?.deterministicVerdict ?? "UNKNOWN";
    const decisionCodeNorm = rawDecisionCode.replace(/_/g, " ");
    const decisionLabel = translateStatusLabel(rawDecisionCode, locale);

    const assessmentTone =
        decisionCodeNorm.includes("NO GO") || decisionCodeNorm.includes("REJECT")
            ? "critical"
            : decisionCodeNorm.includes("CAUTION") || decisionCodeNorm.includes("MARGINAL")
              ? "warning"
              : "success";

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={flightNumber ? t("titleWithNumber", { flight: flightNumber }) : t("title")}
            maxWidth={680}
            footer={
                <div className="flex items-center justify-between w-full gap-2">
                    <ChamferButton
                        variant="dark"
                        size="sm"
                        disabled={!flightId || assessMutation.isPending}
                        onClick={() => flightId && assessMutation.mutate()}
                    >
                        {assessMutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span>
                            {assessMutation.isPending ? t("assessing") : t("runAssessment")}
                        </span>
                    </ChamferButton>
                    <ChamferButton variant="outline" size="sm" onClick={handleClose}>
                        {tCommon("close")}
                    </ChamferButton>
                </div>
            }
        >
            {isLoading ? (
                <div
                    role="status"
                    aria-busy="true"
                    aria-label={t("loading")}
                    className="flex flex-col gap-4"
                >
                    <div className="rounded border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between gap-3">
                        <div className="flex flex-col gap-1.5">
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-3 w-64" />
                        </div>
                        <Skeleton className="h-5 w-24" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-md overflow-hidden">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <div key={idx} className="bg-white p-3.5 flex flex-col gap-2">
                                <Skeleton className="h-3.5 w-28" />
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-32" />
                            </div>
                        ))}
                    </div>
                    <span className="sr-only">{t("loading")}</span>
                </div>
            ) : isError || !briefing ? (
                <ErrorState
                    title={t("loadErrorTitle")}
                    description={t("loadErrorDesc")}
                    onRetry={() => refetch()}
                />
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3.5 py-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-mono font-bold text-slate-900">
                                {briefing.route?.departureHub || t("origin")} →{" "}
                                {briefing.route?.arrivalHub || t("destination")}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                                {t("cruiseSummary", {
                                    alt: briefing.route?.altitudeM ?? "—",
                                    count: briefing.route?.points?.length ?? 0,
                                })}
                                {briefing.generatedAt
                                    ? ` · ${formatDateTime(briefing.generatedAt)}`
                                    : ""}
                            </span>
                        </div>
                        <StatusBadge
                            status={verdict}
                            label={t("verdictBadge", {
                                verdict:
                                    translateStatusLabel(verdict, locale) ??
                                    verdict.replace(/_/g, " "),
                            })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--color-border-default)] border border-[var(--color-border-default)] rounded-md overflow-hidden">
                        <div className="bg-white p-3.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 uppercase">
                                    <CloudSun className="w-3.5 h-3.5 text-slate-600" />
                                    {t("weather")}
                                </span>
                                {wxVerdict && <StatusBadge status={wxVerdict} />}
                            </div>
                            <div className="text-xs font-mono text-slate-700 space-y-0.5">
                                <div>
                                    {t("category")}{" "}
                                    <strong className="text-slate-900">{wxCat || "VFR"}</strong>
                                    {wxIcao ? ` · ${t("station", { icao: wxIcao })}` : ""}
                                </div>
                                <div className="text-[11px] text-slate-500 tabular-nums">
                                    {wxWind != null
                                        ? t("sustainedWind", { speed: wxWind.toFixed(1) })
                                        : t("weatherNominal")}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 uppercase">
                                    <Shield className="w-3.5 h-3.5 text-slate-600" />
                                    {t("airspaceSectors")}
                                </span>
                                {airSafe !== undefined && (
                                    <StatusBadge
                                        status={airSafe ? "go" : "no_go"}
                                        label={airSafe ? t("clear") : t("violation")}
                                    />
                                )}
                            </div>
                            <div className="text-xs font-mono text-slate-700 space-y-0.5">
                                <div>
                                    {t("zoneIntersections")}{" "}
                                    <strong className="text-slate-900 tabular-nums">
                                        {breachCount}
                                    </strong>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    {breachCount === 0
                                        ? t("trajectoryClear")
                                        : t("sectorConflicts", { count: breachCount })}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 uppercase">
                                    <Plane className="w-3.5 h-3.5 text-slate-600" />
                                    {t("adsbTraffic")}
                                </span>
                                <StatusBadge
                                    status={
                                        warningContacts > 0
                                            ? "no_go"
                                            : cautionContacts > 0
                                              ? "warning"
                                              : "go"
                                    }
                                    label={t("nearbyBadge", { count: nearbyAircraft })}
                                />
                            </div>
                            <div className="text-xs font-mono text-slate-700 space-y-0.5 tabular-nums">
                                <div>
                                    {t("warningContacts")}{" "}
                                    <strong className="text-slate-900">{warningContacts}</strong> ·{" "}
                                    {t("cautionContacts")}{" "}
                                    <strong className="text-slate-900">{cautionContacts}</strong>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    {t("adsbSubtitle")}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 uppercase">
                                    <FileWarning className="w-3.5 h-3.5 text-slate-600" />
                                    {t("notamAdvisories")}
                                </span>
                                <StatusBadge
                                    status={notamCritical > 0 ? "warning" : "info"}
                                    label={t("activeBadge", { count: notamRelevant })}
                                />
                            </div>
                            <div className="text-xs font-mono text-slate-700 space-y-0.5 tabular-nums">
                                <div>
                                    {t("criticalNotices")}{" "}
                                    <strong className="text-slate-900">{notamCritical}</strong>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    {notamRelevant === 0
                                        ? t("noNotams")
                                        : t("activeNotams", { count: notamRelevant })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {assessment && (
                        <TacticalCallout
                            tone={assessmentTone}
                            icon={Sparkles}
                            title={
                                <span className="inline-flex items-center gap-2">
                                    <span>{t("assessmentTitle")}</span>
                                    {assessment.model && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-600">
                                            {assessment.model}
                                        </span>
                                    )}
                                </span>
                            }
                            description={assessment.ai?.humanSummary}
                            rightSlot={
                                <StatusBadge status={rawDecisionCode} label={decisionLabel} />
                            }
                        >
                            {assessment.ai?.blockingReasons &&
                                assessment.ai.blockingReasons.length > 0 && (
                                    <div className="flex flex-col gap-1 pt-1">
                                        <span className="text-[10px] font-mono font-bold uppercase text-red-700 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            {t("blockingReasons")}
                                        </span>
                                        <ul className="list-disc list-inside text-xs text-red-800 space-y-0.5">
                                            {assessment.ai.blockingReasons.map((r, i) => (
                                                <li key={i}>{r}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                            {assessment.ai?.conditions && assessment.ai.conditions.length > 0 && (
                                <div className="flex flex-col gap-1 pt-1">
                                    <span className="text-[10px] font-mono font-bold uppercase text-amber-700 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" />
                                        {t("operatingConditions")}
                                    </span>
                                    <ul className="list-disc list-inside text-xs text-slate-700 space-y-0.5">
                                        {assessment.ai.conditions.map((c, i) => (
                                            <li key={i}>{c}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </TacticalCallout>
                    )}
                </div>
            )}
        </Modal>
    );
}
