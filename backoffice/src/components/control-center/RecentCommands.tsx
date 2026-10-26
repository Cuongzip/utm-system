"use client";

import { Clock } from "lucide-react";
import { ChamferCard, StatusBadge } from "@/components/ui";

export interface CommandItem {
    id: string;
    time: string;
    uavId: string;
    action: string;
    status: "Success" | "Pending" | "Failed";
}

const DEFAULT_COMMANDS: CommandItem[] = [];

export function RecentCommands({ commands = DEFAULT_COMMANDS }: { commands?: CommandItem[] }) {
    return (
        <ChamferCard size="lg" accent="dark" className="h-[273px]">
            <div className="p-4 flex flex-col justify-between h-full">
                <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 font-mono tracking-wider">
                            <Clock className="h-4 w-4 text-slate-600" />
                            <span>RECENT COMMANDS</span>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-100 text-[11px] font-mono mt-1">
                        {commands.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400">
                                <span className="text-xs">No recent commands</span>
                                <span className="text-[10px] mt-1">
                                    Awaiting operator instructions
                                </span>
                            </div>
                        ) : (
                            commands.map((cmd) => (
                                <div
                                    key={cmd.id}
                                    className="py-2 flex items-center justify-between"
                                >
                                    <div className="flex items-center space-x-1.5 text-slate-600">
                                        <span className="text-slate-400">{cmd.time}</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        <span className="font-bold text-slate-800">
                                            {cmd.uavId}
                                        </span>
                                        <span className="text-slate-500">• {cmd.action}</span>
                                    </div>
                                    <StatusBadge status={cmd.status} showDot={false} />
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
