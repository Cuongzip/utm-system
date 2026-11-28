"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { PageHeader, ChamferButton, ErrorState, UnderlineTabs } from "@/components/ui";
import {
    WeatherGoNoGoStrip,
    HubWeatherDetailCard,
    AviationReportsCard,
    NotamBoard,
    AdsbTrafficCard,
} from "@/components/weather";
import { QUERY_KEYS, useHubsAll } from "@/hooks";
import { HUB_STATUS } from "@/types";

type WeatherTab = "hub" | "aviation" | "notam" | "adsb";

export default function WeatherPage() {
    const t = useTranslations("weather");
    const tCommon = useTranslations("common");
    const queryClient = useQueryClient();
    const { data: hubs = [], isLoading: hubsLoading, isError: hubsError } = useHubsAll();
    const [selectedHubIdState, setSelectedHubIdState] = useState<string>("");
    const [activeTab, setActiveTab] = useState<WeatherTab>("hub");

    const weatherTabs = useMemo(
        () =>
            [
                { id: "hub", label: t("tabs.hub") },
                { id: "aviation", label: t("tabs.aviation") },
                { id: "notam", label: t("tabs.notam") },
                { id: "adsb", label: t("tabs.adsb") },
            ] as const,
        [t]
    );

    const orderedHubs = useMemo(() => {
        return [...hubs].sort((a, b) => {
            const aInactive = (a.status || "").toLowerCase() === HUB_STATUS.INACTIVE ? 1 : 0;
            const bInactive = (b.status || "").toLowerCase() === HUB_STATUS.INACTIVE ? 1 : 0;
            if (aInactive !== bInactive) return aInactive - bInactive;
            return (a.code || "").localeCompare(b.code || "");
        });
    }, [hubs]);

    const selectedHubId = useMemo(() => {
        if (selectedHubIdState && orderedHubs.some((h) => h.id === selectedHubIdState)) {
            return selectedHubIdState;
        }
        const firstActive = orderedHubs.find(
            (h) => (h.status || "").toLowerCase() !== HUB_STATUS.INACTIVE
        );
        return firstActive?.id ?? orderedHubs[0]?.id ?? "";
    }, [orderedHubs, selectedHubIdState]);

    const selectedHub = useMemo(
        () => orderedHubs.find((h) => h.id === selectedHubId),
        [orderedHubs, selectedHubId]
    );

    const handleRefreshAll = () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.weatherRoot });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hubsAll });
    };

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
            <PageHeader title={t("title")}>
                <ChamferButton variant="outline" size="sm" onClick={handleRefreshAll}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{tCommon("refresh")}</span>
                </ChamferButton>
            </PageHeader>

            {hubsError && orderedHubs.length === 0 ? (
                <ErrorState
                    title={t("hubsLoadErrorTitle")}
                    description={t("hubsLoadErrorDesc")}
                    onRetry={handleRefreshAll}
                />
            ) : (
                <WeatherGoNoGoStrip
                    hubs={orderedHubs}
                    selectedHubId={selectedHubId}
                    onSelectHub={(id) => {
                        setSelectedHubIdState(id);
                        setActiveTab("hub");
                    }}
                    loadingHubs={hubsLoading}
                />
            )}

            <UnderlineTabs
                tabs={weatherTabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                ariaLabel={t("tabsAriaLabel")}
            />

            {activeTab === "hub" && <HubWeatherDetailCard hub={selectedHub} />}
            {activeTab === "aviation" && <AviationReportsCard />}
            {activeTab === "notam" && <NotamBoard />}
            {activeTab === "adsb" && <AdsbTrafficCard />}
        </div>
    );
}
