"use client";

import { AlertTriangle, ArrowRight, BatteryMedium } from "lucide-react";
import { ChamferCard } from "@/components/ui";

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  time: string;
}

const DEFAULT_ALERTS: AlertItem[] = [
  {
    id: "1",
    title: "Battery Low",
    description: "UAV-008 • Battery at 32%",
    severity: "HIGH",
    time: "09:42",
  },
  {
    id: "2",
    title: "Geofence Risk",
    description: "UAV-008 • Approaching restricted zone",
    severity: "MEDIUM",
    time: "09:38",
  },
];

export function ActiveAlerts({
  alerts = DEFAULT_ALERTS,
}: {
  alerts?: AlertItem[];
}) {
  return (
    <ChamferCard size="lg" accent="dark" className="h-[273px]">
      <div className="p-4 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 font-mono tracking-wider">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span>ACTIVE ALERTS</span>
            </div>
            <a
              href="#"
              className="text-[11px] font-medium text-slate-500 hover:text-slate-900 flex items-center"
            >
              View all <ArrowRight className="h-3 w-3 ml-0.5" />
            </a>
          </div>

          <div className="space-y-2.5 mt-3">
            {alerts.map((alert) => {
              const isHigh = alert.severity === "HIGH";

              return (
                <ChamferCard
                  key={alert.id}
                  size="sm"
                  accent={isHigh ? "red" : "amber"}
                  className={isHigh ? "bg-[#fecdd3]" : "bg-[#fde68a]"}
                  innerClassName={`${isHigh ? "bg-[#fff1f2] text-red-950" : "bg-[#fffbeb] text-amber-950"} p-2.5 flex items-center justify-between`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`p-1.5 rounded-md ${
                        isHigh
                          ? "bg-red-100 text-red-600"
                          : "bg-amber-100 text-amber-600"
                      }`}
                    >
                      {isHigh ? (
                        <BatteryMedium className="h-4 w-4" />
                      ) : (
                        <AlertTriangle className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold font-mono">
                        {alert.title}
                      </h4>
                      <p
                        className={`text-[10px] font-mono ${
                          isHigh ? "text-red-700" : "text-amber-700"
                        }`}
                      >
                        {alert.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        isHigh
                          ? "bg-red-200 text-red-800"
                          : "bg-amber-200 text-amber-800"
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="block text-[9px] text-slate-500 font-mono mt-0.5">
                      {alert.time}
                    </span>
                  </div>
                </ChamferCard>
              );
            })}
          </div>
        </div>
      </div>
    </ChamferCard>
  );
}

export default ActiveAlerts;
