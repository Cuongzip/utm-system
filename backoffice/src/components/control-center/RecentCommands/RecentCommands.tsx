"use client";

import { Clock, ArrowRight } from "lucide-react";
import { ChamferCard, StatusBadge } from "@/components/ui";

export interface CommandItem {
    id: string;
    time: string;
    uavId: string;
    action: string;
    status: "Success" | "Pending" | "Failed";
}

const DEFAULT_COMMANDS: CommandItem[] = [
    { id: "1", time: "09:42", uavId: "UAV-008", action: "Set waypoint (WP-3)", status: "Success" },
    { id: "2", time: "09:37", uavId: "UAV-012", action: "Change mode to AUTO", status: "Success" },
    { id: "3", time: "09:31", uavId: "UAV-007", action: "Return to home", status: "Success" },
    { id: "4", time: "09:28", uavId: "UAV-003", action: "Takeoff", status: "Success" },
    { id: "5", time: "09:21", uavId: "UAV-008", action: "Set altitude 120m", status: "Success" },
];

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
                        <a
                            href="#"
                            className="text-[11px] font-medium text-slate-500 hover:text-slate-900 flex items-center"
                        >
                            View all <ArrowRight className="h-3 w-3 ml-0.5" />
                        </a>
                    </div>

                    <div className="divide-y divide-slate-100 text-[11px] font-mono mt-1">
                        {commands.map((cmd) => (
                            <div key={cmd.id} className="py-2 flex items-center justify-between">
                                <div className="flex items-center space-x-1.5 text-slate-600">
                                    <span className="text-slate-400">{cmd.time}</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="font-bold text-slate-800">{cmd.uavId}</span>
                                    <span className="text-slate-500">• {cmd.action}</span>
                                </div>
                                <StatusBadge status={cmd.status} showDot={false} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </ChamferCard>
    );
}

export default RecentCommands;
