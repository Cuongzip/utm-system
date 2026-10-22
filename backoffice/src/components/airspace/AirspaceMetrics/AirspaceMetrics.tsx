"use client";

import { Shield, ShieldAlert, ShieldCheck, Compass } from "lucide-react";
import { ChamferCard } from "@/components/ui";

interface AirspaceMetricsProps {
    totalZones?: number;
    activeZones?: number;
    restrictedCount?: number;
    corridorCount?: number;
}

export function AirspaceMetrics({
    totalZones = 0,
    activeZones = 0,
    restrictedCount = 0,
    corridorCount = 0,
}: AirspaceMetricsProps) {
    const activePercent = totalZones > 0 ? (activeZones / totalZones) * 100 : 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <ChamferCard size="md" accent="dark" className="h-[119px]">
                <div className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between w-full pl-2">
                        <span className="text-[11px] font-bold text-[#64748b] tracking-[0.55px] uppercase">
                            TOTAL SECTORS
                        </span>
                        <Shield className="w-4 h-4 text-[#64748b]" />
                    </div>

                    <div className="flex flex-col gap-0.5 pt-3 pl-1">
                        <span className="font-mono text-[30px] font-bold text-[#0f172a] tracking-[-0.75px] leading-9">
                            {totalZones}
                        </span>
                        <span className="text-[11px] text-[#94a3b8]">
                            Configured airspace zones
                        </span>
                    </div>
                </div>
            </ChamferCard>

            <ChamferCard size="md" accent="dark" className="h-[119px]">
                <div className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between w-full pl-2">
                        <span className="text-[11px] font-bold text-[#64748b] tracking-[0.55px] uppercase">
                            ACTIVE GEOFENCES
                        </span>
                        <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                    </div>

                    <div className="flex flex-col gap-2 pt-3 pl-1">
                        <span className="font-mono text-[30px] font-bold text-[#0f172a] tracking-[-0.75px] leading-9">
                            {activeZones}
                        </span>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${activePercent}%` }}
                            />
                        </div>
                    </div>
                </div>
            </ChamferCard>

            <ChamferCard size="md" accent="dark" className="h-[119px]">
                <div className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between w-full pl-2">
                        <span className="text-[11px] font-bold text-[#64748b] tracking-[0.55px] uppercase">
                            RESTRICTED & NFZ
                        </span>
                        <ShieldAlert className="w-4 h-4 text-[#ef4444]" />
                    </div>

                    <div className="flex flex-col gap-0.5 pt-3 pl-1">
                        <span className="font-mono text-[30px] font-bold text-[#0f172a] tracking-[-0.75px] leading-9">
                            {restrictedCount}
                        </span>
                        <span className="text-[11px] text-[#94a3b8]">
                            Prohibited & restricted zones
                        </span>
                    </div>
                </div>
            </ChamferCard>

            <ChamferCard size="md" accent="dark" className="h-[119px]">
                <div className="p-4 flex flex-col justify-between h-full">
                    <div className="flex items-center justify-between w-full pl-2">
                        <span className="text-[11px] font-bold text-[#64748b] tracking-[0.55px] uppercase">
                            CORRIDORS & WARNING
                        </span>
                        <Compass className="w-4 h-4 text-[#06b6d4]" />
                    </div>

                    <div className="flex flex-col gap-0.5 pt-3 pl-1">
                        <span className="font-mono text-[30px] font-bold text-[#0f172a] tracking-[-0.75px] leading-9">
                            {corridorCount}
                        </span>
                        <span className="text-[11px] text-[#94a3b8]">
                            Transit & advisory buffers
                        </span>
                    </div>
                </div>
            </ChamferCard>
        </div>
    );
}
