"use client";

import type { Dispatch, SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Modal, FormInput, Switch } from "@/components/ui";
import type { CreateFleetConfigPayload, FleetConfig } from "@/types";
import {
    parseNum,
    toCreateFleetConfigPayload,
    type ConfigFormState,
    type WeightFieldOption,
} from "./fleetConfigFormUtils";

interface FleetConfigModalProps {
    isOpen: boolean;
    editingConfig: FleetConfig | null;
    form: ConfigFormState;
    setForm: Dispatch<SetStateAction<ConfigFormState>>;
    weightFields: WeightFieldOption[];
    loading: boolean;
    onClose: () => void;
    onSave: (payload: CreateFleetConfigPayload) => void;
}

export function FleetConfigModal({
    isOpen,
    editingConfig,
    form,
    setForm,
    weightFields,
    loading,
    onClose,
    onSave,
}: FleetConfigModalProps) {
    const t = useTranslations("fleet.config");
    const tCommon = useTranslations("common");

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
        onSave(toCreateFleetConfigPayload(form));
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingConfig ? t("editModalTitle") : t("createModalTitle")}
            maxWidth={560}
            onSubmit={handleSubmit}
            loading={loading}
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
    );
}
