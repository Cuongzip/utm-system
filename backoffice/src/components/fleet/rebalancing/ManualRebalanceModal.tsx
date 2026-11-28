"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Modal, CustomSelect, Switch } from "@/components/ui";
import type { CreateRebalancingPayload, Drone, Hub } from "@/types";

interface ManualRebalanceModalProps {
    isOpen: boolean;
    onClose: () => void;
    hubs: Hub[];
    activeHubs: Hub[];
    drones: Drone[];
    loading: boolean;
    onSubmitTask: (payload: CreateRebalancingPayload, onReset: () => void) => void;
}

export function ManualRebalanceModal({
    isOpen,
    onClose,
    hubs,
    activeHubs,
    drones,
    loading,
    onSubmitTask,
}: ManualRebalanceModalProps) {
    const t = useTranslations("fleet.rebalancing");
    const [sourceHubId, setSourceHubId] = useState("");
    const [targetHubId, setTargetHubId] = useState("");
    const [droneId, setDroneId] = useState("");
    const [autoApprove, setAutoApprove] = useState(false);

    const hubOptions = useMemo(
        () =>
            (activeHubs.length > 0 ? activeHubs : hubs).map((h) => ({
                value: h.id,
                label: `${h.code ? `${h.code} — ` : ""}${h.name || h.id}`,
            })),
        [activeHubs, hubs]
    );

    const eligibleDrones = useMemo(() => {
        if (!sourceHubId) return drones;
        const atSource = drones.filter((d) => d.homeHubId === sourceHubId);
        return atSource.length > 0 ? atSource : drones;
    }, [drones, sourceHubId]);

    const droneOptions = useMemo(
        () =>
            eligibleDrones.map((d) => ({
                value: d.id,
                label: `${d.registrationNumber}${d.model ? ` (${d.model})` : ""}`,
            })),
        [eligibleDrones]
    );

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!sourceHubId || !targetHubId || !droneId) {
            toast.error(t("selectRequiredToast"));
            return;
        }
        if (sourceHubId === targetHubId) {
            toast.error(t("differentHubsToast"));
            return;
        }
        onSubmitTask({ sourceHubId, targetHubId, droneId, autoApprove }, () => {
            setSourceHubId("");
            setTargetHubId("");
            setDroneId("");
            setAutoApprove(false);
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={t("modalTitle")}
            onSubmit={handleManualSubmit}
            loading={loading}
            submitText={t("createTaskBtn")}
            loadingText={t("creatingTask")}
        >
            <div className="form-group">
                <label className="form-label" htmlFor="rebalance-source-hub">
                    {t("sourceHubLabel")} <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    id="rebalance-source-hub"
                    value={sourceHubId}
                    onValueChange={(val) => {
                        setSourceHubId(val);
                        setDroneId("");
                    }}
                    options={hubOptions}
                    placeholder={t("sourceHubPlaceholder")}
                />
            </div>
            <div className="form-group">
                <label className="form-label" htmlFor="rebalance-target-hub">
                    {t("targetHubLabel")} <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    id="rebalance-target-hub"
                    value={targetHubId}
                    onValueChange={setTargetHubId}
                    options={hubOptions.filter((o) => o.value !== sourceHubId)}
                    placeholder={t("targetHubPlaceholder")}
                />
            </div>
            <div className="form-group">
                <label className="form-label" htmlFor="rebalance-drone">
                    {t("droneLabel")} <span className="text-red-500">*</span>
                </label>
                <CustomSelect
                    id="rebalance-drone"
                    value={droneId}
                    onValueChange={setDroneId}
                    options={droneOptions}
                    placeholder={t("dronePlaceholder")}
                />
            </div>
            <div className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div>
                    <div className="text-xs font-semibold text-slate-800">
                        {t("autoApproveTitle")}
                    </div>
                    <div className="text-[11px] text-slate-500">{t("autoApproveDesc")}</div>
                </div>
                <Switch
                    label={t("autoApproveAria")}
                    checked={autoApprove}
                    onCheckedChange={setAutoApprove}
                />
            </div>
        </Modal>
    );
}
