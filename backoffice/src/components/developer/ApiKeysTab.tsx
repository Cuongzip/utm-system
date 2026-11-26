"use client";

import { useMemo, useState } from "react";
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
import { QUERY_KEYS, useIntegrationApiKeys } from "@/hooks";
import { createApiKeyBody } from "@/generated/connectivity";
import {
    OEM_API_KEY_SCOPES,
    type ApiKeyInfo,
    type CreateApiKeyPayload,
    type OemApiKeyScope,
} from "@/types";
import { formatDateTime, validateSchema, clearFieldError, compareCreatedDesc } from "@/utils";

const SCOPE_DESCRIPTIONS: Record<OemApiKeyScope, string> = {
    "telemetry:write": "Ingest live drone GPS/attitude telemetry",
    "drone:register": "Register OEM drones & hardware devices",
    "status:read": "Read manufacturer fleet connectivity status",
};

export function ApiKeysTab() {
    const queryClient = useQueryClient();
    const { data: rawKeys = [], isLoading } = useIntegrationApiKeys();
    const keys = useMemo(() => [...rawKeys].sort(compareCreatedDesc), [rawKeys]);

    const [createOpen, setCreateOpen] = useState(false);
    const [name, setName] = useState("");
    const [manufacturerName, setManufacturerName] = useState("");
    const [scopes, setScopes] = useState<OemApiKeyScope[]>([
        "telemetry:write",
        "drone:register",
        "status:read",
    ]);
    const [expiresInDays, setExpiresInDays] = useState("90");
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    const [createdKey, setCreatedKey] = useState<{ apiKey: string; name: string } | null>(null);
    const [copiedNewKey, setCopiedNewKey] = useState(false);
    const [keyToRevoke, setKeyToRevoke] = useState<ApiKeyInfo | null>(null);

    const createMutation = useMutation({
        mutationFn: connectivityService.createApiKey,
        meta: { defaultErrorMessage: "Failed to create API key" },
        onSuccess: (res) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrationKeys });
            setCreateOpen(false);
            setName("");
            setManufacturerName("");
            setScopes(["telemetry:write", "drone:register", "status:read"]);
            setExpiresInDays("90");
            setFieldErrors({});
            if (res.apiKey) {
                setCreatedKey({
                    apiKey: res.apiKey,
                    name: res.keyInfo?.name || "New API Key",
                });
            }
            toast.success("OEM API key generated.");
        },
    });

    const revokeMutation = useMutation({
        mutationFn: (id: string) => connectivityService.revokeApiKey(id),
        meta: { defaultErrorMessage: "Failed to revoke API key" },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.integrationKeys });
            setKeyToRevoke(null);
            toast.success("API key revoked.");
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
        await navigator.clipboard.writeText(createdKey.apiKey);
        setCopiedNewKey(true);
        toast.success("API key copied to clipboard.");
        setTimeout(() => setCopiedNewKey(false), 2000);
    };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-mono text-[var(--color-text-secondary)]">
                    Authenticate external manufacturer gateways via{" "}
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
                    <span>Create API Key</span>
                </ChamferButton>
            </div>

            {createdKey && (
                <TacticalCallout
                    tone="warning"
                    icon={AlertTriangle}
                    title={`Save API Key Now — Shown Once (${createdKey.name})`}
                    description="Store this secret securely in your OEM bridge configuration. It cannot be retrieved again after dismissal."
                    rightSlot={
                        <button
                            type="button"
                            onClick={() => setCreatedKey(null)}
                            className="text-xs font-mono text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                            Dismiss
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
                            <span>{copiedNewKey ? "Copied" : "Copy"}</span>
                        </ChamferButton>
                    </div>
                </TacticalCallout>
            )}

            <ChamferCard size="md">
                {!isLoading && keys.length === 0 ? (
                    <EmptyState
                        icon={KeyRound}
                        title="No OEM API Keys Issued"
                        description="Create an API key to authenticate external OEM telemetry or drone registration integrations."
                    />
                ) : (
                    <Table fixed={false}>
                        <TableHeader>
                            <TableRow>
                                <TableHead>KEY NAME</TableHead>
                                <TableHead>MANUFACTURER</TableHead>
                                <TableHead>PREFIX</TableHead>
                                <TableHead>SCOPES</TableHead>
                                <TableHead>STATUS</TableHead>
                                <TableHead>EXPIRES</TableHead>
                                <TableHead align="right">ACTION</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableLoading colSpan={7} rows={4} message="Loading API keys..." />
                            ) : (
                                keys.map((k) => {
                                    const isActive = k.isActive !== false && !k.revokedAt;
                                    return (
                                        <TableRow key={k.id}>
                                            <TableCell bold darkText>
                                                <div>{k.name || "—"}</div>
                                                {k.lastUsedAt && (
                                                    <div className="text-[10px] font-mono text-slate-400 font-normal">
                                                        Last used {formatDateTime(k.lastUsedAt)}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>{k.manufacturerName || "—"}</TableCell>
                                            <TableCell mono>{k.keyPrefix || "—"}…</TableCell>
                                            <TableCell>
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
                                                    label={isActive ? "ACTIVE" : "REVOKED"}
                                                />
                                            </TableCell>
                                            <TableCell mono>
                                                {k.expiresAt
                                                    ? formatDateTime(k.expiresAt)
                                                    : "Never"}
                                            </TableCell>
                                            <TableCell align="right">
                                                {isActive && k.id ? (
                                                    <ChamferButton
                                                        variant="outline"
                                                        size="xs"
                                                        onClick={() => setKeyToRevoke(k)}
                                                    >
                                                        <ShieldOff className="w-3 h-3 text-red-600" />
                                                        <span>Revoke</span>
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
                title="Create OEM API Key"
                onSubmit={handleCreateSubmit}
                loading={createMutation.isPending}
                submitText="Generate Key"
                loadingText="Generating..."
            >
                <FormInput
                    id="api-key-name"
                    label="Key Name"
                    required
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        clearFieldError(setFieldErrors, "name");
                    }}
                    placeholder="e.g. DJI Dock 2 Production Bridge"
                    error={fieldErrors.name}
                />
                <FormInput
                    id="api-key-manufacturer"
                    label="Manufacturer Name"
                    required
                    value={manufacturerName}
                    onChange={(e) => {
                        setManufacturerName(e.target.value);
                        clearFieldError(setFieldErrors, "manufacturerName");
                    }}
                    placeholder="e.g. DJI Enterprise"
                    error={fieldErrors.manufacturerName}
                />
                <FormInput
                    id="api-key-expires-days"
                    label="Validity Duration (days)"
                    type="number"
                    min={1}
                    max={3650}
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                    placeholder="90"
                />

                <div className="flex flex-col gap-1.5">
                    <span className="form-label">Granted Scopes</span>
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
                                            {SCOPE_DESCRIPTIONS[scope]}
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
                title="Revoke OEM API Key"
                description={`Revoke "${keyToRevoke?.name ?? "this key"}"? Any OEM gateway authenticating with this key will be rejected immediately.`}
                confirmText="Revoke Key"
                loading={revokeMutation.isPending}
            />
        </div>
    );
}
