"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, Copy, Check, ShieldOff, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
    ChamferCard,
    ChamferButton,
    StatusBadge,
    EmptyState,
    Modal,
    ConfirmDialog,
    FormInput,
    TacticalCallout,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableLoading,
} from "@/components/ui";
import { connectivityService } from "@/services";
import { QUERY_KEYS, useCopyFeedback, useIntegrationApiKeys } from "@/hooks";
import { createApiKeyBody } from "@/generated/connectivity";
import {
    OEM_API_KEY_SCOPES,
    type ApiKeyInfo,
    type CreateApiKeyPayload,
    type OemApiKeyScope,
} from "@/types";
import {
    formatDate,
    formatDateTime,
    validateSchema,
    clearFieldError,
    compareCreatedDesc,
} from "@/utils";

const SCOPE_DESC_KEY: Record<OemApiKeyScope, "telemetryWrite" | "droneRegister" | "statusRead"> = {
    "telemetry:write": "telemetryWrite",
    "drone:register": "droneRegister",
    "status:read": "statusRead",
};

export function ApiKeysTab() {
    const t = useTranslations("developer.keys");
    const tCommon = useTranslations("common");
    const queryClient = useQueryClient();
    const { data: rawKeys = [], isLoading } = useIntegrationApiKeys();
    const keys = useMemo(() => [...rawKeys].sort(compareCreatedDesc), [rawKeys]);

    const [createOpen, setCreateOpen] = useState(false);
    const [name, setName] = useState("");
    const [manufacturerName, setManufacturerName] = useState("");
    const [scopes, setScopes] = useState<OemApiKeyScope[]>(() => [...OEM_API_KEY_SCOPES]);
    const [expiresInDays, setExpiresInDays] = useState("90");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const [createdKey, setCreatedKey] = useState<{ apiKey: string; name: string } | null>(null);
    const { copiedKey, copyWithFeedback } = useCopyFeedback();
    const copiedNewKey = copiedKey === "newKey";
    const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyInfo | null>(null);

    const createMutation = useMutation({
        mutationFn: connectivityService.createApiKey,
        meta: { defaultErrorMessage: t("createError") },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrationKeys });
            setCreateOpen(false);
            setName("");
            setManufacturerName("");
            setScopes([...OEM_API_KEY_SCOPES]);
            setExpiresInDays("90");
            setFieldErrors({});
            if (res.apiKey) {
                setCreatedKey({
                    apiKey: res.apiKey,
                    name: res.keyInfo?.name || t("newKeyFallback"),
                });
            }
            toast.success(t("createdToast"));
        },
    });

    const revokeMutation = useMutation({
        mutationFn: (id: string) => connectivityService.revokeApiKey(id),
        meta: { defaultErrorMessage: t("revokeError") },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrationKeys });
            setKeyToRevoke(null);
            toast.success(t("revokedToast"));
        },
    });

    const toggleScope = (scope: OemApiKeyScope) => {
        setScopes((prev) =>
            prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
        );
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const parsedDays = expiresInDays.trim() ? Number(expiresInDays) : undefined;
        const payload = {
            name: name.trim(),
            manufacturerName: manufacturerName.trim(),
            scopes: scopes.length > 0 ? scopes : undefined,
            expiresInDays:
                parsedDays !== undefined && Number.isFinite(parsedDays) && parsedDays > 0
                    ? parsedDays
                    : undefined,
        };
        const validation = validateSchema<CreateApiKeyPayload>(createApiKeyBody, payload);
        if (!validation.success) {
            setFieldErrors(validation.errors);
            return;
        }
        createMutation.mutate(validation.data);
    };

    const handleCopyKey = async () => {
        if (!createdKey) return;
        const ok = await copyWithFeedback("newKey", createdKey.apiKey);
        if (ok) {
            toast.success(t("copiedToast"));
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                    {t("subtitlePrefix")}{" "}
                    <code className="text-[var(--color-text-primary)] font-semibold">
                        X-API-Key
                    </code>
                </span>
                <ChamferButton
                    variant="dark"
                    size="sm"
                    onClick={() => {
                        setFieldErrors({});
                        setCreateOpen(true);
                    }}
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t("createBtn")}</span>
                </ChamferButton>
            </div>

            {createdKey && (
                <TacticalCallout
                    tone="warning"
                    icon={AlertTriangle}
                    title={t("saveKeyTitle", { name: createdKey.name })}
                    description={t("saveKeyDesc")}
                    rightSlot={
                        <button
                            type="button"
                            onClick={() => setCreatedKey(null)}
                            className="text-xs font-mono text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                            {t("dismiss")}
                        </button>
                    }
                >
                    <div className="flex items-center gap-2 pt-1">
                        <code className="flex-1 rounded bg-slate-900 text-slate-100 px-3 py-2 text-xs font-mono break-all">
                            {createdKey.apiKey}
                        </code>
                        <ChamferButton variant="dark" size="sm" onClick={handleCopyKey}>
                            {copiedNewKey ? (
                                <Check className="w-3.5 h-3.5" />
                            ) : (
                                <Copy className="w-3.5 h-3.5" />
                            )}
                            <span>{copiedNewKey ? t("copied") : t("copy")}</span>
                        </ChamferButton>
                    </div>
                </TacticalCallout>
            )}

            <ChamferCard size="md">
                {!isLoading && keys.length === 0 ? (
                    <EmptyState
                        icon={KeyRound}
                        title={t("emptyTitle")}
                        description={t("emptyDesc")}
                    />
                ) : (
                    <Table fixed={false}>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("colKeyName")}</TableHead>
                                <TableHead>{t("colManufacturer")}</TableHead>
                                <TableHead>{t("colPrefix")}</TableHead>
                                <TableHead>{t("colScopes")}</TableHead>
                                <TableHead>{t("colStatus")}</TableHead>
                                <TableHead>{t("colExpires")}</TableHead>
                                <TableHead align="right">{t("colAction")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableLoading colSpan={7} rows={4} message={t("loading")} />
                            ) : (
                                keys.map((k) => {
                                    const isActive = k.isActive !== false && !k.revokedAt;
                                    return (
                                        <TableRow key={k.id}>
                                            <TableCell
                                                bold
                                                darkText
                                                className="max-w-[220px]"
                                                tooltip={k.name ?? undefined}
                                            >
                                                <div className="truncate">{k.name || "—"}</div>
                                                {k.lastUsedAt && (
                                                    <div className="text-[10px] font-mono text-slate-400 font-normal truncate">
                                                        {t("lastUsed", {
                                                            time: formatDateTime(k.lastUsedAt),
                                                        })}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                {k.manufacturerName || "—"}
                                            </TableCell>
                                            <TableCell mono className="whitespace-nowrap">
                                                {k.keyPrefix || "—"}…
                                            </TableCell>
                                            <TableCell className="min-w-[175px]">
                                                <div className="flex flex-wrap gap-1">
                                                    {(k.scopes ?? []).map((scope) => (
                                                        <span
                                                            key={scope}
                                                            className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px] text-slate-700"
                                                        >
                                                            {scope}
                                                        </span>
                                                    ))}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <StatusBadge
                                                    status={isActive ? "active" : "revoked"}
                                                />
                                            </TableCell>
                                            <TableCell
                                                mono
                                                className="whitespace-nowrap"
                                                tooltip={
                                                    k.expiresAt
                                                        ? formatDateTime(k.expiresAt)
                                                        : undefined
                                                }
                                            >
                                                {k.expiresAt
                                                    ? formatDate(k.expiresAt)
                                                    : tCommon("never")}
                                            </TableCell>
                                            <TableCell align="right">
                                                {isActive && k.id ? (
                                                    <ChamferButton
                                                        variant="outline"
                                                        size="xs"
                                                        onClick={() => setKeyToRevoke(k)}
                                                    >
                                                        <ShieldOff
                                                            className="w-3 h-3 text-red-600"
                                                            aria-hidden="true"
                                                        />
                                                        <span>{t("revoke")}</span>
                                                    </ChamferButton>
                                                ) : (
                                                    <span className="text-xs font-mono text-slate-400">
                                                        —
                                                    </span>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                )}
            </ChamferCard>

            <Modal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                title={t("modalTitle")}
                onSubmit={handleCreateSubmit}
                loading={createMutation.isPending}
                submitText={t("generateBtn")}
                loadingText={t("generating")}
            >
                <FormInput
                    id="api-key-name"
                    label={t("keyNameLabel")}
                    required
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        clearFieldError(setFieldErrors, "name");
                    }}
                    placeholder={t("keyNamePlaceholder")}
                    error={fieldErrors.name}
                />
                <FormInput
                    id="api-key-manufacturer"
                    label={t("manufacturerLabel")}
                    required
                    value={manufacturerName}
                    onChange={(e) => {
                        setManufacturerName(e.target.value);
                        clearFieldError(setFieldErrors, "manufacturerName");
                    }}
                    placeholder={t("manufacturerPlaceholder")}
                    error={fieldErrors.manufacturerName}
                />
                <FormInput
                    id="api-key-expires-days"
                    label={t("validityDaysLabel")}
                    type="number"
                    min={1}
                    max={3650}
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    placeholder="90"
                />

                <div className="flex flex-col gap-1.5">
                    <span className="form-label">{t("grantedScopesLabel")}</span>
                    <div className="border border-[var(--color-border-default)] rounded-md divide-y divide-[var(--color-border-default)] bg-[var(--color-surface-panel)]">
                        {OEM_API_KEY_SCOPES.map((scope) => {
                            const checked = scopes.includes(scope);
                            return (
                                <label
                                    key={scope}
                                    className="flex items-start gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-[var(--color-surface-subtle)] transition-colors"
                                >
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleScope(scope)}
                                        className="mt-0.5 rounded border-slate-300 accent-slate-800"
                                    />
                                    <div className="min-w-0">
                                        <div className="font-mono text-xs font-bold text-slate-800">
                                            {scope}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            {t(`scopes.${SCOPE_DESC_KEY[scope]}`)}
                                        </div>
                                    </div>
                                </label>
                            );
                        })}
                    </div>
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={Boolean(keyToRevoke)}
                onClose={() => setKeyToRevoke(null)}
                onConfirm={() => {
                    if (keyToRevoke?.id) revokeMutation.mutate(keyToRevoke.id);
                }}
                title={t("revokeModalTitle")}
                description={t("revokeModalDesc", {
                    name: keyToRevoke?.name ?? t("thisKeyFallback"),
                })}
                confirmText={t("revokeKeyConfirm")}
                loading={revokeMutation.isPending}
            />
        </div>
    );
}
