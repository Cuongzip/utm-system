"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui";
import { droneService } from "@/services";
import { QUERY_KEYS } from "@/hooks";
import type { AppLocale } from "@/i18n";
import { formatTime, localizeResponseAction, localizeServerText } from "@/utils";
import { summarizeCommandParams } from "../routeProgressUtils";
import { COMMAND_STATUS, DEFAULT_COMMAND_STATUS, type DroneCommand, type Flight } from "@/types";

interface CockpitCommandLogPanelProps {
    flight: Flight;
    sortedCommands: DroneCommand[];
    hubCodeMap: Map<string, string>;
    entityMap: ReadonlyMap<string, string>;
}

export function CockpitCommandLogPanel({
    flight,
    sortedCommands,
    hubCodeMap,
    entityMap,
}: CockpitCommandLogPanelProps) {
    const t = useTranslations("flights.deck");
    const tCtrl = useTranslations("controlCenter");
    const tc = useTranslations("common");
    const locale = useLocale() as AppLocale;
    const queryClient = useQueryClient();

    const cancelCommandMutation = useMutation({
        mutationFn: async (cmd: DroneCommand) => {
            if (!flight.droneId) throw new Error(tCtrl("disabledReasons.selectAircraft"));
            return droneService.cancelCommand(flight.droneId, cmd.id);
        },
        onSuccess: () => {
            toast.success(t("commandCancelledToast"));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.flightCommands(flight.id) });
            if (flight.droneId) {
                queryClient.invalidateQueries({
                    queryKey: QUERY_KEYS.droneCommands(flight.droneId),
                });
            }
        },
        meta: { defaultErrorMessage: t("commandCancelFailed") },
    });

    return (
        <div className="overflow-y-auto utm-scroll divide-y divide-slate-800 max-h-80">
            {sortedCommands.length === 0 ? (
                <div className="px-3 py-8 text-center text-xs font-mono text-slate-400">
                    {tCtrl("noRecentCommands")}
                </div>
            ) : (
                sortedCommands.map((cmd) => {
                    const statusLower = (cmd.status ?? DEFAULT_COMMAND_STATUS).toLowerCase();
                    const canCancel =
                        statusLower === COMMAND_STATUS.PENDING ||
                        statusLower === COMMAND_STATUS.SENT;
                    const paramSummary = summarizeCommandParams(cmd.parameters, hubCodeMap);
                    const ackMs =
                        cmd.issuedAt && cmd.acknowledgedAt
                            ? Math.max(0, Date.parse(cmd.acknowledgedAt) - Date.parse(cmd.issuedAt))
                            : null;

                    return (
                        <div
                            key={cmd.id}
                            className="px-3 py-2 flex items-center justify-between gap-2 font-mono text-[11px]"
                        >
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 truncate">
                                    <span className="text-slate-400 tabular-nums shrink-0">
                                        {cmd.issuedAt || cmd.createdOn
                                            ? formatTime(cmd.issuedAt || cmd.createdOn)
                                            : "--:--:--"}
                                    </span>
                                    <span className="font-bold text-white uppercase">
                                        {localizeResponseAction(cmd.commandType, locale, true)}
                                    </span>
                                    {paramSummary && (
                                        <span className="text-slate-300 truncate">
                                            {paramSummary}
                                        </span>
                                    )}
                                </div>
                                {(ackMs != null || cmd.errorMessage) && (
                                    <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                        {ackMs != null && <span>ACK {ackMs}ms</span>}
                                        {cmd.errorMessage && (
                                            <span className="text-red-400 ml-1">
                                                {localizeServerText(cmd.errorMessage, locale, {
                                                    entityMap,
                                                })}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                {canCancel && (
                                    <button
                                        type="button"
                                        onClick={() => cancelCommandMutation.mutate(cmd)}
                                        disabled={cancelCommandMutation.isPending}
                                        className="px-1.5 py-0.5 rounded border border-slate-600 hover:bg-slate-800 text-[10px] text-slate-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                                    >
                                        {tc("cancel")}
                                    </button>
                                )}
                                <StatusBadge
                                    status={cmd.status ?? DEFAULT_COMMAND_STATUS}
                                    tone="dark"
                                />
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
}
