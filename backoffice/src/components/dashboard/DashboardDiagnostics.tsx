"use client";

import { ChamferCard, StatusBadge } from "@/components/ui";

export interface DashboardDiagnosticsProps {
    hubsOnline: number;
    totalHubs: number;
    fleetSize: number;
    conflictsCount: number;
}

export function DashboardDiagnostics({
    hubsOnline,
    totalHubs,
    fleetSize,
    conflictsCount,
}: DashboardDiagnosticsProps) {
    const isThreatElevated = conflictsCount > 0;

    return (
        <ChamferCard size="lg" className="h-full min-h-[340px]">
            <div className="p-5 flex flex-col justify-between h-full">
                <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 font-mono tracking-wider">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>SYSTEM DIAGNOSTICS</span>
                        </div>
                        <StatusBadge status="online" label="HEALTHY" shape="rounded" />
                    </div>

                    <div className="mt-4 space-y-3.5">
                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-500 font-medium">API SERVER</span>
                            <span className="border-b border-dotted border-slate-200 flex-1 mx-3" />
                            <span className="text-emerald-600 font-bold">CONNECTED</span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-500 font-medium">HUBS ONLINE</span>
                            <span className="border-b border-dotted border-slate-200 flex-1 mx-3" />
                            <span className="text-slate-800 font-bold">
                                {hubsOnline} / {totalHubs}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-500 font-medium">FLEET SIZE</span>
                            <span className="border-b border-dotted border-slate-200 flex-1 mx-3" />
                            <span className="text-slate-800 font-bold">{fleetSize} UNITS</span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-500 font-medium">THREAT LEVEL</span>
                            <span className="border-b border-dotted border-slate-200 flex-1 mx-3" />
                            <span
                                className={`font-bold ${
                                    isThreatElevated ? "text-rose-600" : "text-emerald-600"
                                }`}
                            >
                                {isThreatElevated ? "ELEVATED" : "NOMINAL"}
                            </span>
                        </div>

                        <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-500 font-medium">
                                PROTOCOL VERIFICATION
                            </span>
                            <span className="border-b border-dotted border-slate-200 flex-1 mx-3" />
                            <span className="text-slate-600 font-semibold">BFF v4.2 CERTIFIED</span>
                        </div>
                    </div>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>LATENCY: 12ms • WEBSOCKET: STOMP SYNCED</span>
                    <span>POLL RATE: 1000ms</span>
                </div>
            </div>
        </ChamferCard>
    );
}

export default DashboardDiagnostics;
