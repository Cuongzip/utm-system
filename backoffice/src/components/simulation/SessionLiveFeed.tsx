"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChamferCard, UnderlineTabs, type UnderlineTabItem } from "@/components/ui";
import { useTelemetryStream } from "@/hooks/useStomp";
import { useSimulationEvents } from "@/hooks";
import {
    SIMULATION_STATUS,
    SIMULATION_SCENARIO,
    type SimulationSession,
    type TelemetryRecord,
} from "@/types";
import { TelemetryStreamTab } from "./live-feed/TelemetryStreamTab";
import { SimulationEventsTab } from "./live-feed/SimulationEventsTab";
import { SessionSpecsTab } from "./live-feed/SessionSpecsTab";

interface SessionLiveFeedProps {
    session: SimulationSession;
}

type TabType = "telemetry" | "events" | "specs";

export function SessionLiveFeed({ session }: SessionLiveFeedProps) {
    const t = useTranslations("simulation.liveFeed");
    const [activeTab, setActiveTab] = useState<TabType>("telemetry");
    const [wsRecords, setWsRecords] = useState<TelemetryRecord[]>([]);

    const normStatus = String(session.status || "").toLowerCase();
    const isRunning = normStatus === SIMULATION_STATUS.RUNNING;
    const isC2Lost =
        String(session.activeScenario || "").toLowerCase() === SIMULATION_SCENARIO.C2_LOST;

    const handleIncomingRecord = useCallback(
        (rec: TelemetryRecord) => {
            if (!rec || isC2Lost) return;
            setWsRecords((prev) => [rec, ...prev.slice(0, 49)]);
        },
        [isC2Lost]
    );

    useTelemetryStream(handleIncomingRecord, session.flightId, isRunning && !isC2Lost);

    const records = useMemo<TelemetryRecord[]>(() => {
        if (isC2Lost || session.currentLat == null || session.currentLon == null) {
            return wsRecords;
        }
        const latest = wsRecords[0];
        if (
            latest &&
            Math.abs((latest.latitude ?? 0) - session.currentLat) < 1e-6 &&
            Math.abs((latest.longitude ?? 0) - session.currentLon) < 1e-6 &&
            Math.abs((latest.batteryPercentage ?? 0) - (session.currentBattery ?? 100)) < 1e-2
        ) {
            return wsRecords;
        }
        const snap: TelemetryRecord = {
            id: `snap-${session.lastModifiedOn || session.id}`,
            flightId: session.flightId,
            droneId: session.droneId,
            latitude: session.currentLat,
            longitude: session.currentLon,
            altitude: session.currentAlt ?? 0,
            speed: session.speed ?? 0,
            heading: session.currentHeading ?? 0,
            batteryPercentage: session.currentBattery ?? 100,
            timestamp: session.lastModifiedOn || session.createdOn,
        };
        return [snap, ...wsRecords.slice(0, 49)];
    }, [
        wsRecords,
        isC2Lost,
        session.id,
        session.currentLat,
        session.currentLon,
        session.currentAlt,
        session.speed,
        session.currentHeading,
        session.currentBattery,
        session.flightId,
        session.droneId,
        session.lastModifiedOn,
        session.createdOn,
    ]);

    const { data: events = [] } = useSimulationEvents(session.id, isRunning);

    const tabs: readonly UnderlineTabItem<TabType>[] = [
        { id: "telemetry", label: t("tabTelemetry"), count: records.length },
        { id: "events", label: t("tabEvents"), count: events.length },
        { id: "specs", label: t("tabSpecs") },
    ];

    return (
        <div className="flex flex-col gap-4 w-full">
            <UnderlineTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                ariaLabel={t("tabsAria")}
            />

            <ChamferCard size="lg" className="w-full">
                {activeTab === "telemetry" && <TelemetryStreamTab records={records} />}
                {activeTab === "events" && <SimulationEventsTab events={events} />}
                {activeTab === "specs" && <SessionSpecsTab session={session} />}
            </ChamferCard>
        </div>
    );
}
