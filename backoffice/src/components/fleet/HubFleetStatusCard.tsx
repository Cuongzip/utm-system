"use client";

import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { ChamferCard, StatusBadge } from "@/components/ui";
import type { HubFleetStatus } from "@/types";

interface HubFleetStatusCardProps {
    hub: HubFleetStatus;
    onSelectHub: (hub: HubFleetStatus) => void;
}

export function HubFleetStatusCard({ hub, onSelectHub }: HubFleetStatusCardProps) {
    const t = useTranslations("fleet.hubStatus");

    const hubId = hub.hubId ?? "";
    const total = hub.totalDrones ?? 0;
    const available = hub.availableDrones ?? 0;
    const busy = hub.busyDrones ?? 0;
    const charging = hub.chargingDrones ?? 0;
    const maintenance = hub.maintenanceDrones ?? 0;
    const utilizationPct = Math.min(100, Math.max(0, Math.round(hub.capacityUtilization ?? 0)));
    const readinessStatus =
        available === 0 && total > 0 ? "warning" : available > 0 ? "active" : "inactive";

    return (
        <ChamferCard size="md">
            <div className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                        <h2 className="text-sm font-bold text-slate-900 truncate">
                            {hub.hubName || t("vertiportHubFallback")}
                        </h2>
                        <p className="text-[11px] font-mono text-slate-500">
                            {t("dronesAvailableCount", { available, total })}
                        </p>
                    </div>
                    <StatusBadge
                        status={readinessStatus}
                        label={
                            readinessStatus === "active"
                                ? t("ready")
                                : readinessStatus === "warning"
                                  ? t("lowStock")
                                  : t("standby")
                        }
                    />
                </div>

                <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                        <span>{t("padUtilization")}</span>
                        <span className="font-bold text-slate-800 tabular-nums">
                            {utilizationPct}%
                        </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className={`h-full transition-[width] duration-300 ${
                                utilizationPct >= 85 ? "bg-amber-500" : "bg-slate-700"
                            }`}
                            style={{ width: `${utilizationPct}%` }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-4 divide-x divide-slate-200 border-t border-slate-100 pt-2.5 text-center">
                    <div>
                        <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                            {available}
                        </div>
                        <div className="text-[10px] font-mono uppercase text-slate-500">
                            {t("availShort")}
                        </div>
                    </div>
                    <div>
                        <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                            {busy}
                        </div>
                        <div className="text-[10px] font-mono uppercase text-slate-500">
                            {t("flightShort")}
                        </div>
                    </div>
                    <div>
                        <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                            {charging}
                        </div>
                        <div className="text-[10px] font-mono uppercase text-slate-500">
                            {t("chargeShort")}
                        </div>
                    </div>
                    <div>
                        <div className="font-mono text-sm font-bold tabular-nums text-slate-900">
                            {maintenance}
                        </div>
                        <div className="text-[10px] font-mono uppercase text-slate-500">
                            {t("maintShort")}
                        </div>
                    </div>
                </div>

                {hubId && total > 0 ? (
                    <button
                        type="button"
                        onClick={() => onSelectHub(hub)}
                        className="pt-2.5 border-t border-slate-200 inline-flex items-center justify-between w-full text-xs font-mono font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded group"
                    >
                        <span>{t("viewStationedAircraft", { total })}</span>
                        <ArrowRight
                            className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 group-hover:translate-x-0.5 transition-[color,transform]"
                            aria-hidden="true"
                        />
                    </button>
                ) : (
                    <div className="pt-2.5 border-t border-slate-100 text-xs font-mono text-slate-400">
                        {t("noStationedAircraft")}
                    </div>
                )}
            </div>
        </ChamferCard>
    );
}
