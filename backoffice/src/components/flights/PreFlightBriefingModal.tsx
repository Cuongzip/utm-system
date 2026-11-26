"use client";

import { useState } from "react";
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
    const {
        data: briefing,
        isLoading,
        isError,
        refetch,
    } = useFlightBriefing(flightId, isOpen && Boolean(flightId));
    const [assessment, setAssessment] = useState<FlightAssessment | null>(null);

    const assessMutation = useMutation({
        mutationFn: () => intelligenceService.assessFlight(flightId!),
        meta: { defaultErrorMessage: "Failed to run pre-flight AI assessment" },
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

    const decisionLabel = (
        assessment?.ai?.decision ??
        assessment?.deterministicVerdict ??
        "UNKNOWN"
    ).replace(/_/g, " ");

    const assessmentTone =
        decisionLabel.includes("NO GO") || decisionLabel.includes("REJECT")
            ? "critical"
            : decisionLabel.includes("CAUTION") || decisionLabel.includes("MARGINAL")
              ? "warning"
              : "success";

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={`Pre-Flight Briefing${flightNumber ? ` — ${flightNumber}` : ""}`}
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
                            {assessMutation.isPending
                                ? "Assessing..."
                                : "Run Authorization Assessment"}
                        </span>
                    </ChamferButton>
                    <ChamferButton variant="outline" size="sm" onClick={handleClose}>
                        Close
                    </ChamferButton>
                </div>
            }
        >
            {isLoading ? (
                <div
                    role="status"
                    aria-busy="true"
                    aria-label="Loading pre-flight briefing"
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
                    <span className="sr-only">Loading pre-flight briefing...</span>
                </div>
            ) : isError || !briefing ? (
                <ErrorState
                    title="Unable to load pre-flight briefing"
                    description="Weather, airspace, and traffic checks could not be aggregated for this flight."
                    onRetry={() => refetch()}
                />
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3.5 py-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-mono font-bold text-slate-900">
                                {briefing.route?.departureHub || "Origin"} →{" "}
                                {briefing.route?.arrivalHub || "Destination"}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                                Cruise {briefing.route?.altitudeM ?? "—"} m ·{" "}
                                {briefing.route?.points?.length ?? 0} waypoints
                                {briefing.generatedAt
                                    ? ` · ${formatDateTime(briefing.generatedAt)}`
                                    : ""}
                            </span>
                        </div>
                        <StatusBadge
                            status={verdict}
                            label={`VERDICT: ${verdict.replace(/_/g, " ")}`}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[var(--color-border-default)] border border-[var(--color-border-default)] rounded-md overflow-hidden">
                        <div className="bg-white p-3.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 uppercase">
                                    <CloudSun className="w-3.5 h-3.5 text-slate-600" />
                                    Weather
                                </span>
                                {wxVerdict && <StatusBadge status={wxVerdict} />}
                            </div>
                            <div className="text-xs font-mono text-slate-700 space-y-0.5">
                                <div>
                                    Category:{" "}
                                    <strong className="text-slate-900">{wxCat || "VFR"}</strong>
                                    {wxIcao ? ` · Station ${wxIcao}` : ""}
                                </div>
                                <div className="text-[11px] text-slate-500 tabular-nums">
                                    {wxWind != null
                                        ? `Sustained wind ${wxWind.toFixed(1)} m/s`
                                        : "Meteorological conditions nominal"}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 uppercase">
                                    <Shield className="w-3.5 h-3.5 text-slate-600" />
                                    Airspace Sectors
                                </span>
                                {airSafe !== undefined && (
                                    <StatusBadge
                                        status={airSafe ? "go" : "no_go"}
                                        label={airSafe ? "CLEAR" : "VIOLATION"}
                                    />
                                )}
                            </div>
                            <div className="text-xs font-mono text-slate-700 space-y-0.5">
                                <div>
                                    Zone intersections:{" "}
                                    <strong className="text-slate-900 tabular-nums">
                                        {breachCount}
                                    </strong>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    {breachCount === 0
                                        ? "Trajectory clear of restricted & prohibited zones"
                                        : `${breachCount} active sector conflict(s) along corridor`}
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 uppercase">
                                    <Plane className="w-3.5 h-3.5 text-slate-600" />
                                    ADS-B Traffic
                                </span>
                                <StatusBadge
                                    status={
                                        warningContacts > 0
                                            ? "no_go"
                                            : cautionContacts > 0
                                              ? "warning"
                                              : "go"
                                    }
                                    label={`${nearbyAircraft} NEARBY`}
                                />
                            </div>
                            <div className="text-xs font-mono text-slate-700 space-y-0.5 tabular-nums">
                                <div>
                                    Warning contacts:{" "}
                                    <strong className="text-slate-900">{warningContacts}</strong> ·
                                    Caution:{" "}
                                    <strong className="text-slate-900">{cautionContacts}</strong>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    Low-altitude manned traffic surveillance
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-3.5 flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-2">
                                <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-slate-800 uppercase">
                                    <FileWarning className="w-3.5 h-3.5 text-slate-600" />
                                    NOTAM Advisories
                                </span>
                                <StatusBadge
                                    status={notamCritical > 0 ? "warning" : "info"}
                                    label={`${notamRelevant} ACTIVE`}
                                />
                            </div>
                            <div className="text-xs font-mono text-slate-700 space-y-0.5 tabular-nums">
                                <div>
                                    Critical notices:{" "}
                                    <strong className="text-slate-900">{notamCritical}</strong>
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    {notamRelevant === 0
                                        ? "No route-relevant FIR NOTAMs"
                                        : `${notamRelevant} active notice(s) in monitored FIR`}
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
                                    <span>Authorization Assessment</span>
                                    {assessment.model && (
                                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-600">
                                            {assessment.model}
                                        </span>
                                    )}
                                </span>
                            }
                            description={assessment.ai?.humanSummary}
                            rightSlot={
                                <StatusBadge
                                    status={
                                        assessment.ai?.decision ??
                                        assessment.deterministicVerdict ??
                                        "unknown"
                                    }
                                    label={decisionLabel}
                                />
                            }
                        >
                            {assessment.ai?.blockingReasons &&
                                assessment.ai.blockingReasons.length > 0 && (
                                    <div className="flex flex-col gap-1 pt-1">
                                        <span className="text-[10px] font-mono font-bold uppercase text-red-700 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            Blocking Reasons
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
                                        Operating Conditions
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
