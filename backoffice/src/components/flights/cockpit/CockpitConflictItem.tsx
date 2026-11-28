"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui";
import { conflictService, droneService } from "@/services";
import { QUERY_KEYS, useConflictAdvice } from "@/hooks";
import type { AppLocale } from "@/i18n";
import { localizeResponseAction, localizeServerText } from "@/utils";
import {
    RESOLUTION_STRATEGY,
    type CommandType,
    type Conflict,
    type Flight,
    type ResolutionAdviceOption,
} from "@/types";

interface CockpitConflictItemProps {
    conflict: Conflict;
    flight: Flight;
    entityMap: ReadonlyMap<string, string>;
}

export function CockpitConflictItem({ conflict, flight, entityMap }: CockpitConflictItemProps) {
    const t = useTranslations("flights.deck");
    const tConflicts = useTranslations("conflicts");
    const locale = useLocale() as AppLocale;
    const queryClient = useQueryClient();
    const { data: advice } = useConflictAdvice(conflict.id, Boolean(conflict.id));
    const topOption: ResolutionAdviceOption | undefined = advice?.options?.[0];

    const applyAdviceMutation = useMutation({
        mutationFn: async (opt: ResolutionAdviceOption) => {
            if (flight.droneId && opt.commandType) {
                const normalizedCmd = opt.commandType.toLowerCase() as CommandType;
                await droneService.sendCommand(flight.droneId, {
                    commandType: normalizedCmd,
                    flightId: flight.id,
                    parameters: opt.recommendedActions
                        ? JSON.stringify(opt.recommendedActions)
                        : undefined,
                });
            }
            const strategy = opt.strategy?.toLowerCase() || RESOLUTION_STRATEGY.ALTITUDE_CHANGE;
            return conflictService.resolve(conflict.id, {
                strategy,
                actions: opt.recommendedActions ?? {
                    source: "cockpit",
                    rationale: opt.rationale || "Applied tactical resolution from Cockpit",
                },
            });
        },
        onSuccess: () => {
            toast.success(t("conflictResolvedToast"));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflictsActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightCommands(flight.id) });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightDetail(flight.id) });
        },
        meta: { defaultErrorMessage: t("conflictResolveFailed") },
    });

    const ackConflictMutation = useMutation({
        mutationFn: () => conflictService.acknowledge(conflict.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.conflictsActive });
        },
        meta: { defaultErrorMessage: t("conflictResolveFailed") },
    });

    return (
        <div className="rounded border border-slate-700/85 bg-slate-800/75 p-2.5 space-y-2">
            <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold uppercase text-white truncate">
                    {conflict.conflictType && tConflicts.has(`types.${conflict.conflictType}`)
                        ? tConflicts(`types.${conflict.conflictType}`)
                        : (conflict.conflictType ?? "SEPARATION").replace(/_/g, " ")}
                </span>
                <StatusBadge status={conflict.severity ?? "warning"} tone="dark" />
            </div>

            {conflict.description && (
                <p className="text-xs text-slate-300 leading-relaxed">
                    {localizeServerText(
                        flight.flightNumber
                            ? conflict.description.replaceAll(flight.id, flight.flightNumber)
                            : conflict.description,
                        locale,
                        { entityMap }
                    )}
                </p>
            )}

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-400">
                {conflict.separationDistance != null && (
                    <span>H-Sep: {Math.round(conflict.separationDistance)}m</span>
                )}
                {conflict.verticalSeparation != null && (
                    <span>V-Sep: {Math.round(conflict.verticalSeparation)}m</span>
                )}
                {conflict.timeToConflictSec != null && (
                    <span>TCPA: {Math.round(conflict.timeToConflictSec)}s</span>
                )}
            </div>

            {topOption && (
                <div className="rounded bg-slate-900/90 border border-slate-700 p-2 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase text-amber-300">
                        <span className="inline-flex items-center gap-1">
                            <Sparkles className="w-3 h-3" aria-hidden="true" />
                            <span>{t("recommendedAction")}</span>
                        </span>
                        <span>
                            {topOption.commandType
                                ? localizeResponseAction(topOption.commandType, locale, true)
                                : topOption.strategy.toUpperCase()}
                        </span>
                    </div>
                    <p className="text-[11px] text-slate-300">
                        {localizeServerText(topOption.rationale, locale, { entityMap })}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 pt-0.5">
                        <button
                            type="button"
                            disabled={ackConflictMutation.isPending}
                            onClick={() => ackConflictMutation.mutate()}
                            className="h-6 px-2 rounded border border-slate-600 bg-slate-800 hover:bg-slate-700 text-[10px] font-mono font-semibold text-slate-200 cursor-pointer disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                            {t("ackConflict")}
                        </button>
                        <button
                            type="button"
                            disabled={applyAdviceMutation.isPending}
                            onClick={() => applyAdviceMutation.mutate(topOption)}
                            className="chamfer-xs h-6 px-2.5 bg-white hover:bg-slate-200 text-[10px] font-mono font-bold uppercase text-slate-950 cursor-pointer disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                            {t("applyResolution")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
