"use client";

import { Clock, Terminal, Loader2 } from "lucide-react";
import { ChamferCard, StatusBadge, EmptyState } from "@/components/ui";
import { useDroneCommands } from "@/hooks";
import { formatTime } from "@/utils/format";
import type { DroneCommand } from "@/types";

export interface RecentCommandsProps {
    droneId?: string | null;
    commands?: DroneCommand[];
}

export function RecentCommands({ droneId, commands: propCommands }: RecentCommandsProps) {
    const { data: commandList, isLoading } = useDroneCommands(droneId);

    const commands: DroneCommand[] =
        propCommands !== undefined ? propCommands : commandList?.items || [];

    return (
        <ChamferCard size="lg" className="h-[273px]">
            <div className="p-4 flex flex-col justify-between h-full">
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 font-mono tracking-wider">
                            <Clock className="h-4 w-4 text-slate-600" />
                            <span>RECENT COMMANDS</span>
                        </div>
                        {commands.length > 0 && (
                            <span className="text-[10px] font-mono text-slate-500 font-medium">
                                {commands.length} LOGGED
                            </span>
                        )}
                    </div>

                    <div className="mt-2.5 overflow-y-auto max-h-[195px] divide-y divide-slate-100 text-[11px] font-mono pr-1 custom-scrollbar flex-1">
                        {!droneId && propCommands === undefined ? (
                            <EmptyState
                                compact
                                icon={Terminal}
                                title="No drone selected"
                                description="Select an active flight to view command history"
                                className="py-7"
                            />
                        ) : isLoading && propCommands === undefined ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                                <Loader2 className="h-5 w-5 animate-spin mb-1 text-slate-400" />
                                <span className="text-[11px]">Loading commands...</span>
                            </div>
                        ) : commands.length === 0 ? (
                            <EmptyState
                                compact
                                icon={Clock}
                                title="No recent commands"
                                description="Awaiting operator instructions"
                                className="py-7"
                            />
                        ) : (
                            commands.map((cmd) => (
                                <div
                                    key={cmd.id}
                                    className="py-2 flex items-center justify-between gap-2"
                                >
                                    <div className="flex items-center space-x-2 text-slate-600 truncate min-w-0">
                                        <span className="text-slate-400 shrink-0 font-mono">
                                            {cmd.issuedAt || cmd.createdOn
                                                ? formatTime(cmd.issuedAt || cmd.createdOn)
                                                : "--:--:--"}
                                        </span>
                                        <span className="font-bold text-slate-800 uppercase shrink-0 font-mono">
                                            {cmd.commandType}
                                        </span>
                                        {cmd.errorMessage && (
                                            <span
                                                className="text-[10px] text-rose-500 truncate font-mono"
                                                title={cmd.errorMessage}
                                            >
                                                ({cmd.errorMessage})
                                            </span>
                                        )}
                                    </div>
                                    <div className="shrink-0">
                                        <StatusBadge status={cmd.status || "pending"} />
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

export default RecentCommands;
