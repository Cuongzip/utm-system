"use client";

import { useState, useMemo } from "react";
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

const WEATHER_TABS = [
    { id: "hub", label: "Hub Weather & Forecast" },
    { id: "aviation", label: "METAR / TAF / SIGMET" },
    { id: "notam", label: "NOTAM Board" },
    { id: "adsb", label: "Live ADS-B Traffic" },
] as const;

export default function WeatherPage() {
    const queryClient = useQueryClient();
    const { data: hubs = [], isLoading: hubsLoading, isError: hubsError } = useHubsAll();
    const [selectedHubIdState, setSelectedHubIdState] = useState<string>("");
    const [activeTab, setActiveTab] = useState<WeatherTab>("hub");

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
        queryClient.invalidateQueries({ queryKey: ["weather"] });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.hubsAll });
    };

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
            <PageHeader title="WEATHER & AIS">
                <ChamferButton variant="outline" size="sm" onClick={handleRefreshAll}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                </ChamferButton>
            </PageHeader>

            {hubsError && orderedHubs.length === 0 ? (
                <ErrorState
                    title="Unable to load vertiport hubs for weather assessment"
                    description="Hub coordinates could not be loaded. Retry to refresh weather briefings."
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
                tabs={WEATHER_TABS}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                ariaLabel="Weather and AIS views"
            />

            {activeTab === "hub" && <HubWeatherDetailCard hub={selectedHub} />}
            {activeTab === "aviation" && <AviationReportsCard />}
            {activeTab === "notam" && <NotamBoard />}
            {activeTab === "adsb" && <AdsbTrafficCard />}
        </div>
    );
}
