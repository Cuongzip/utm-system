"use client";

import { Clock, Terminal } from "lucide-react";
import { ChamferCard, StatusBadge, EmptyState, Skeleton } from "@/components/ui";
import { useDroneCommands } from "@/hooks";
import { formatTime } from "@/utils";
import { type DroneCommand, DEFAULT_COMMAND_STATUS } from "@/types";

export interface RecentCommandsProps {
    droneId?: string | null;
}

export function RecentCommands({ droneId }: RecentCommandsProps) {
    const { data: commandList, isLoading } = useDroneCommands(droneId);
    const commands: DroneCommand[] = commandList?.items || [];

    return (
        <ChamferCard size="lg" className="h-[272px]">
            <div className="p-4 flex flex-col justify-between h-full">
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 font-mono tracking-wider uppercase">
                            <Clock className="h-4 w-4 text-slate-600" />
                            <span>RECENT COMMANDS</span>
                        </div>
                        {commands.length > 0 && (
                            <span className="text-[10px] font-mono text-slate-500 font-medium">
                                {commands.length} LOGGED
                            </span>
                        )}
                    </div>

                    <div className="mt-2 overflow-y-auto max-h-[195px] divide-y divide-slate-100 text-[11px] font-mono pr-1 custom-scrollbar flex-1">
                        {!droneId ? (
                            <EmptyState
                                compact
                                icon={Terminal}
                                title="No drone selected"
                                className="py-8"
                            />
                        ) : isLoading ? (
                            <div
                                role="status"
                                aria-busy="true"
                                aria-label="Loading commands"
                                className="flex flex-col divide-y divide-slate-100"
                            >
                                {Array.from({ length: 4 }).map((_, idx) => (
                                    <div
                                        key={idx}
                                        className="py-2.5 flex items-center justify-between gap-3"
                                    >
                                        <div className="flex items-center gap-2 flex-1">
                                            <Skeleton className="h-3.5 w-14" />
                                            <Skeleton className="h-3.5 w-24" />
                                        </div>
                                        <Skeleton className="h-4 w-16" />
                                    </div>
                                ))}
                                <span className="sr-only">Loading commands...</span>
                            </div>
                        ) : commands.length === 0 ? (
                            <EmptyState
                                compact
                                icon={Clock}
                                title="No recent commands"
                                className="py-8"
                            />
                        ) : (
                            commands.map((cmd) => (
                                <div
                                    key={cmd.id}
                                    className="py-2 flex items-center justify-between gap-2"
                                >
                                    <div className="flex items-center gap-2 text-slate-600 truncate min-w-0">
                                        <span className="text-slate-400 shrink-0 font-mono tabular-nums">
                                            {cmd.issuedAt || cmd.createdOn
                                                ? formatTime(cmd.issuedAt || cmd.createdOn)
                                                : "--:--:--"}
                                        </span>
                                        <span className="font-bold text-slate-800 uppercase shrink-0 font-mono">
                                            {cmd.commandType}
                                        </span>
                                        {cmd.errorMessage && (
                                            <span
                                                className="text-[10px] text-red-600 truncate font-mono"
                                                title={cmd.errorMessage}
                                            >
                                                ({cmd.errorMessage})
                                            </span>
                                        )}
                                    </div>
                                    <div className="shrink-0">
                                        <StatusBadge
                                            status={cmd.status ?? DEFAULT_COMMAND_STATUS}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </ChamferCard>
    );
}
