"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sliders, Edit2 } from "lucide-react";
import {
    Modal,
    ChamferButton,
    CustomSelect,
    FormInput,
    Switch,
    EmptyState,
    Skeleton,
} from "@/components/ui";
import { QUERY_KEYS, useEmergencyProtocols } from "@/hooks";
import { useAppLocale } from "@/i18n";
import { emergencyService } from "@/services/emergencyService";
import { localizeResponseAction, localizeServerText } from "@/utils";
import {
    RESPONSE_ACTION,
    RESPONSE_ACTIONS,
    type EmergencyProtocolVm,
    type ResponseAction,
    type UpdateEmergencyProtocolPayload,
} from "@/types";

export interface ResponseProtocolsModalProps {
    isOpen: boolean;
    onClose: () => void;
    canManageProtocols?: boolean;
}

export function ResponseProtocolsModal({
    isOpen,
    onClose,
    canManageProtocols = true,
}: ResponseProtocolsModalProps) {
    const t = useTranslations("emergency.modals.protocols");
    const tCommon = useTranslations("common");
    const locale = useAppLocale();
    const queryClient = useQueryClient();
    const { data: protocolsData, isLoading: protocolsLoading } = useEmergencyProtocols(isOpen);

    const actionOptions = useMemo(
        () =>
            RESPONSE_ACTIONS.map((action) => ({
                value: action,
                label: localizeResponseAction(action, locale, true),
            })),
        [locale]
    );

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAction, setEditAction] = useState<ResponseAction>(RESPONSE_ACTION.RTH);
    const [editTimeoutSec, setEditTimeoutSec] = useState<string>("30");

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: UpdateEmergencyProtocolPayload }) =>
            emergencyService.updateProtocol(id, payload),
        onSuccess: () => {
            toast.success(t("updatedToast"));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyProtocols });
            setEditingId(null);
        },
        meta: { defaultErrorMessage: t("updateFailed") },
    });

    if (!isOpen) return null;

    const protocols = protocolsData || [];

    const startEditing = (protocol: EmergencyProtocolVm) => {
        setEditingId(protocol.id);
        setEditAction(protocol.responseAction);
        setEditTimeoutSec(String(protocol.confirmationTimeoutSeconds ?? 30));
    };

    const handleToggleActive = (protocol: EmergencyProtocolVm, nextActive: boolean) => {
        updateMutation.mutate({
            id: protocol.id,
            payload: { isActive: nextActive },
        });
    };

    const handleSaveInline = (protocol: EmergencyProtocolVm) => {
        const parsedTimeout = Number.parseInt(editTimeoutSec, 10);
        updateMutation.mutate({
            id: protocol.id,
            payload: {
                responseAction: editAction,
                confirmationTimeoutSeconds:
                    !Number.isNaN(parsedTimeout) && parsedTimeout >= 0
                        ? parsedTimeout
                        : protocol.confirmationTimeoutSeconds,
            },
        });
    };

    const handleClose = () => {
        setEditingId(null);
        onClose();
    };

    const footer = (
        <ChamferButton variant="outline" size="sm" clip="xs" type="button" onClick={handleClose}>
            {tCommon("close")}
        </ChamferButton>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={t("title")}
            maxWidth="560px"
            footer={footer}
        >
            {protocolsLoading ? (
                <div
                    role="status"
                    aria-busy="true"
                    aria-label={t("loadingAria")}
                    className="border border-[var(--color-border-default)] rounded-md divide-y divide-[var(--color-border-default)] bg-[var(--color-surface-panel)]"
                >
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} className="p-3.5 flex items-center justify-between gap-3">
                            <div className="flex flex-col gap-1.5 flex-1">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-3 w-28" />
                            </div>
                            <Skeleton className="h-6 w-12 rounded-full" />
                        </div>
                    ))}
                    <span className="sr-only">{t("loadingAria")}</span>
                </div>
            ) : protocols.length === 0 ? (
                <EmptyState icon={Sliders} title={t("emptyTitle")} description={t("emptyDesc")} />
            ) : (
                <div className="border border-[var(--color-border-default)] rounded-md divide-y divide-[var(--color-border-default)] bg-[var(--color-surface-panel)]">
                    {protocols.map((protocol) => {
                        const isEditing = editingId === protocol.id;
                        const actionSelectId = `action-${protocol.id}`;
                        return (
                            <div key={protocol.id} className="p-3.5 flex flex-col gap-3">
                                <div className="flex justify-between items-center gap-3">
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <div className="font-semibold text-sm text-[var(--color-text-primary)] truncate">
                                            {localizeServerText(protocol.name, locale)}
                                        </div>
                                        <div className="text-xs font-mono text-[var(--color-text-muted)]">
                                            {t("actionPrefix")}{" "}
                                            <span className="font-bold text-slate-800">
                                                {localizeResponseAction(
                                                    protocol.responseAction,
                                                    locale,
                                                    true
                                                )}
                                            </span>
                                            {protocol.confirmationTimeoutSeconds != null && (
                                                <span>
                                                    {" "}
                                                    ·{" "}
                                                    {t("timeoutPrefix", {
                                                        sec: protocol.confirmationTimeoutSeconds,
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2.5 shrink-0">
                                        {canManageProtocols && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    isEditing
                                                        ? setEditingId(null)
                                                        : startEditing(protocol)
                                                }
                                                className="btn-icon"
                                                title={t("editTitle")}
                                                aria-label={t("editAria", { name: protocol.name })}
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}

                                        <Switch
                                            checked={protocol.isActive}
                                            disabled={
                                                !canManageProtocols || updateMutation.isPending
                                            }
                                            onCheckedChange={(checked) =>
                                                handleToggleActive(protocol, checked)
                                            }
                                            aria-label={t("toggleAria", { name: protocol.name })}
                                        />
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="pt-3 border-t border-[var(--color-border-default)] space-y-3">
                                        <div className="form-row-2">
                                            <div className="form-group">
                                                <label
                                                    className="form-label"
                                                    htmlFor={actionSelectId}
                                                >
                                                    {t("responseActionLabel")}
                                                </label>
                                                <CustomSelect
                                                    id={actionSelectId}
                                                    value={editAction}
                                                    onValueChange={(val) =>
                                                        setEditAction(val as ResponseAction)
                                                    }
                                                    options={actionOptions}
                                                />
                                            </div>
                                            <FormInput
                                                id={`timeout-${protocol.id}`}
                                                label={t("timeoutLabel")}
                                                type="number"
                                                min={0}
                                                step={1}
                                                value={editTimeoutSec}
                                                onChange={(e) => setEditTimeoutSec(e.target.value)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-end gap-2">
                                            <ChamferButton
                                                size="xs"
                                                variant="outline"
                                                onClick={() => setEditingId(null)}
                                                disabled={updateMutation.isPending}
                                            >
                                                {tCommon("cancel")}
                                            </ChamferButton>
                                            <ChamferButton
                                                size="xs"
                                                variant="dark"
                                                disabled={updateMutation.isPending}
                                                onClick={() => handleSaveInline(protocol)}
                                            >
                                                {tCommon("save")}
                                            </ChamferButton>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Modal>
    );
}
