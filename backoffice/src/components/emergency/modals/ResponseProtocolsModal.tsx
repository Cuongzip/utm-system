"use client";

import { Modal, ChamferButton, StatusBadge, EmptyState } from "@/components/ui";
import { Sliders, Loader2 } from "lucide-react";
import { useEmergencyProtocols } from "@/hooks/useQueries";

export interface ResponseProtocolsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ResponseProtocolsModal({ isOpen, onClose }: ResponseProtocolsModalProps) {
    const { data: protocolsData, isLoading: protocolsLoading } = useEmergencyProtocols(
        undefined,
        isOpen
    );

    if (!isOpen) return null;

    const protocols = protocolsData || [];

    const footer = (
        <ChamferButton variant="outline" size="sm" clip="xs" type="button" onClick={onClose}>
            Close
        </ChamferButton>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Response Protocols"
            maxWidth="520px"
            footer={footer}
        >
            <div className="flex flex-col gap-3">
                {protocolsLoading ? (
                    <div className="flex items-center justify-center p-8 text-slate-500 gap-2 text-xs">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        <span>Loading configured protocols...</span>
                    </div>
                ) : protocols.length === 0 ? (
                    <EmptyState
                        icon={Sliders}
                        title="No Protocols Configured"
                        description="No response protocols currently registered in the emergency controller."
                    />
                ) : (
                    protocols.map((protocol) => (
                        <div
                            key={protocol.id}
                            className="p-3 bg-[var(--color-surface-panel)] border border-[var(--color-border-strong)] rounded-md flex justify-between items-center"
                        >
                            <div className="flex flex-col gap-0.5">
                                <div className="font-semibold text-sm text-[var(--color-text-primary)]">
                                    {protocol.name}
                                </div>
                                <div className="text-xs text-[var(--color-text-muted)]">
                                    {protocol.description || `Action: ${protocol.responseAction}`}
                                </div>
                            </div>
                            <StatusBadge
                                status={protocol.isActive ? "success" : "neutral"}
                                label={protocol.isActive ? "ACTIVE" : "DISABLED"}
                                dotShape="circle"
                            />
                        </div>
                    ))
                )}
            </div>
        </Modal>
    );
}
