"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { ChamferCard, ChamferButton, CustomSelect } from "@/components/ui";
import { QUERY_KEYS } from "@/hooks";
import { emergencyService } from "@/services/emergencyService";
import { ROOT_CAUSES, ROOT_CAUSE, type EmergencyIncidentVm, type RootCause } from "@/types";

interface RootCauseInvestigationCardProps {
    incident: EmergencyIncidentVm;
}

export function RootCauseInvestigationCard({ incident }: RootCauseInvestigationCardProps) {
    const t = useTranslations("emergency");
    const tCommon = useTranslations("common");
    const queryClient = useQueryClient();
    const [rootCause, setRootCause] = useState<RootCause>(incident.rootCause ?? ROOT_CAUSE.UNKNOWN);
    const [notes, setNotes] = useState(incident.rootCauseNotes ?? "");
    const [lessonsLearned, setLessonsLearned] = useState(incident.lessonsLearned ?? "");

    const rootCauseOptions = useMemo(
        () =>
            ROOT_CAUSES.map((cause) => ({
                value: cause,
                label: t(`rootCauses.${cause}`),
            })),
        [t]
    );

    const saveMutation = useMutation({
        mutationFn: () =>
            emergencyService.updateRootCause(incident.id, {
                rootCause,
                notes: notes.trim() || undefined,
                lessonsLearned: lessonsLearned.trim() || undefined,
            }),
        onSuccess: () => {
            toast.success(t("detail.investigationSavedToast"));
            queryClient.invalidateQueries({
                queryKey: QUERY_KEYS.emergencyIncidentDetail(incident.id),
            });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyActive });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.emergencyIncidents() });
        },
        meta: { defaultErrorMessage: t("detail.investigationSaveFailed") },
    });

    return (
        <ChamferCard size="lg" className="w-full">
            <div className="p-5 flex flex-col gap-4">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-2.5">
                    {t("detail.investigationHeading")}
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="detail-root-cause">
                        {t("detail.rootCauseLabel")}
                    </label>
                    <CustomSelect
                        id="detail-root-cause"
                        value={rootCause}
                        onValueChange={(val) => setRootCause(val as RootCause)}
                        options={rootCauseOptions}
                        placeholder={t("detail.rootCausePlaceholder")}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="detail-root-cause-notes">
                        {t("detail.notesLabel")}
                    </label>
                    <textarea
                        id="detail-root-cause-notes"
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder={t("detail.notesPlaceholder")}
                        className="form-input resize-none"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="detail-lessons-learned">
                        {t("detail.lessonsLabel")}
                    </label>
                    <textarea
                        id="detail-lessons-learned"
                        rows={3}
                        value={lessonsLearned}
                        onChange={(e) => setLessonsLearned(e.target.value)}
                        placeholder={t("detail.lessonsPlaceholder")}
                        className="form-input resize-none"
                    />
                </div>

                <div className="flex justify-end pt-1">
                    <ChamferButton
                        variant="dark"
                        size="sm"
                        disabled={saveMutation.isPending}
                        onClick={() => saveMutation.mutate()}
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>
                            {saveMutation.isPending
                                ? tCommon("saving")
                                : t("detail.saveInvestigation")}
                        </span>
                    </ChamferButton>
                </div>
            </div>
        </ChamferCard>
    );
}
