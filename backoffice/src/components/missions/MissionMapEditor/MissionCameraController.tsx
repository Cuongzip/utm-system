"use client";

import { RouteCameraController } from "@/components/waypoints/RouteCameraController";

interface MissionCameraControllerProps {
    targetLocation: { lat: number; lng: number; altitude?: number; key: number } | null;
    missionPoints: { lat: number; lng: number }[];
}

export function MissionCameraController({
    targetLocation,
    missionPoints,
}: MissionCameraControllerProps) {
    return <RouteCameraController targetLocation={targetLocation} points={missionPoints} />;
}
