"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { ApiError } from "@/services/apiClient";
import { QUERY_KEYS } from "@/hooks";
import { formatDateTime } from "@/utils";
import type { DeviceRegistration, IssuedCertificateBundle } from "@/types";
import { toast } from "sonner";

export interface DeviceCertificateModalProps {
    isOpen: boolean;
    device: DeviceRegistration | null;
    onClose: () => void;
}

type PemTabId = "key" | "cert" | "ca";

const PEM_TABS = [
    { id: "key", label: "Private Key (One-Time)" },
    { id: "cert", label: "Device Cert" },
    { id: "ca", label: "Root CA" },
] as const;

function downloadPem(filename: string, content: string) {
    const blob = new Blob([content], { type: "application/x-pem-file" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function PemBlock({ label, pem, filename }: { label: string; pem?: string; filename: string }) {
    const [copied, setCopied] = useState(false);

    if (!pem) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(pem);
            setCopied(true);
            toast.success(`${label} copied to clipboard`);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            toast.error("Failed to copy PEM to clipboard");
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
                        <span>{copied ? "Copied" : "Copy"}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => downloadPem(filename, pem)}
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
    const queryClient = useQueryClient();
    const [issuedBundle, setIssuedBundle] = useState<IssuedCertificateBundle | null>(null);
    const [pemTab, setPemTab] = useState<PemTabId>("key");
    const [confirmRevokeOpen, setConfirmRevokeOpen] = useState(false);
    const [revokeReason, setRevokeReason] = useState("");
    const [hasFetchedAfterIssue, setHasFetchedAfterIssue] = useState(false);

    const shouldFetchCert = Boolean(device.certificateFingerprint) || hasFetchedAfterIssue;

    const { data: cert, isLoading } = useQuery({
        queryKey: QUERY_KEYS.connectivityDeviceCert(device.id),
        queryFn: async () => {
            try {
                return await connectivityService.getDeviceCertificate(device.id);
            } catch (err) {
                if (err instanceof ApiError && err.status === 404) {
                    return null;
                }
                throw err;
            }
        },
        enabled: shouldFetchCert,
        retry: false,
    });

    const issueMutation = useMutation({
        mutationFn: () => connectivityService.issueDeviceCertificate(device.id),
        onSuccess: (bundle) => {
            setIssuedBundle(bundle);
            setPemTab("key");
            setHasFetchedAfterIssue(true);
            toast.success("90-day RSA-2048 X.509 device certificate issued");
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.connectivityDeviceCert(device.id),
            });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivityDevices });
        },
        meta: { defaultErrorMessage: "Failed to issue device certificate" },
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
            toast.success("Device X.509 certificate revoked");
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.connectivityDeviceCert(device.id),
            });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.connectivityDevices });
        },
        meta: { defaultErrorMessage: "Failed to revoke device certificate" },
    });

    const activeCert = cert && !cert.revokedAt ? cert : null;
    const slug = (device.deviceIdentifier || device.id).replace(/[^A-Za-z0-9_-]/g, "_");

    return (
        <>
            <Modal
                isOpen
                onClose={onClose}
                title={`X.509 mTLS Certificate — ${device.deviceIdentifier || device.id.slice(0, 8)}`}
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
                                    {activeCert || issuedBundle
                                        ? "Rotate Certificate (90d)"
                                        : "Issue 90-Day Certificate"}
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
                                    <span className="text-red-700">Revoke</span>
                                </ChamferButton>
                            )}
                        </div>

                        <ChamferButton variant="outline" size="sm" clip="xs" onClick={onClose}>
                            Close
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
                                title="Save the private key now — shown once only"
                                description="Store the PKCS#8 RSA-2048 private key securely on the edge drone or gateway. Closing this dialog clears it permanently."
                            />

                            <UnderlineTabs
                                tabs={PEM_TABS}
                                activeTab={pemTab}
                                onTabChange={setPemTab}
                                ariaLabel="Issued PEM artifacts"
                            />

                            {pemTab === "key" && (
                                <PemBlock
                                    label="Private Key (PKCS#8 PEM)"
                                    pem={issuedBundle.privateKeyPem}
                                    filename={`${slug}.key.pem`}
                                />
                            )}
                            {pemTab === "cert" && (
                                <PemBlock
                                    label="Device Certificate (X.509 PEM)"
                                    pem={issuedBundle.certificatePem}
                                    filename={`${slug}.crt.pem`}
                                />
                            )}
                            {pemTab === "ca" && (
                                <PemBlock
                                    label="UTM Root CA Certificate (PEM)"
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
                            aria-label="Loading X.509 certificate metadata"
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
                            <span className="sr-only">Loading X.509 certificate metadata...</span>
                        </div>
                    ) : activeCert ? (
                        <div className="flex flex-col gap-3">
                            <div className="rounded border border-slate-200 bg-slate-50 p-3.5 flex flex-col gap-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-900 uppercase">
                                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                        <span>Active Device Certificate</span>
                                    </div>
                                    <StatusBadge status="active" label="VALID" />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase block">
                                            Common Name (CN)
                                        </span>
                                        <span className="text-slate-900 font-semibold break-all">
                                            {activeCert.commonName || "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase block">
                                            Serial Number
                                        </span>
                                        <span className="text-slate-900 break-all">
                                            {activeCert.serialNumber || "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase block">
                                            Issued At
                                        </span>
                                        <span className="text-slate-700">
                                            {activeCert.issuedAt
                                                ? formatDateTime(activeCert.issuedAt)
                                                : "—"}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-400 uppercase block">
                                            Expires At
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
                                            SHA-256 Fingerprint
                                        </span>
                                        <span className="text-[11px] font-mono text-slate-700 break-all">
                                            {activeCert.fingerprint}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {!issuedBundle && (
                                <PemBlock
                                    label="Public Certificate (X.509 PEM)"
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
                                    No Active X.509 Certificate
                                </p>
                                <p className="text-xs text-slate-500 max-w-md">
                                    Issue a 90-day RSA-2048 X.509 v3 certificate signed by the UTM
                                    Root CA to authenticate this device over mutual TLS.
                                </p>
                            </div>
                        )
                    )}
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={confirmRevokeOpen}
                onClose={() => setConfirmRevokeOpen(false)}
                onConfirm={() => revokeMutation.mutate()}
                title="Revoke X.509 Certificate"
                confirmText="Revoke Certificate"
                description={
                    <div className="flex flex-col gap-3">
                        <p>
                            Revoking the active certificate for{" "}
                            <strong className="font-mono text-slate-900">
                                {device.deviceIdentifier || device.id}
                            </strong>{" "}
                            immediately invalidates its mTLS credentials.
                        </p>
                        <FormInput
                            id="certRevokeReason"
                            label="Revocation Reason (optional)"
                            value={revokeReason}
                            onChange={(e) => setRevokeReason(e.target.value)}
                            placeholder="e.g. Hardware decommissioned or key compromised"
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
