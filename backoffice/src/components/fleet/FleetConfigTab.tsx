"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
    ChamferCard,
    ChamferButton,
    StatusBadge,
    Modal,
    FormInput,
    Skeleton,
    Switch,
} from "@/components/ui";
import { fleetService } from "@/services";
import { QUERY_KEYS } from "@/hooks";
import type { FleetConfig, CreateFleetConfigPayload } from "@/types";

interface FleetConfigTabProps {
    activeConfig?: FleetConfig;
    configs: FleetConfig[];
    loading: boolean;
}

const WEIGHT_KEYS = ["proximity", "battery", "capability", "utilization", "maintenance"] as const;

type WeightKey = (typeof WEIGHT_KEYS)[number];

interface ConfigFormState {
    name: string;
    description: string;
    weights: Record<WeightKey, string>;
    minDronesPerHub: string;
    minDonorReserve: string;
    minBatteryForReposition: string;
    maxConcurrentRepositions: string;
    rebalanceCooldownMinutes: string;
    quietHoursOnly: boolean;
}

const DEFAULT_FORM: ConfigFormState = {
    name: "",
    description: "",
    weights: {
        proximity: "30",
        battery: "25",
        capability: "20",
        utilization: "15",
        maintenance: "10",
    },
    minDronesPerHub: "2",
    minDonorReserve: "2",
    minBatteryForReposition: "60",
    maxConcurrentRepositions: "2",
    rebalanceCooldownMinutes: "30",
    quietHoursOnly: false,
};

function parseNum(raw: string, fallback: number): number {
    if (raw.trim() === "") return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toPct(value?: number): number {
    if (value === undefined) return 0;
    return value <= 1 ? Math.round(value * 100) : Math.round(value);
}

function fromConfigToForm(cfg?: FleetConfig | null): ConfigFormState {
    if (!cfg) return DEFAULT_FORM;
    return {
        name: cfg.name ?? "",
        description: cfg.description ?? "",
        weights: {
            proximity: String(toPct(cfg.weights?.proximity ?? 0.3)),
            battery: String(toPct(cfg.weights?.battery ?? 0.25)),
            capability: String(toPct(cfg.weights?.capability ?? 0.2)),
            utilization: String(toPct(cfg.weights?.utilization ?? 0.15)),
            maintenance: String(toPct(cfg.weights?.maintenance ?? 0.1)),
        },
        minDronesPerHub: String(cfg.thresholds?.minDronesPerHub ?? 2),
        minDonorReserve: String(cfg.thresholds?.minDonorReserve ?? 2),
        minBatteryForReposition: String(cfg.thresholds?.minBatteryForReposition ?? 60),
        maxConcurrentRepositions: String(cfg.thresholds?.maxConcurrentRepositions ?? 2),
        rebalanceCooldownMinutes: String(cfg.thresholds?.rebalanceCooldownMinutes ?? 30),
        quietHoursOnly: cfg.thresholds?.quietHoursOnly ?? false,
    };
}

export function FleetConfigTab({ activeConfig, configs, loading }: FleetConfigTabProps) {
    const t = useTranslations("fleet.config");
    const tCommon = useTranslations("common");
    const queryClient = useQueryClient();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<FleetConfig | null>(null);
    const [form, setForm] = useState<ConfigFormState>(DEFAULT_FORM);

    const weightFields = useMemo(
        () =>
            WEIGHT_KEYS.map((key) => ({
                key,
                label: t(`weights.${key}`),
            })),
        [t]
    );

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fleetConfigs });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fleetActiveConfig });
    };

    const activateMutation = useMutation({
        mutationFn: (id: string) => fleetService.activateConfig(id),
        meta: { defaultErrorMessage: t("activateError") },
        onSuccess: (cfg) => {
            toast.success(t("activatedToast", { name: cfg.name ?? "" }));
            invalidate();
        },
    });

    const saveMutation = useMutation({
        mutationFn: async (payload: CreateFleetConfigPayload) => {
            if (editingConfig?.id) {
                return fleetService.updateConfig(editingConfig.id, payload);
            }
            return fleetService.createConfig(payload);
        },
        meta: { defaultErrorMessage: t("saveError") },
        onSuccess: () => {
            toast.success(editingConfig ? t("updatedToast") : t("createdToast"));
            setModalOpen(false);
            setEditingConfig(null);
            invalidate();
        },
    });

    const otherConfigs = useMemo(() => {
        return configs.filter((c) => c.id !== activeConfig?.id && !c.isActive);
    }, [configs, activeConfig?.id]);

    const openCreateModal = () => {
        setEditingConfig(null);
        setForm(DEFAULT_FORM);
        setModalOpen(true);
    };

    const openEditModal = (cfg: FleetConfig) => {
        setEditingConfig(cfg);
        setForm(fromConfigToForm(cfg));
        setModalOpen(true);
    };

    const weightSum = Object.values(form.weights).reduce((acc, v) => acc + parseNum(v, 0), 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error(t("nameRequiredToast"));
            return;
        }
        if (weightSum !== 100) {
            toast.error(t("weightSumToast", { sum: weightSum }));
            return;
        }
        const payload: CreateFleetConfigPayload = {
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            weights: {
                proximity: parseNum(form.weights.proximity, 0) / 100,
                battery: parseNum(form.weights.battery, 0) / 100,
                capability: parseNum(form.weights.capability, 0) / 100,
                utilization: parseNum(form.weights.utilization, 0) / 100,
                maintenance: parseNum(form.weights.maintenance, 0) / 100,
            },
            thresholds: {
                minDronesPerHub: Math.max(0, parseNum(form.minDronesPerHub, 2)),
                minDonorReserve: Math.max(0, parseNum(form.minDonorReserve, 2)),
                minBatteryForReposition: Math.min(
                    100,
                    Math.max(10, parseNum(form.minBatteryForReposition, 60))
                ),
                maxConcurrentRepositions: Math.max(1, parseNum(form.maxConcurrentRepositions, 2)),
                rebalanceCooldownMinutes: Math.max(1, parseNum(form.rebalanceCooldownMinutes, 30)),
                quietHoursOnly: form.quietHoursOnly,
            },
        };
        saveMutation.mutate(payload);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">
                    {t("heading")}
                </h2>
                <ChamferButton variant="dark" size="sm" onClick={openCreateModal}>
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t("newProfile")}</span>
                </ChamferButton>
            </div>

            {activeConfig && (
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
                                        {activeConfig.isPreset
                                            ? t("presetBadge")
                                            : t("customBadge")}
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
                                    onClick={() => openEditModal(activeConfig)}
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
                                            {activeConfig.thresholds?.minBatteryForReposition ??
                                                "—"}
                                            %
                                        </dd>
                                    </div>
                                    <div className="py-2 border-b border-slate-100">
                                        <dt className="text-[10px] font-mono uppercase text-slate-500">
                                            {t("maxConcurrent")}
                                        </dt>
                                        <dd className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                                            {activeConfig.thresholds?.maxConcurrentRepositions ??
                                                "—"}
                                        </dd>
                                    </div>
                                    <div className="py-2">
                                        <dt className="text-[10px] font-mono uppercase text-slate-500">
                                            {t("cooldown")}
                                        </dt>
                                        <dd className="font-mono text-sm font-bold text-slate-900 tabular-nums mt-0.5">
                                            {activeConfig.thresholds?.rebalanceCooldownMinutes ??
                                                "—"}{" "}
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
            )}

            {(loading || otherConfigs.length > 0) && (
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
                                                      {cfg.isPreset
                                                          ? t("presetBadge")
                                                          : t("customBadge")}
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
                                                  disabled={activateMutation.isPending || !cfg.id}
                                                  onClick={() =>
                                                      cfg.id && activateMutation.mutate(cfg.id)
                                                  }
                                              >
                                                  <Check className="w-3 h-3" />
                                                  <span>{t("activate")}</span>
                                              </ChamferButton>

                                              {!cfg.isPreset && (
                                                  <ChamferButton
                                                      variant="outline"
                                                      size="xs"
                                                      onClick={() => openEditModal(cfg)}
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
            )}

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingConfig ? t("editModalTitle") : t("createModalTitle")}
                maxWidth={560}
                onSubmit={handleSubmit}
                loading={saveMutation.isPending}
                submitText={editingConfig ? tCommon("saveChanges") : t("createProfileBtn")}
            >
                <FormInput
                    id="fleet-config-name"
                    label={t("profileNameLabel")}
                    required
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder={t("profileNamePlaceholder")}
                />
                <FormInput
                    id="fleet-config-description"
                    label={t("descriptionLabel")}
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder={t("descriptionPlaceholder")}
                />

                <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase text-slate-600">
                            {t("weightsPctHeading")}
                        </span>
                        <span
                            className={`text-xs font-mono font-bold tabular-nums ${
                                weightSum === 100 ? "text-emerald-700" : "text-red-600"
                            }`}
                        >
                            {t("totalPct", { sum: weightSum })}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {weightFields.map(({ key, label }) => (
                            <FormInput
                                key={key}
                                id={`fleet-weight-${key}`}
                                label={`${label} (%)`}
                                type="number"
                                min={0}
                                max={100}
                                value={form.weights[key]}
                                onChange={(e) =>
                                    setForm((prev) => ({
                                        ...prev,
                                        weights: {
                                            ...prev.weights,
                                            [key]: e.target.value,
                                        },
                                    }))
                                }
                            />
                        ))}
                    </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex flex-col gap-2">
                    <span className="text-xs font-mono font-bold uppercase text-slate-600">
                        {t("thresholdsHeading")}
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        <FormInput
                            id="fleet-threshold-min-drones"
                            label={t("minDronesPerHub")}
                            type="number"
                            min={0}
                            value={form.minDronesPerHub}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    minDronesPerHub: e.target.value,
                                }))
                            }
                        />
                        <FormInput
                            id="fleet-threshold-min-donor"
                            label={t("minDonorReserve")}
                            type="number"
                            min={0}
                            value={form.minDonorReserve}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    minDonorReserve: e.target.value,
                                }))
                            }
                        />
                        <FormInput
                            id="fleet-threshold-min-battery"
                            label={t("minBatteryPct")}
                            type="number"
                            min={10}
                            max={100}
                            value={form.minBatteryForReposition}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    minBatteryForReposition: e.target.value,
                                }))
                            }
                        />
                        <FormInput
                            id="fleet-threshold-max-concurrent"
                            label={t("maxConcurrent")}
                            type="number"
                            min={1}
                            max={20}
                            value={form.maxConcurrentRepositions}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    maxConcurrentRepositions: e.target.value,
                                }))
                            }
                        />
                        <FormInput
                            id="fleet-threshold-cooldown"
                            label={t("cooldownMin")}
                            type="number"
                            min={1}
                            value={form.rebalanceCooldownMinutes}
                            onChange={(e) =>
                                setForm((prev) => ({
                                    ...prev,
                                    rebalanceCooldownMinutes: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2">
                        <span className="text-xs font-medium text-slate-700">
                            {t("quietHoursToggle")}
                        </span>
                        <Switch
                            label={t("quietHoursToggleAria")}
                            checked={form.quietHoursOnly}
                            onCheckedChange={(checked) =>
                                setForm((prev) => ({ ...prev, quietHoursOnly: checked }))
                            }
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
