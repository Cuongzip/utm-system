"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { CustomSelect } from "@/components/ui";
import { ROOT_CAUSES, type RootCause } from "@/types";

interface IncidentRootCauseTabProps {
    rootCause: RootCause;
    onRootCauseChange: (val: RootCause) => void;
    rootCauseNotes: string;
    onRootCauseNotesChange: (val: string) => void;
    lessonsLearned: string;
    onLessonsLearnedChange: (val: string) => void;
}

export function IncidentRootCauseTab({
    rootCause,
    onRootCauseChange,
    rootCauseNotes,
    onRootCauseNotesChange,
    lessonsLearned,
    onLessonsLearnedChange,
}: IncidentRootCauseTabProps) {
    const t = useTranslations("emergency");

    const rootCauseOptions = useMemo(
        () =>
            ROOT_CAUSES.map((cause) => ({
                value: cause,
                label: t(`rootCauses.${cause}`),
            })),
        [t]
    );

    return (
        <div className="flex flex-col gap-3.5">
            <div className="form-group">
                <label className="form-label" htmlFor="rootCauseCategory">
                    {t("detail.rootCauseLabel")}
                </label>
                <CustomSelect
                    id="rootCauseCategory"
                    value={rootCause}
                    onValueChange={(val) => onRootCauseChange(val as RootCause)}
                    options={rootCauseOptions}
                    placeholder={t("detail.rootCausePlaceholder")}
                />
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="rootCauseNotes">
                    {t("detail.notesLabel")}
                </label>
                <textarea
                    id="rootCauseNotes"
                    rows={3}
                    value={rootCauseNotes}
                    onChange={(e) => onRootCauseNotesChange(e.target.value)}
                    placeholder={t("detail.notesPlaceholder")}
                    className="form-input resize-none"
                />
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="lessonsLearned">
                    {t("detail.lessonsLabel")}
                </label>
                <textarea
                    id="lessonsLearned"
                    rows={2}
                    value={lessonsLearned}
                    onChange={(e) => onLessonsLearnedChange(e.target.value)}
                    placeholder={t("detail.lessonsPlaceholder")}
                    className="form-input resize-none"
                />
            </div>
        </div>
    );
}
