"use client";

import { useTranslations } from "next-intl";
import { ChamferCard, KpiStrip, Skeleton } from "@/components/ui";

export function IncidentDetailSkeleton() {
    const t = useTranslations("emergency");

    return (
        <div
            role="status"
            aria-busy="true"
            aria-label={t("detail.loadingAria")}
            className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 w-full"
        >
            <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-7 w-64" />
                <Skeleton className="h-9 w-36" />
            </div>
            <KpiStrip
                loading
                items={[
                    { id: "detected", label: t("detail.kpiDetectedAt"), value: "—" },
                    { id: "aircraft", label: t("detail.kpiAircraft"), value: "—" },
                    { id: "action", label: t("detail.kpiResponseAction"), value: "—" },
                    { id: "outcome", label: t("detail.kpiOutcome"), value: "—" },
                ]}
            />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7">
                    <ChamferCard size="lg">
                        <div className="p-5 flex flex-col gap-4">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-[360px] w-full" />
                        </div>
                    </ChamferCard>
                </div>
                <div className="lg:col-span-5">
                    <ChamferCard size="lg">
                        <div className="p-5 flex flex-col gap-3">
                            <Skeleton className="h-5 w-36" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    </ChamferCard>
                </div>
            </div>
            <span className="sr-only">{t("detail.loadingAria")}</span>
        </div>
    );
}
