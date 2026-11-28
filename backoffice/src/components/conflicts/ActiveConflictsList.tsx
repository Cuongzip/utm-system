"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ShieldCheck, Check, ArrowLeftRight } from "lucide-react";
import { ChamferCard, ChamferButton, StatusBadge, EmptyState } from "@/components/ui";
import { cn } from "@/lib";
import type { AppLocale } from "@/i18n";
import { formatDateTime, formatDistance, formatAltitude, localizeServerText } from "@/utils";
import { useEntityCodeMap, useFlightsAll } from "@/hooks";
import { CONFLICT_STATUS, DEFAULT_CONFLICT_SEVERITY, type Conflict } from "@/types";

interface ActiveConflictsListProps {
    conflicts: Conflict[];
    selectedConflictId?: string | null;
    onSelectConflict?: (conflict: Conflict) => void;
    onAcknowledge: (conflictId: string) => void;
    onResolve: (conflict: Conflict) => void;
    isAcknowledging: boolean;
    canResolve?: boolean;
}

export function ActiveConflictsList({
    conflicts,
    selectedConflictId,
    onSelectConflict,
    onAcknowledge,
    onResolve,
    isAcknowledging = false,
    canResolve = true,
}: ActiveConflictsListProps) {
    const locale = useLocale() as AppLocale;
    const t = useTranslations("conflicts");
    const { data: flights = [] } = useFlightsAll();
    const entityMap = useEntityCodeMap();
    const [referenceNowMs, setReferenceNowMs] = useState<number | null>(null);

    useEffect(() => {
        const updateClock = () => setReferenceNowMs(Date.now());
        const initTimer = setTimeout(updateClock, 0);
        const interval = setInterval(updateClock, 30000);
        return () => {
            clearTimeout(initTimer);
            clearInterval(interval);
        };
    }, []);

    const flightMap = useMemo(
        () =>
            new Map(
                flights
                    .filter((f) => f.id)
                    .map((f) => [f.id, f.flightNumber || `FLT-${f.id.slice(0, 8).toUpperCase()}`])
            ),
        [flights]
    );

    if (conflicts.length === 0) {
        return (
            <ChamferCard size="md" innerClassName="p-6 text-center">
                <EmptyState
                    compact
                    icon={ShieldCheck}
                    title={t("cleanTitle")}
                    description={t("cleanDesc")}
                />
            </ChamferCard>
        );
    }

    return (
        <div
            className={cn(
                "grid gap-4",
                conflicts.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
            )}
        >
            {conflicts.map((conflict) => {
                const isSelected = selectedConflictId === conflict.id;
                const isAcknowledged = conflict.status === CONFLICT_STATUS.ACKNOWLEDGED;
                const isResolving = conflict.status === CONFLICT_STATUS.RESOLVING;

                const primaryFlightLabel = conflict.primaryFlightId
                    ? flightMap.get(conflict.primaryFlightId) ||
                      `FLT-${conflict.primaryFlightId.slice(0, 8).toUpperCase()}`
                    : null;
                const secondaryFlightLabel = conflict.secondaryFlightId
                    ? flightMap.get(conflict.secondaryFlightId) ||
                      `FLT-${conflict.secondaryFlightId.slice(0, 8).toUpperCase()}`
                    : null;

                const formattedType =
                    conflict.conflictType && t.has(`types.${conflict.conflictType}`)
                        ? t(`types.${conflict.conflictType}`)
                        : conflict.conflictType
                          ? conflict.conflictType.replace(/_/g, " ").toUpperCase()
                          : t("fallbackType");

                const recommendationSummary =
                    conflict.resolutionActions &&
                    typeof conflict.resolutionActions === "object" &&
                    typeof conflict.resolutionActions.summary === "string"
                        ? conflict.resolutionActions.summary
                        : null;

                const cleanDescription = conflict.description
                    ? conflict.description.replace(/\s*Closest point of approach:.*$/i, "").trim()
                    : null;

                const rawAdvisory = recommendationSummary || cleanDescription;
                const advisoryText = rawAdvisory
                    ? localizeServerText(rawAdvisory, locale, { entityMap })
                    : null;

                const detectedMs = conflict.detectedAt
                    ? new Date(conflict.detectedAt).getTime()
                    : NaN;
                const isRecentDetection =
                    referenceNowMs !== null &&
                    Number.isFinite(detectedMs) &&
                    referenceNowMs - detectedMs < 5 * 60 * 1000;

                return (
                    <ChamferCard
                        key={conflict.id}
                        size="md"
                        className={cn(isSelected && "bg-slate-400")}
                    >
                        <div className="p-4 flex flex-col justify-between h-full gap-3">
                            <button
                                type="button"
                                disabled={!onSelectConflict}
                                onClick={() => onSelectConflict?.(conflict)}
                                className="flex items-start justify-between gap-3 text-left w-full cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded"
                            >
                                <div className="flex flex-col gap-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        {(primaryFlightLabel || secondaryFlightLabel) && (
                                            <div className="flex items-center gap-1.5 font-mono text-xs">
                                                {primaryFlightLabel && (
                                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 font-bold border border-slate-200">
                                                        {primaryFlightLabel}
                                                    </span>
                                                )}
                                                {primaryFlightLabel && secondaryFlightLabel && (
                                                    <ArrowLeftRight
                                                        className="w-3.5 h-3.5 text-slate-400"
                                                        aria-label={t("inConflictWith")}
                                                    />
                                                )}
                                                {secondaryFlightLabel && (
                                                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-900 font-bold border border-slate-200">
                                                        {secondaryFlightLabel}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                        <h3 className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
                                            {formattedType}
                                        </h3>
                                    </div>

                                    {advisoryText && (
                                        <p className="text-xs text-slate-600 leading-relaxed font-sans">
                                            {advisoryText}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <StatusBadge
                                        status={conflict.severity ?? DEFAULT_CONFLICT_SEVERITY}
                                    />
                                </div>
                            </button>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-slate-100">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-slate-500">
                                    {isAcknowledged && (
                                        <span className="text-slate-600 font-semibold">
                                            {t("acknowledgedLabel")}
                                        </span>
                                    )}
                                    {isResolving && (
                                        <span className="text-slate-700 font-semibold">
                                            {t("resolvingLabel")}
                                        </span>
                                    )}
                                    {conflict.separationDistance != null && (
                                        <div>
                                            <span className="text-slate-400">CPA: </span>
                                            <span className="font-semibold text-slate-900 tabular-nums">
                                                {formatDistance(conflict.separationDistance)}
                                            </span>
                                            {conflict.minSeparationDistance != null && (
                                                <span className="text-slate-400">
                                                    {" "}
                                                    /{" "}
                                                    {formatDistance(conflict.minSeparationDistance)}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    {conflict.verticalSeparation != null && (
                                        <div>
                                            <span className="text-slate-400">ΔAlt: </span>
                                            <span className="font-semibold text-slate-800 tabular-nums">
                                                {formatAltitude(conflict.verticalSeparation)}
                                            </span>
                                        </div>
                                    )}
                                    {isRecentDetection &&
                                        conflict.timeToConflictSec != null &&
                                        conflict.timeToConflictSec > 0 && (
                                            <div>
                                                <span className="text-slate-400">TCPA: </span>
                                                <span className="font-semibold text-slate-800 tabular-nums">
                                                    {conflict.timeToConflictSec}s
                                                </span>
                                            </div>
                                        )}
                                    {conflict.detectedAt && (
                                        <div>
                                            <span className="text-slate-400">
                                                {t("detectedLabel")}
                                            </span>
                                            <span className="text-slate-700 tabular-nums">
                                                {formatDateTime(conflict.detectedAt)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {canResolve && (
                                    <div className="flex items-center gap-2 ml-auto">
                                        {!isAcknowledged && !isResolving && (
                                            <ChamferButton
                                                size="xs"
                                                variant="outline"
                                                clip="xs"
                                                onClick={() => onAcknowledge(conflict.id)}
                                                disabled={isAcknowledging}
                                            >
                                                <Check className="w-3.5 h-3.5 text-slate-600" />
                                                <span>{t("acknowledgeBtn")}</span>
                                            </ChamferButton>
                                        )}

                                        <ChamferButton
                                            size="xs"
                                            variant="dark"
                                            clip="xs"
                                            onClick={() => onResolve(conflict)}
                                        >
                                            <ShieldCheck className="w-3.5 h-3.5" />
                                            <span>{t("resolveBtn")}</span>
                                        </ChamferButton>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ChamferCard>
                );
            })}
        </div>
    );
}
