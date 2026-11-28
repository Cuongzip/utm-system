"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Clock, Terminal } from "lucide-react";
import { ChamferCard, StatusBadge, EmptyState, Skeleton } from "@/components/ui";
import { useDroneCommands, useEntityCodeMap } from "@/hooks";
import { useAppLocale } from "@/i18n";
import { formatTime, localizeResponseAction, localizeServerText } from "@/utils";
import { COMMAND_TYPE, type DroneCommand, DEFAULT_COMMAND_STATUS } from "@/types";

export interface RecentCommandsProps {
    droneId?: string | null;
}

export function RecentCommands({ droneId }: RecentCommandsProps) {
    const t = useTranslations("controlCenter");
    const locale = useAppLocale();
    const entityMap = useEntityCodeMap();
    const { data: commandList, isLoading } = useDroneCommands(droneId);

    const commands: DroneCommand[] = useMemo(() => {
        const raw = commandList?.items || [];
        return [...raw].sort((a, b) => {
            const tA = Date.parse(a.issuedAt || a.createdOn || "") || 0;
            const tB = Date.parse(b.issuedAt || b.createdOn || "") || 0;
            return tB - tA;
        });
    }, [commandList]);

    const getCommandDisplayName = (cmdType?: string | null) => {
        switch (cmdType) {
            case COMMAND_TYPE.TAKEOFF:
                return t("commands.tkof");
            case COMMAND_TYPE.LAND:
                return t("commands.land");
            case COMMAND_TYPE.RTL:
                return t("commands.rth");
            case COMMAND_TYPE.PAUSE:
                return t("commands.pause");
            case COMMAND_TYPE.HOVER:
                return t("commands.hover");
            case COMMAND_TYPE.RESUME:
                return t("commands.resume");
            case COMMAND_TYPE.EMERGENCY_STOP:
                return t("commands.emergencyStop");
            default:
                return localizeResponseAction(cmdType, locale, true);
        }
    };

    return (
        <ChamferCard size="lg" className="h-[272px]">
            <div className="px-4 py-3 border-b border-[var(--color-border-subtle)] flex items-center justify-between gap-3 shrink-0">
                <span className="text-xs font-bold text-[var(--color-text-primary)] font-mono tracking-wider uppercase truncate">
                    {t("recentCommands")}
                </span>
                {commands.length > 0 && (
                    <span className="text-[10px] font-mono text-[var(--color-text-muted)] font-semibold shrink-0">
                        {t("loggedCount", { count: commands.length })}
                    </span>
                )}
            </div>

            <div className="overflow-y-auto overscroll-contain divide-y divide-[var(--color-border-subtle)] text-[11px] font-mono flex-1 mr-0.5 my-0.5 max-h-[224px]">
                {!droneId ? (
                    <EmptyState
                        compact
                        icon={Terminal}
                        title={t("noDroneSelected")}
                        className="py-8"
                    />
                ) : isLoading ? (
                    <div
                        role="status"
                        aria-busy="true"
                        aria-label={t("loadingCommands")}
                        className="flex flex-col divide-y divide-[var(--color-border-subtle)]"
                    >
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <div
                                key={idx}
                                className="px-4 py-2.5 flex items-center justify-between gap-3"
                            >
                                <div className="flex items-center gap-2 flex-1">
                                    <Skeleton className="h-3.5 w-14" />
                                    <Skeleton className="h-3.5 w-24" />
                                </div>
                                <Skeleton className="h-4 w-16" />
                            </div>
                        ))}
                        <span className="sr-only">{t("loadingCommands")}</span>
                    </div>
                ) : commands.length === 0 ? (
                    <EmptyState
                        compact
                        icon={Clock}
                        title={t("noRecentCommands")}
                        className="py-8"
                    />
                ) : (
                    commands.map((cmd) => (
                        <div
                            key={cmd.id}
                            className="px-4 py-2 flex items-center justify-between gap-2"
                        >
                            <div className="flex items-center gap-2 text-[var(--color-text-secondary)] truncate min-w-0">
                                <span className="text-[var(--color-text-muted)] shrink-0 font-mono tabular-nums">
                                    {cmd.issuedAt || cmd.createdOn
                                        ? formatTime(cmd.issuedAt || cmd.createdOn)
                                        : "--:--:--"}
                                </span>
                                <span className="font-bold text-[var(--color-text-primary)] uppercase shrink-0 font-mono">
                                    {getCommandDisplayName(cmd.commandType)}
                                </span>
                                {cmd.errorMessage && (
                                    <span
                                        className="text-[10px] text-red-600 truncate font-mono"
                                        title={localizeServerText(cmd.errorMessage, locale, {
                                            entityMap,
                                        })}
                                    >
                                        (
                                        {localizeServerText(cmd.errorMessage, locale, {
                                            entityMap,
                                        })}
                                        )
                                    </span>
                                )}
                            </div>
                            <div className="shrink-0">
                                <StatusBadge status={cmd.status ?? DEFAULT_COMMAND_STATUS} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </ChamferCard>
    );
}
