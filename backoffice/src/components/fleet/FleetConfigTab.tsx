"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { ChamferButton } from "@/components/ui";
import { fleetService } from "@/services";
import { QUERY_KEYS } from "@/hooks";
import type { FleetConfig, CreateFleetConfigPayload } from "@/types";
import {
    DEFAULT_FORM,
    fromConfigToForm,
    WEIGHT_KEYS,
    type ConfigFormState,
} from "./config/fleetConfigFormUtils";
import { ActiveProfileCard } from "./config/ActiveProfileCard";
import { AvailableProfilesGrid } from "./config/AvailableProfilesGrid";
import { FleetConfigModal } from "./config/FleetConfigModal";

interface FleetConfigTabProps {
    activeConfig?: FleetConfig;
    configs: FleetConfig[];
    loading: boolean;
}

export function FleetConfigTab({ activeConfig, configs, loading }: FleetConfigTabProps) {
    const t = useTranslations("fleet.config");
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
                <ActiveProfileCard
                    activeConfig={activeConfig}
                    weightFields={weightFields}
                    onEdit={openEditModal}
                />
            )}

            {(loading || otherConfigs.length > 0) && (
                <AvailableProfilesGrid
                    otherConfigs={otherConfigs}
                    loading={loading}
                    weightFields={weightFields}
                    isActivating={activateMutation.isPending}
                    onActivate={(id) => activateMutation.mutate(id)}
                    onEdit={openEditModal}
                />
            )}

            <FleetConfigModal
                isOpen={modalOpen}
                editingConfig={editingConfig}
                form={form}
                setForm={setForm}
                weightFields={weightFields}
                loading={saveMutation.isPending}
                onClose={() => setModalOpen(false)}
                onSave={(payload) => saveMutation.mutate(payload)}
            />
        </div>
    );
}
