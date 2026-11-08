"use client";

import { Modal, ChamferButton, EmptyState } from "@/components/ui";
import { TrendingUp, Loader2 } from "lucide-react";
import { useEmergencyTrends, useEmergencyStats } from "@/hooks/useQueries";

export interface TrendAnalysisModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function TrendAnalysisModal({ isOpen, onClose }: TrendAnalysisModalProps) {
    const { data: statsData, isLoading: statsLoading } = useEmergencyStats();
    const { data: trendsData, isLoading: trendsLoading } = useEmergencyTrends(
        undefined,
        undefined,
        undefined,
        isOpen
    );

    if (!isOpen) return null;

    const byType = statsData?.byType || [];
    const totalIncidents = byType.reduce((acc, curr) => acc + (curr.count ?? 0), 0);

    const footer = (
        <ChamferButton variant="outline" size="sm" clip="xs" type="button" onClick={onClose}>
            Close
        </ChamferButton>
    );

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Trend Analysis"
            maxWidth="520px"
            footer={footer}
        >
            <div className="flex flex-col gap-4 text-xs">
                {trendsLoading || statsLoading ? (
                    <div className="flex items-center justify-center p-8 text-slate-500 gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        <span>Loading trend analytics...</span>
                    </div>
                ) : byType.length === 0 && (!trendsData || trendsData.length === 0) ? (
                    <EmptyState
                        icon={TrendingUp}
                        title="No Trend Data"
                        description="Insufficient incident data recorded to generate pattern distributions."
                    />
                ) : (
                    <div className="space-y-3.5">
                        {byType.map((item, idx) => {
                            const count = item.count ?? 0;
                            const typeLabel = (item.type || `Type ${idx + 1}`).replace(/_/g, " ");
                            const percentage =
                                totalIncidents > 0 ? Math.round((count / totalIncidents) * 100) : 0;
                            return (
                                <div key={item.type || idx} className="form-group">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="form-label capitalize">{typeLabel}</span>
                                        <span className="font-bold text-[var(--color-text-primary)]">
                                            {percentage}% ({count})
                                        </span>
                                    </div>
                                    <div className="h-2 w-full bg-[var(--color-surface-panel)] border border-[var(--color-border-subtle)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[var(--color-border-dark)] rounded-full transition-all duration-300"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}
