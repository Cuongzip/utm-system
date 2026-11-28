"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { CustomSelect } from "@/components/ui";
import { useAppLocale } from "@/i18n";
import { formatDistance } from "@/utils";
import { STOPOVER_TYPE, type Drone, type PlannedLeg } from "@/types";
import { cleanAirspaceWarning, formatCandidateLabel } from "./executeMissionPlanUtils";

interface ExecutionLegsListProps {
    legs: PlannedLeg[];
    hubCodeMap: ReadonlyMap<string, string>;
    drones: Drone[];
    isRelayMode: boolean;
    autoAssign: boolean;
    legDroneIds: Record<number, string>;
    onSelectLegDrone: (legIndex: number, droneId: string) => void;
}

export function ExecutionLegsList({
    legs,
    hubCodeMap,
    drones,
    isRelayMode,
    autoAssign,
    legDroneIds,
    onSelectLegDrone,
}: ExecutionLegsListProps) {
    const t = useTranslations("missions");
    const locale = useAppLocale();

    return (
        <div className="form-group">
            <label className="form-label">
                {t("executeModal.flightLegs", { count: legs.length })}
            </label>
            <div className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] divide-y divide-[var(--color-border-default)] max-h-48 overflow-y-auto">
                {legs.map((leg) => {
                    const depCode = leg.departureHubId ? hubCodeMap.get(leg.departureHubId) : null;
                    const arrCode = leg.arrivalHubId ? hubCodeMap.get(leg.arrivalHubId) : null;
                    const originLabel = leg.departureHubName || depCode || t("executeModal.origin");
                    const destLabel =
                        leg.arrivalHubName || arrCode || t("executeModal.destination");
                    const fullRouteTitle = `${originLabel} → ${destLabel}`;
                    const stopoverSuffix =
                        leg.stopoverType &&
                        leg.stopoverType !== STOPOVER_TYPE.NONE &&
                        leg.groundTimeMinutes != null &&
                        leg.groundTimeMinutes > 0
                            ? ` · +${leg.groundTimeMinutes}m`
                            : "";
                    const legWarnings = (leg.airspaceWarnings ?? []).map((w) =>
                        cleanAirspaceWarning(w, t, locale)
                    );

                    return (
                        <div key={leg.legIndex} className="px-3 py-2 flex flex-col gap-1">
                            <div className="flex items-center justify-between gap-2 text-xs font-mono">
                                <div
                                    className="flex items-center gap-2 min-w-0"
                                    title={fullRouteTitle}
                                >
                                    <span className="text-[11px] font-semibold text-slate-400 shrink-0 tabular-nums">
                                        L{leg.legIndex + 1}
                                    </span>
                                    <span className="font-semibold text-slate-900 truncate">
                                        {depCode || originLabel}
                                    </span>
                                    <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="font-semibold text-slate-900 truncate">
                                        {arrCode || destLabel}
                                    </span>
                                </div>
                                <span className="text-[11px] text-slate-500 shrink-0 whitespace-nowrap tabular-nums">
                                    {formatDistance(leg.distanceMeters, 1)} ·{" "}
                                    {Math.round(leg.estimatedEnergyWh)} Wh
                                    {stopoverSuffix}
                                </span>
                            </div>

                            {!leg.airspaceSafe && (
                                <div className="pl-5 text-[11px] text-slate-600 space-y-0.5">
                                    {legWarnings.length > 0 ? (
                                        legWarnings.map((w, wIdx) => <p key={wIdx}>• {w}</p>)
                                    ) : (
                                        <p>• {t("executeModal.restrictedViolation")}</p>
                                    )}
                                </div>
                            )}

                            {isRelayMode && !autoAssign && (
                                <CustomSelect
                                    value={legDroneIds[leg.legIndex] || ""}
                                    onValueChange={(val) => onSelectLegDrone(leg.legIndex, val)}
                                    options={[
                                        {
                                            value: "",
                                            label: t("executeModal.autoSelectLeg"),
                                        },
                                        ...(leg.candidateDrones?.length
                                            ? leg.candidateDrones.map((c) => ({
                                                  value: c.droneId,
                                                  label: formatCandidateLabel(c, t, locale),
                                              }))
                                            : drones.map((d) => ({
                                                  value: d.id,
                                                  label: d.registrationNumber || d.model || d.id,
                                              }))),
                                    ]}
                                    placeholder={t("executeModal.selectLegDrone")}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
