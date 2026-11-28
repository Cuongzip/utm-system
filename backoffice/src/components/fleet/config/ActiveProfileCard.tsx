"use client";

import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { ChamferCard, ChamferButton, StatusBadge } from "@/components/ui";
import type { FleetConfig } from "@/types";
import { toPct, type WeightFieldOption } from "./fleetConfigFormUtils";

interface ActiveProfileCardProps {
    activeConfig: FleetConfig;
    weightFields: WeightFieldOption[];
    onEdit: (cfg: FleetConfig) => void;
}

export function ActiveProfileCard({ activeConfig, weightFields, onEdit }: ActiveProfileCardProps) {
    const t = useTranslations("fleet.config");
    const tCommon = useTranslations("common");

    return (
        <ChamferCard size="md">
            <div className="p-4 flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">
                                {activeConfig.name}
                            </h3>
                            <StatusBadge status="active" label={t("activeProfileBadge")} />
                            <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                {activeConfig.isPreset ? t("presetBadge") : t("customBadge")}
                            </span>
                        </div>
                        {activeConfig.description && (
                            <p className="text-xs text-slate-500 mt-0.5">
                                {activeConfig.description}
                            </p>
                        )}
                    </div>
                    {!activeConfig.isPreset && (
                        <ChamferButton
                            variant="outline"
                            size="xs"
                            onClick={() => onEdit(activeConfig)}
                        >
                            <Pencil className="w-3 h-3" />
                            <span>{tCommon("edit")}</span>
                        </ChamferButton>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2.5">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                            {t("weightsHeading")}
                        </span>
                        {weightFields.map(({ key, label }) => {
                            const pct = toPct(activeConfig.weights?.[key]);
                            return (
                                <div key={key} className="flex flex-col gap-1">
                                    <div className="flex justify-between text-xs font-mono">
                                        <span className="text-slate-700">{label}</span>
                                        <span className="font-bold text-slate-900 tabular-nums">
                                            {pct}%
                                        </span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                        <div
                                            className="h-full bg-slate-700"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex flex-col gap-2.5">
                        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                            {t("thresholdsHeading")}
                        </span>
                        <dl className="grid grid-cols-2 gap-x-6 text-xs">
                            <div className="py-2 border-b border-slate-100">
                                <dt className="text-[10px] font-mono uppercase text-slate-500">
                                    {t("minDronesPerHub")}
                                </dt>
                                <dd className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                                    {activeConfig.thresholds?.minDronesPerHub ?? "—"}
                                </dd>
                            </div>
                            <div className="py-2 border-b border-slate-100">
                                <dt className="text-[10px] font-mono uppercase text-slate-500">
                                    {t("minDonorReserve")}
                                </dt>
                                <dd className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                                    {activeConfig.thresholds?.minDonorReserve ?? "—"}
                                </dd>
                            </div>
                            <div className="py-2 border-b border-slate-100">
                                <dt className="text-[10px] font-mono uppercase text-slate-500">
                                    {t("minBattery")}
                                </dt>
                                <dd className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                                    {activeConfig.thresholds?.minBatteryForReposition ?? "—"}%
                                </dd>
                            </div>
                            <div className="py-2 border-b border-slate-100">
                                <dt className="text-[10px] font-mono uppercase text-slate-500">
                                    {t("maxConcurrent")}
                                </dt>
                                <dd className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                                    {activeConfig.thresholds?.maxConcurrentRepositions ?? "—"}
                                </dd>
                            </div>
                            <div className="py-2">
                                <dt className="text-[10px] font-mono uppercase text-slate-500">
                                    {t("cooldown")}
                                </dt>
                                <dd className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                                    {activeConfig.thresholds?.rebalanceCooldownMinutes ?? "—"}{" "}
                                    {t("minUnit")}
                                </dd>
                            </div>
                            <div className="py-2">
                                <dt className="text-[10px] font-mono uppercase text-slate-500">
                                    {t("quietHoursOnly")}
                                </dt>
                                <dd className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                                    {activeConfig.thresholds?.quietHoursOnly
                                        ? t("enabled")
                                        : t("disabled")}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>
        </ChamferCard>
    );
}
