"use client";

import React from "react";
import { Crosshair } from "lucide-react";
import { TacticalMapContainer } from "@/components/map";

export type MapMode = "globe" | "2d";

export interface TacticalMapPanelProps {
    initialMode?: MapMode;
    children?: React.ReactNode;
    onEntityClick?: (entityId: string) => void;
    activeTelemetryCount?: number;
    className?: string;
}

export function TacticalMapPanel({
    initialMode = "globe",
    children,
    onEntityClick,
    activeTelemetryCount = 0,
    className,
}: TacticalMapPanelProps) {
    return (
        <TacticalMapContainer
            icon={<Crosshair className="w-4 h-4 text-cyan-400" />}
            title="LIVE OPERATIONS TRACKING"
            activeCount={activeTelemetryCount}
            initialMode={initialMode === "2d" ? "2d" : "3d"}
            initialLayerType="satellite"
            onEntityClick={onEntityClick}
            className={className || "h-[540px]"}
        >
            {children}
        </TacticalMapContainer>
    );
}

export default TacticalMapPanel;
