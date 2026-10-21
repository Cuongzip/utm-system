"use client";

import { PlaneTakeoff, PlaneLanding, Home } from "lucide-react";
import { ChamferCard } from "@/components/ui";

interface FlightControlProps {
    uavId?: string;
    statusText?: string;
}

export function FlightControl({
    uavId = "UAV-008",
    statusText = "Ready for control",
}: FlightControlProps) {
    return (
        <ChamferCard size="lg" accent="dark" className="h-[273px]">
            <div className="p-4 flex flex-col justify-between h-full">
                <div>
                    <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 font-mono tracking-wider">
                        <PlaneTakeoff className="h-4 w-4 text-slate-600" />
                        <span>FLIGHT CONTROL</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono mt-1">
                        {uavId} • {statusText}
                    </p>

                    <div className="grid grid-cols-3 gap-3 mt-4">
                        <ChamferCard size="md" accent="dark" className="bg-[#94a3b8]">
                            <button
                                type="button"
                                className="w-full h-28 flex flex-col items-center justify-center p-2 bg-[#475569] hover:bg-[#334155] text-white shadow-xs transition-colors group cursor-pointer border-none"
                            >
                                <PlaneTakeoff className="h-5 w-5 mb-2 group-hover:-translate-y-0.5 transition-transform text-white" />
                                <span className="text-xs font-bold font-mono">Takeoff</span>
                                <span className="text-[9px] text-[#e2e8f0] font-sans mt-0.5">
                                    Initiate takeoff
                                </span>
                            </button>
                        </ChamferCard>

                        <ChamferCard size="md" accent="dark">
                            <button
                                type="button"
                                className="w-full h-28 flex flex-col items-center justify-center p-2 bg-[#f8fafc] hover:bg-slate-100 text-[#334155] transition-colors group cursor-pointer border-none"
                            >
                                <PlaneLanding className="h-5 w-5 text-slate-600 mb-2 group-hover:translate-y-0.5 transition-transform" />
                                <span className="text-xs font-bold font-mono">Land</span>
                                <span className="text-[9px] text-[#94a3b8] font-sans mt-0.5">
                                    Return and land
                                </span>
                            </button>
                        </ChamferCard>

                        <ChamferCard size="md" accent="dark">
                            <button
                                type="button"
                                className="w-full h-28 flex flex-col items-center justify-center p-2 bg-[#f8fafc] hover:bg-slate-100 text-[#334155] transition-colors group cursor-pointer border-none"
                            >
                                <Home className="h-5 w-5 text-slate-600 mb-2" />
                                <span className="text-xs font-bold font-mono leading-tight text-center">
                                    Return to Home
                                </span>
                                <span className="text-[9px] text-[#94a3b8] font-sans mt-0.5">
                                    RTH
                                </span>
                            </button>
                        </ChamferCard>
                    </div>
                </div>
            </div>
        </ChamferCard>
    );
}

export default FlightControl;
