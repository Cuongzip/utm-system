"use client";

import { useTranslations } from "next-intl";
import { ChamferCard, KpiStrip, Skeleton } from "@/components/ui";

export function SimulationDetailSkeleton() {
    const t = useTranslations("simulation.detail");
    const tCards = useTranslations("simulation.telemetryCards");

    return (
        <div
            role="status"
            aria-busy="true"
            aria-label={t("loadingAria")}
            className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 w-full"
        >
            <div className="flex items-center justify-between">
                <Skeleton className="h-7 w-56" />
                <Skeleton className="h-9 w-28" />
            </div>
            <KpiStrip
                loading
                items={[
                    { id: "bat", label: tCards("battery"), value: "—" },
                    { id: "spd", label: tCards("groundSpeed"), value: "—" },
                    { id: "alt", label: tCards("altitudeHeading"), value: "—" },
                    { id: "traj", label: tCards("trajectory"), value: "—" },
                ]}
            />
            <ChamferCard size="lg">
                <div className="p-5 flex flex-col gap-3">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-48 w-full" />
                </div>
            </ChamferCard>
            <span className="sr-only">{t("loadingSr")}</span>
        </div>
    );
}
