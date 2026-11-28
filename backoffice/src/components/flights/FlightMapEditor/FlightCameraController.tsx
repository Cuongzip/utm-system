"use client";

import { RouteCameraController } from "@/components/waypoints/RouteCameraController";

interface FlightCameraControllerProps {
    targetLocation: { lat: number; lng: number; altitude?: number; key: number } | null;
    routePoints: { lat: number; lng: number }[];
}

export function FlightCameraController({
    targetLocation,
    routePoints,
}: FlightCameraControllerProps) {
    return <RouteCameraController targetLocation={targetLocation} points={routePoints} />;
}
