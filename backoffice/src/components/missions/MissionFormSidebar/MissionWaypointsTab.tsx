"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Plus, Route } from "lucide-react";
import { ACTIVE_HUB_STATUS, type Waypoint, type Hub } from "@/types";
import { ChamferButton, CustomSelect } from "@/components/ui";
import { WaypointRouteTab } from "@/components/waypoints";

interface MissionWaypointsTabProps {
    waypoints: Waypoint[];
    selectedWaypoint: Waypoint | null;
    onSelectWaypoint: (wp: Waypoint | null) => void;
    onAddHubWaypoint: (hub: Hub) => void;
    onUpdateWaypoint: (wp: Waypoint) => void;
    onDeleteWaypoint: (wpId: string) => void;
    onMoveWaypointOrder: (fromIndex: number, toIndex: number) => void;
    departureHub: Hub | null;
    arrivalHub: Hub | null;
    hubs: Hub[];
    isReadOnly: boolean;
    onAutoPlanHubs?: () => void;
    isAutoPlanning?: boolean;
    fieldErrors: Record<string, string>;
    onClearFieldError: (field: string) => void;
}

export function MissionWaypointsTab({
    waypoints = [],
    selectedWaypoint,
    onSelectWaypoint,
    onAddHubWaypoint,
    onUpdateWaypoint,
    onDeleteWaypoint,
    onMoveWaypointOrder,
    departureHub,
    arrivalHub,
    hubs,
    isReadOnly = false,
    onAutoPlanHubs,
    isAutoPlanning = false,
    fieldErrors = {},
    onClearFieldError,
}: MissionWaypointsTabProps) {
    const t = useTranslations("missions");
    const [selectedStopoverHubId, setSelectedStopoverHubId] = useState("");
    const activeHubs = hubs.filter((h) => h.status === ACTIVE_HUB_STATUS && h.location);

    const handleInsertHubStopover = () => {
        if (!selectedStopoverHubId) return;
        const hub = activeHubs.find((h) => h.id === selectedStopoverHubId);
        if (hub) {
            onAddHubWaypoint(hub);
            setSelectedStopoverHubId("");
        }
    };

    return (
        <div className="space-y-3">
            {!isReadOnly && !selectedWaypoint && activeHubs.length > 0 && (
                <div className="p-2.5 rounded-md border border-[var(--color-border-default)] bg-[var(--color-surface-subtle)] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-[var(--color-text-primary)]">
                            {t("waypointsTab.addHubStopover")}
                        </span>
                        {onAutoPlanHubs && (
                            <ChamferButton
                                variant="outline"
                                size="xs"
                                clip="xs"
                                onClick={onAutoPlanHubs}
                                disabled={isAutoPlanning}
                            >
                                {isAutoPlanning ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                    <Route className="w-3 h-3 text-slate-600" />
                                )}
                                <span>
                                    {isAutoPlanning
                                        ? t("waypointsTab.planning")
                                        : t("waypointsTab.autoPlan")}
                                </span>
                            </ChamferButton>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5">
                        <div className="flex-1 min-w-0">
                            <CustomSelect
                                value={selectedStopoverHubId}
                                onValueChange={setSelectedStopoverHubId}
                                options={[
                                    { value: "", label: t("waypointsTab.selectHubToInsert") },
                                    ...activeHubs.map((h) => ({
                                        value: h.id,
                                        label: `${h.name}${h.code ? ` (${h.code})` : ""}`,
                                    })),
                                ]}
                                placeholder={t("waypointsTab.selectActiveHub")}
                            />
                        </div>
                        <ChamferButton
                            variant="dark"
                            size="sm"
                            clip="xs"
                            onClick={handleInsertHubStopover}
                            disabled={!selectedStopoverHubId}
                        >
                            <Plus className="w-3.5 h-3.5 text-white" />
                            <span>{t("waypointsTab.addHubBtn")}</span>
                        </ChamferButton>
                    </div>
                </div>
            )}

            <WaypointRouteTab
                title={t("waypointsTab.routeCheckpoints")}
                waypoints={waypoints}
                selectedWaypoint={selectedWaypoint}
                onSelectWaypoint={onSelectWaypoint}
                onUpdateWaypoint={onUpdateWaypoint}
                onDeleteWaypoint={onDeleteWaypoint}
                onMoveWaypointOrder={onMoveWaypointOrder}
                departureHub={departureHub}
                arrivalHub={arrivalHub}
                hubs={hubs}
                defaultAltitude={50}
                isReadOnly={isReadOnly}
                generalError={fieldErrors.waypoints}
                fieldErrors={fieldErrors}
                onClearFieldError={onClearFieldError}
            />
        </div>
    );
}
