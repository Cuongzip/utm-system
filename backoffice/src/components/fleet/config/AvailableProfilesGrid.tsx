"use client";

import { useTranslations } from "next-intl";
import { Check, Pencil } from "lucide-react";
import { ChamferCard, ChamferButton, Skeleton } from "@/components/ui";
import type { FleetConfig } from "@/types";
import { toPct, type WeightFieldOption } from "./fleetConfigFormUtils";

interface AvailableProfilesGridProps {
    otherConfigs: FleetConfig[];
    loading: boolean;
    weightFields: WeightFieldOption[];
    isActivating: boolean;
    onActivate: (id: string) => void;
    onEdit: (cfg: FleetConfig) => void;
}

export function AvailableProfilesGrid({
    otherConfigs,
    loading,
    weightFields,
    isActivating,
    onActivate,
    onEdit,
}: AvailableProfilesGridProps) {
    const t = useTranslations("fleet.config");
    const tCommon = useTranslations("common");

    return (
        <div className="flex flex-col gap-2.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                {t("availableProfiles", { count: otherConfigs.length })}
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {loading
                    ? Array.from({ length: 2 }).map((_, idx) => (
                          <ChamferCard key={idx} size="md">
                              <div className="p-4 h-36 flex flex-col justify-between">
                                  <div className="flex items-center justify-between gap-2">
                                      <Skeleton className="h-4 w-32" />
                                      <Skeleton className="h-4 w-14" />
                                  </div>
                                  <Skeleton className="h-3 w-full" />
                                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                      <Skeleton className="h-7 w-20" />
                                      <Skeleton className="h-7 w-16" />
                                  </div>
                              </div>
                          </ChamferCard>
                      ))
                    : otherConfigs.map((cfg) => (
                          <ChamferCard key={cfg.id} size="md">
                              <div className="p-4 flex flex-col justify-between gap-3 h-full">
                                  <div className="flex flex-col gap-1.5">
                                      <div className="flex items-center justify-between gap-2">
                                          <h3 className="text-sm font-bold text-slate-900 truncate">
                                              {cfg.name}
                                          </h3>
                                          <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                              {cfg.isPreset ? t("presetBadge") : t("customBadge")}
                                          </span>
                                      </div>
                                      {cfg.description && (
                                          <p className="text-xs text-slate-500 line-clamp-2">
                                              {cfg.description}
                                          </p>
                                      )}
                                      <p className="text-[11px] font-mono text-slate-600 leading-relaxed pt-1">
                                          {weightFields
                                              .map(
                                                  ({ key, label }) =>
                                                      `${label} ${toPct(cfg.weights?.[key])}%`
                                              )
                                              .join(" · ")}
                                      </p>
                                  </div>

                                  <div className="flex items-center justify-between pt-2.5 border-t border-slate-200">
                                      <ChamferButton
                                          variant="outline"
                                          size="xs"
                                          disabled={isActivating || !cfg.id}
                                          onClick={() => cfg.id && onActivate(cfg.id)}
                                      >
                                          <Check className="w-3 h-3" />
                                          <span>{t("activate")}</span>
                                      </ChamferButton>

                                      {!cfg.isPreset && (
                                          <ChamferButton
                                              variant="outline"
                                              size="xs"
                                              onClick={() => onEdit(cfg)}
                                          >
                                              <Pencil className="w-3 h-3" />
                                              <span>{tCommon("edit")}</span>
                                          </ChamferButton>
                                      )}
                                  </div>
                              </div>
                          </ChamferCard>
                      ))}
            </div>
        </div>
    );
}
