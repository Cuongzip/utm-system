"use client";

import { Radio, AlertTriangle, ChevronRight, Drone, Bot, Signal } from "lucide-react";
import { ChamferCard, StatusBadge } from "@/components/ui";

export interface TelemetryData {
  uavId: string;
  model: string;
  serialNumber: string;
  hasAlert?: boolean;
  altitudeMeters: number;
  speedKmh: number;
  batteryPercent: number;
  headingDegrees: number;
  flightMode: string;
  connectionState: "LIVE" | "DEGRADED" | "OFFLINE";
}

const DEFAULT_TELEMETRY: TelemetryData = {
  uavId: "UAV-008",
  model: "DJI Matrice 300 RTK",
  serialNumber: "8F3A2C7",
  hasAlert: true,
  altitudeMeters: 120,
  speedKmh: 47,
  batteryPercent: 32,
  headingDegrees: 0,
  flightMode: "AUTO",
  connectionState: "LIVE",
};

export function LiveTelemetry({
  data = DEFAULT_TELEMETRY,
}: {
  data?: TelemetryData;
}) {
  return (
    <div className="bg-white border border-slate-300 rounded-lg p-4 flex flex-col justify-between h-[490px] relative shadow-xs">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Radio className="h-4 w-4 text-slate-600 animate-pulse" />
            <span className="text-xs font-bold font-mono tracking-wider text-slate-900 uppercase">
              LIVE TELEMETRY
            </span>
          </div>
          <StatusBadge status="live" label="LIVE" />
        </div>

        <ChamferCard size="md" accent="dark" className="mt-3 cursor-pointer hover:opacity-95 transition-opacity">
          <div className="p-3 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 chamfer-sm bg-white border border-slate-300 flex items-center justify-center text-slate-700 shadow-2xs">
                <Drone className="h-4 w-4 text-slate-700" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold font-mono text-slate-900">
                    {data.uavId}
                  </span>
                  {data.hasAlert && (
                    <StatusBadge status="alert" label="ALERT" />
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                  {data.model} • SN: {data.serialNumber}
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </div>
        </ChamferCard>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <ChamferCard size="md" accent="cyan">
            <div className="p-3 bg-slate-50 flex flex-col items-center justify-center h-full">
              <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider uppercase mb-1">
                ALTITUDE
              </span>
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="38" stroke="#e2e8f0" strokeWidth="7" />
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r="38"
                    stroke="#64748B"
                    strokeDasharray="238.76"
                    strokeDashoffset="65"
                    strokeLinecap="round"
                    strokeWidth="7"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-bold font-mono text-slate-900 leading-none">
                    {data.altitudeMeters}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-500 font-mono mt-0.5">
                    m
                  </span>
                </div>
              </div>
            </div>
          </ChamferCard>

          <ChamferCard size="md" accent="cyan">
            <div className="p-3 bg-slate-50 flex flex-col items-center justify-center h-full">
              <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider uppercase mb-1">
                SPEED
              </span>
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="38" stroke="#e2e8f0" strokeWidth="7" />
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r="38"
                    stroke="#475569"
                    strokeDasharray="238.76"
                    strokeDashoffset="110"
                    strokeLinecap="round"
                    strokeWidth="7"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-bold font-mono text-slate-900 leading-none">
                    {data.speedKmh}
                  </span>
                  <span className="text-[9px] font-semibold text-slate-500 font-mono mt-0.5">
                    km/h
                  </span>
                </div>
              </div>
            </div>
          </ChamferCard>

          <ChamferCard size="md" accent="amber">
            <div className="p-3 bg-slate-50 flex flex-col items-center justify-center h-full">
              <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider uppercase mb-1">
                BATTERY
              </span>
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="38" stroke="#e2e8f0" strokeWidth="7" />
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r="38"
                    stroke="#f59e0b"
                    strokeDasharray="238.76"
                    strokeDashoffset="162"
                    strokeLinecap="round"
                    strokeWidth="7"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-base font-bold font-mono text-amber-700 leading-none">
                    {data.batteryPercent}%
                  </span>
                </div>
              </div>
            </div>
          </ChamferCard>

          <ChamferCard size="md" accent="cyan">
            <div className="p-3 bg-slate-50 flex flex-col items-center justify-center h-full">
              <span className="text-[10px] font-bold text-slate-500 font-mono tracking-wider uppercase mb-1">
                HEADING
              </span>
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border border-dashed border-slate-300 relative flex items-center justify-center">
                  <span className="absolute top-0.5 text-[8px] font-bold font-mono text-slate-700">
                    N
                  </span>
                  <div className="w-1 h-1 rounded-full bg-slate-600 z-10" />
                  <div className="absolute top-2.5 w-0.5 h-5 bg-slate-600" />
                  <div className="absolute top-1.5 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-slate-600" />
                </div>
                <div className="absolute bottom-0 text-[10px] font-mono font-bold text-slate-700">
                  {data.headingDegrees}°
                </div>
              </div>
            </div>
          </ChamferCard>
        </div>
      </div>

        <div className="pt-3 mt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs font-mono">
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">MODE</span>
            <div className="flex items-center text-slate-800 font-bold mt-0.5">
              <Bot className="h-4 w-4 mr-1 text-slate-600" />
              {data.flightMode}
            </div>
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold block">
              CONNECTION
            </span>
            <div className="flex items-center text-emerald-600 font-bold mt-0.5">
              <Signal className="h-4 w-4 mr-1 text-emerald-600" />
              {data.connectionState}
            </div>
          </div>
        </div>
      </div>
  );
}

export default LiveTelemetry;
