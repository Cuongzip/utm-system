"use client";

import { ChamferCard } from "@/components/ui";

export interface TelemetryGaugeProps {
    label: string;
    value: number | string;
    unit?: string;
    offset: number;
    strokeColor: string;
    hasData?: boolean;
    valueClassName?: string;
}

export function TelemetryGauge({
    label,
    value,
    unit,
    offset,
    strokeColor,
    hasData = true,
    valueClassName = "text-slate-900",
}: TelemetryGaugeProps) {
    return (
        <ChamferCard size="md">
            <div className="p-3 bg-slate-50 flex flex-col items-center justify-center h-full">
                <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider uppercase mb-1">
                    {label}
                </span>
                <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                            cx="50"
                            cy="50"
                            fill="none"
                            r="38"
                            stroke="#e2e8f0"
                            strokeWidth="7"
                        />
                        <circle
                            cx="50"
                            cy="50"
                            fill="none"
                            r="38"
                            stroke={strokeColor}
                            strokeDasharray="238.76"
                            strokeDashoffset={offset}
                            strokeLinecap="round"
                            strokeWidth="7"
                            className="transition-all duration-500"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span
                            className={`text-base font-bold font-mono leading-none ${valueClassName}`}
                        >
                            {hasData ? value : "—"}
                        </span>
                        {unit && hasData && (
                            <span className="text-[9px] font-semibold text-slate-500 font-mono mt-0.5">
                                {unit}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </ChamferCard>
    );
}

export default TelemetryGauge;
