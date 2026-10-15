"use client";

import { AlertTriangle, ArrowRight, BatteryMedium } from "lucide-react";
import styles from "./ActiveAlerts.module.css";

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
    <div className={styles.panelWrapper}>
      <div className={`${styles.panelInner} p-4 bg-white flex flex-col justify-between h-full`}>
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-900 font-mono tracking-wider">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span>ACTIVE ALERTS</span>
            </div>
            <a
              href="#"
              className="text-[11px] font-medium text-slate-500 hover:text-cyan-600 flex items-center"
            >
              View all <ArrowRight className="h-3 w-3 ml-0.5" />
            </a>
          </div>

          <div className="space-y-2.5 mt-3">
            {alerts.map((alert) => {
              const isHigh = alert.severity === "HIGH";

              return (
                <div
                  key={alert.id}
                  className={isHigh ? styles.alertHighWrapper : styles.alertWarnWrapper}
                >
                  <div
                    className={`${styles.alertInner} p-2.5 flex items-start justify-between ${
                      isHigh ? "bg-red-50/50" : "bg-amber-50/50"
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      <div
                        className={`w-7 h-7 rounded-sm flex items-center justify-center shrink-0 mt-0.5 ${
                          isHigh
                            ? "bg-red-100 text-red-600"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isHigh ? (
                          <BatteryMedium className="h-4 w-4" />
                        ) : (
                          <AlertTriangle className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{alert.title}</h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {alert.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                          isHigh
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {alert.severity}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono mt-1">
                        {alert.time}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActiveAlerts;
