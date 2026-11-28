"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { ChamferCard, EmptyState, Skeleton } from "@/components/ui";
import { useHubsAll } from "@/hooks";
import { HUB_STATUS, type HubFleetStatus } from "@/types";
import { HubAircraftSlideOver } from "./HubAircraftSlideOver";
import { HubFleetStatusCard } from "./HubFleetStatusCard";

interface FleetHubStatusTabProps {
    hubStatuses: HubFleetStatus[];
    loading: boolean;
}

export function FleetHubStatusTab({ hubStatuses, loading }: FleetHubStatusTabProps) {
    const t = useTranslations("fleet.hubStatus");
    const [selectedHub, setSelectedHub] = useState<HubFleetStatus | null>(null);
    const { data: allHubs = [] } = useHubsAll();

    const activeHubIds = useMemo(() => {
        const set = new Set<string>();
        for (const h of allHubs) {
            if ((h.status || "").toLowerCase() !== HUB_STATUS.INACTIVE) {
                set.add(h.id);
            }
        }
        return set;
    }, [allHubs]);

    const hubCodeMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const h of allHubs) {
            if (h.id && h.code) {
                map.set(h.id, h.code);
            }
        }
        return map;
    }, [allHubs]);

    const selectedHubCode = selectedHub?.hubId ? hubCodeMap.get(selectedHub.hubId) : undefined;

    const visibleStatuses = useMemo(() => {
        const filtered =
            activeHubIds.size > 0
                ? hubStatuses.filter((hs) => !hs.hubId || activeHubIds.has(hs.hubId))
                : hubStatuses;

        return [...filtered].sort((a, b) => {
            const diff = (b.totalDrones ?? 0) - (a.totalDrones ?? 0);
            if (diff !== 0) return diff;
            return (a.hubName || "").localeCompare(b.hubName || "");
        });
    }, [hubStatuses, activeHubIds]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, idx) => (
                    <ChamferCard key={idx} size="md">
                        <div className="p-4 flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-5 w-16" />
                            </div>
                            <Skeleton className="h-2 w-full" />
                            <div className="grid grid-cols-4 gap-2 pt-2">
                                {Array.from({ length: 4 }).map((__, i) => (
                                    <Skeleton key={i} className="h-8 w-full" />
                                ))}
                            </div>
                        </div>
                    </ChamferCard>
                ))}
            </div>
        );
    }

    if (visibleStatuses.length === 0) {
        return (
            <ChamferCard size="md">
                <EmptyState
                    icon={Building2}
                    title={t("noHubDataTitle")}
                    description={t("noHubDataDesc")}
                />
            </ChamferCard>
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {visibleStatuses.map((hub) => (
                    <HubFleetStatusCard
                        key={hub.hubId || hub.hubName}
                        hub={hub}
                        onSelectHub={setSelectedHub}
                    />
                ))}
            </div>

            <HubAircraftSlideOver
                key={selectedHub?.hubId ?? "closed"}
                hub={selectedHub}
                hubCode={selectedHubCode}
                onClose={() => setSelectedHub(null)}
            />
        </>
    );
}
