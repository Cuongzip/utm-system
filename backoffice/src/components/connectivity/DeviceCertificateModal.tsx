"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ShieldCheck,
    KeyRound,
    Copy,
    Check,
    Download,
    RefreshCw,
    ShieldOff,
    AlertTriangle,
    Loader2,
} from "lucide-react";
import {
    Modal,
    ChamferButton,
    StatusBadge,
    ConfirmDialog,
    FormInput,
    Skeleton,
    TacticalCallout,
    UnderlineTabs,
} from "@/components/ui";
import { connectivityService } from "@/services/connectivityService";
import { QUERY_KEYS, useCopyFeedback, useDeviceCertificate } from "@/hooks";
import { downloadTextFile, formatDateTime } from "@/utils";
import type { DeviceRegistration, IssuedCertificateBundle } from "@/types";
import { toast } from "sonner";

interface DeviceCertificateModalProps {
    isOpen: boolean;
    device: DeviceRegistration | null;
    onClose: () => void;
}

type PemTabId = "key" | "cert" | "ca";

function PemBlock({ label, pem, filename }: { label: string; pem?: string; filename: string }) {
    const t = useTranslations("connectivity.certModal");
    const { copiedKey, copyWithFeedback } = useCopyFeedback(1800);
    const copied = copiedKey === "pem";

    if (!pem) return null;

    const handleCopy = async () => {
        const ok = await copyWithFeedback("pem", pem);
        if (ok) {
            toast.success(t("copiedToast", { label }));
        } else {
            toast.error(t("copyErrorToast"));
        }
    };

    return (
        <div className="rounded border border-slate-200 bg-slate-50 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-800">
                    {label}
                </span>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white text-[11px] font-mono text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                        {copied ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                            <Copy className="w-3 h-3" />
                        )}
                        <span>{copied ? t("copied") : t("copy")}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => downloadTextFile(filename, pem)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white text-[11px] font-mono text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                        <Download className="w-3 h-3" />
                        <span>.pem</span>
                    </button>
                </div>
            </div>
            <pre className="text-[10px] font-mono text-slate-700 bg-white border border-slate-200 rounded p-2.5 max-h-32 overflow-auto whitespace-pre-wrap break-all">
                {pem}
            </pre>
        </div>
    );
}

function DeviceCertificateModalBody({
    device,
    onClose,
}: {
    device: DeviceRegistration;
    onClose: () => void;
}) {
    const t = useTranslations("connectivity.certModal");
    const tCommon = useTranslations("common");
    const queryClient = useQueryClient();
    const [issuedBundle, setIssuedBundle] = useState<IssuedCertificateBundle | null>(null);
    const [pemTab, setPemTab] = useState<PemTabId>("key");
    const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);
    const [revokeReason, setRevokeReason] = useState("");
    const [hasFetchedAfterIssue, setHasFetchedAfterIssue] = useState(false);

    const pemTabs = useMemo(
        () =>
            [
                { id: "key", label: t("tabKey") },
                { id: "cert", label: t("tabCert") },
                { id: "ca", label: t("tabCa") },
            ] as const,
        [t]
    );

    const shouldFetchCert = Boolean(device.certificateFingerprint) || hasFetchedAfterIssue;

    const { data: cert, isLoading } = useDeviceCertificate(device.id, shouldFetchCert);

    const issueMutation = useMutation({
        mutationFn: () => connectivityService.issueDeviceCertificate(device.id),
        onSuccess: (bundle) => {
            setIssuedBundle(bundle);
            setPemTab("key");
            setHasFetchedAfterIssue(true);
            toast.success(t("issuedToast"));
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.connectivityDeviceCert(device.id),
            });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivityDevices });
        },
        meta: { defaultErrorMessage: t("issueError") },
    });

    const revokeMutation = useMutation({
        mutationFn: () =>
            connectivityService.revokeDeviceCertificate(
                device.id,
                revokeReason.trim() || "Revoked by operator"
            ),
        onSuccess: () => {
            setIssuedBundle(null);
            setConfirmRevokeOpen(false);
            setRevokeReason("");
            toast.success(t("revokedToast"));
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.connectivityDeviceCert(device.id),
            });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivityDevices });
        },
        meta: { defaultErrorMessage: t("revokeError") },
    });

    const activeCert = cert && !cert.revokedAt ? cert : null;
    const slug = (device.deviceIdentifier || device.id).replace(/[^A-Za-z0-9_-]/g, "_");

    return (
        <>
            <Modal
                isOpen
                onClose={onClose}
                title={t("title", { id: device.deviceIdentifier || device.id.slice(0, 8) })}
                maxWidth={640}
                footer={
                    <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex items-center gap-2">
                            <ChamferButton
                                variant="dark"
                                size="sm"
                                disabled={issueMutation.isPending || revokeMutation.isPending}
                                onClick={() => issueMutation.mutate()}
                            >
                                {issueMutation.isPending ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="w-3.5 h-3.5" />
                                )}
                                <span>
                                    {activeCert || issuedBundle ? t("rotateBtn") : t("issueBtn")}
                                </span>
                            </ChamferButton>

                            {(activeCert || issuedBundle) && (
                                <ChamferButton
                                    variant="outline"
                                    size="sm"
                                    clip="xs"
                                    disabled={revokeMutation.isPending || issueMutation.isPending}
                                    onClick={() => setConfirmRevokeOpen(true)}
                                >
                                    <ShieldOff className="w-3.5 h-3.5 text-red-600" />
                                    <span className="text-red-700">{t("revokeBtn")}</span>
                                </ChamferButton>
                            )}
                        </div>

                        <ChamferButton variant="outline" size="sm" clip="xs" onClick={onClose}>
                            {tCommon("close")}
                        </ChamferButton>
                    </div>
                }
            >
                <div className="flex flex-col gap-4">
                    {issuedBundle && (
                        <div className="flex flex-col gap-3">
                            <TacticalCallout
                                tone="warning"
                                icon={AlertTriangle}
                                title={t("saveKeyWarningTitle")}
                                description={t("saveKeyWarningDesc")}
                            />

                            <UnderlineTabs
                                tabs={pemTabs}
                                activeTab={pemTab}
                                onTabChange={setPemTab}
                                ariaLabel={t("pemTabsAria")}
                            />

                            {pemTab === "key" && (
                                <PemBlock
                                    label={t("privateKeyPemLabel")}
                                    pem={issuedBundle.privateKeyPem}
                                    filename={`${slug}.key.pem`}
                                />
                            )}
                            {pemTab === "cert" && (
                                <PemBlock
                                    label={t("deviceCertPemLabel")}
                                    pem={issuedBundle.certificatePem}
                                    filename={`${slug}.crt.pem`}
                                />
                            )}
                            {pemTab === "ca" && (
                                <PemBlock
                                    label={t("rootCaPemLabel")}
                                    pem={issuedBundle.caCertificatePem}
                                    filename="utm-root-ca.crt.pem"
                                />
                            )}
                        </div>
                    )}

                    {isLoading ? (
                        <div
                            role="status"
                            aria-busy="true"
                            aria-label={t("loadingAria")}
                            className="rounded border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3"
                        >
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-44" />
                                <Skeleton className="h-5 w-16" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Array.from({ length: 4 }).map((_, idx) => (
                                    <div key={idx} className="flex flex-col gap-1.5">
                                        <Skeleton className="h-3 w-20" />
                                        <Skeleton className="h-4 w-36" />
                                    </div>
                                ))}
                            </div>
                            <span className="sr-only">{t("loadingSr")}</span>
                        </div>
                    ) : activeCert ? (
                        <div className="flex flex-col gap-3">
                            <div className="rounded border border-slate-200 bg-slate-50 p-3.5 flex flex-col gap-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900 uppercase">
                                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                        <span>{t("activeCertHeading")}</span>
                                    </div>
                                    <StatusBadge status="active" label={t("validBadge")} />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase block">
                                            {t("commonName")}
                                        </span>
                                        <span className="text-slate-900 font-semibold break-all">
                                            {activeCert.commonName || "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase block">
                                            {t("serialNumber")}
                                        </span>
                                        <span className="text-slate-900 break-all">
                                            {activeCert.serialNumber || "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase block">
                                            {t("issuedAt")}
                                        </span>
                                        <span className="text-slate-700">
                                            {activeCert.issuedAt
                                                ? formatDateTime(activeCert.issuedAt)
                                                : "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase block">
                                            {t("expiresAt")}
                                        </span>
                                        <span className="text-slate-700">
                                            {activeCert.expiresAt
                                                ? formatDateTime(activeCert.expiresAt)
                                                : "—"}
                                        </span>
                                    </div>
                                </div>

                                {activeCert.fingerprint && (
                                    <div className="pt-2 border-t border-slate-200">
                                        <span className="text-[10px] font-mono text-slate-400 uppercase block">
                                            {t("sha256Fingerprint")}
                                        </span>
                                        <span className="text-[11px] font-mono text-slate-700 break-all">
                                            {activeCert.fingerprint}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {!issuedBundle && (
                                <PemBlock
                                    label={t("publicCertPemLabel")}
                                    pem={activeCert.certificatePem}
                                    filename={`${slug}.crt.pem`}
                                />
                            )}
                        </div>
                    ) : (
                        !issuedBundle && (
                            <div className="rounded border border-dashed border-slate-300 bg-slate-50/70 p-8 text-center flex flex-col items-center gap-2">
                                <KeyRound className="w-7 h-7 text-slate-400" />
                                <p className="text-sm font-semibold text-slate-800">
                                    {t("noCertTitle")}
                                </p>
                                <p className="text-xs text-slate-500 max-w-md">{t("noCertDesc")}</p>
                            </div>
                        )
                    )}
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={confirmRevokeOpen}
                onClose={() => setConfirmRevokeOpen(false)}
                onConfirm={() => revokeMutation.mutate()}
                title={t("revokeModalTitle")}
                confirmText={t("revokeModalConfirm")}
                description={
                    <div className="flex flex-col gap-3">
                        <p>
                            {t("revokeDescPrefix")}
                            <strong className="font-mono text-slate-900">
                                {device.deviceIdentifier || device.id}
                            </strong>
                            {t("revokeDescSuffix")}
                        </p>
                        <FormInput
                            id="certRevokeReason"
                            label={t("revokeReasonLabel")}
                            value={revokeReason}
                            onChange={(e) => setRevokeReason(e.target.value)}
                            placeholder={t("revokeReasonPlaceholder")}
                        />
                    </div>
                }
            />
        </>
    );
}

export function DeviceCertificateModal({ isOpen, device, onClose }: DeviceCertificateModalProps) {
    if (!isOpen || !device) return null;
    return <DeviceCertificateModalBody key={device.id} device={device} onClose={onClose} />;
}
