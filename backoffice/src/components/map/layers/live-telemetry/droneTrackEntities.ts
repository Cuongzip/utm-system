import type * as CesiumType from "cesium";
import type { EntityCollection, Viewer } from "cesium";
import type { Flight, TelemetryRecord } from "@/types";
import { formatSpeed, isValidGeoPoint } from "@/utils";
import { getDroneIconUri, type DroneIconVariant } from "../../mapIcons";
import { deleteLiveInterpolatedPosition } from "../../livePositionRegistry";
import { createDroneTrackEntities, type ResolvedDroneVisuals } from "./createDroneEntities";
import type { DroneTrackState } from "./types";
import { updateDroneTrackEntities } from "./updateDroneEntities";

interface ReconcileDroneTracksParams {
    Cesium: typeof CesiumType;
    viewer: Viewer;
    entities: EntityCollection;
    tracksMap: Map<string, DroneTrackState>;
    flights: Flight[];
    telemetryMap: Record<string, TelemetryRecord>;
    selectedFlightId?: string | null;
    showTrail: boolean;
    interpolate: boolean;
    variant: "live" | "replay";
    anyInterpolatingRef: { current: boolean };
}

interface ReconcileDroneTracksResult {
    allPoints: Array<{ lng: number; lat: number }>;
    focusedDronePos: { lng: number; lat: number; alt: number } | null;
}

export function reconcileDroneTracks({
    Cesium,
    viewer,
    entities,
    tracksMap,
    flights,
    telemetryMap,
    selectedFlightId,
    showTrail,
    interpolate,
    variant,
    anyInterpolatingRef,
}: ReconcileDroneTracksParams): ReconcileDroneTracksResult {
    const now = performance.now();
    const activeFlightIds = new Set<string>();
    const allPoints: Array<{ lng: number; lat: number }> = [];
    const coordBucket: Record<string, number> = {};
    let focusedDronePos: { lng: number; lat: number; alt: number } | null = null;
    const hasSelectedTarget = Boolean(selectedFlightId);
    const isReplayVariant = variant === "replay";

    const coordTotals: Record<string, number> = {};
    for (const f of flights) {
        const tel = telemetryMap[f.id];
        if (
            tel &&
            typeof tel.longitude === "number" &&
            typeof tel.latitude === "number" &&
            isValidGeoPoint(tel.latitude, tel.longitude)
        ) {
            const key = `${tel.latitude.toFixed(2)}_${tel.longitude.toFixed(2)}`;
            coordTotals[key] = (coordTotals[key] ?? 0) + 1;
        }
    }

    for (const flight of flights) {
        const telemetry = telemetryMap[flight.id];
        if (
            !telemetry ||
            typeof telemetry.longitude !== "number" ||
            typeof telemetry.latitude !== "number" ||
            !isValidGeoPoint(telemetry.latitude, telemetry.longitude)
        ) {
            continue;
        }

        activeFlightIds.add(flight.id);
        const isSelected = selectedFlightId === flight.id;
        const droneLng = telemetry.longitude;
        const droneLat = telemetry.latitude;
        const droneAlt =
            typeof telemetry.altitude === "number" && telemetry.altitude >= 0
                ? telemetry.altitude
                : 120;
        const droneHeading = telemetry.heading ?? 0;

        allPoints.push({ lng: droneLng, lat: droneLat });
        if (isSelected) {
            focusedDronePos = { lng: droneLng, lat: droneLat, alt: droneAlt };
        }

        const bucketKey = `${droneLat.toFixed(2)}_${droneLng.toFixed(2)}`;
        const stackIdx = coordBucket[bucketKey] ?? 0;
        coordBucket[bucketKey] = stackIdx + 1;
        const sectorCount = coordTotals[bucketKey] ?? 1;

        const hasAlert =
            telemetry.batteryPercentage !== undefined && telemetry.batteryPercentage < 20;
        const iconVariant: DroneIconVariant = hasAlert
            ? "alert"
            : isReplayVariant
              ? "replay"
              : isSelected
                ? "selected"
                : "live";
        const droneColor = hasAlert
            ? "#ef4444"
            : isReplayVariant
              ? "#f59e0b"
              : isSelected
                ? "#00e5ff"
                : "#10b981";
        const outlineColor = hasAlert
            ? "#fca5a5"
            : isReplayVariant
              ? "#fef3c7"
              : isSelected
                ? "#00e5ff"
                : "#ffffff";
        const labelAccentColor = hasAlert ? "#fca5a5" : isReplayVariant ? "#fbbf24" : "#00e5ff";

        const iconUri = getDroneIconUri(droneColor, outlineColor, {
            variant: iconVariant,
        });
        const iconSize = isSelected ? 44 : 36;
        const showFullLabel = isSelected || (!hasSelectedTarget && stackIdx === 0);
        const maxDistance = isSelected ? 250000 : hasSelectedTarget ? 10000 : 18000;
        const clusterSuffix = !isSelected && sectorCount > 1 ? ` (+${sectorCount - 1})` : "";
        const labelText = isSelected
            ? `${flight.flightNumber || "DRONE"} • ${Math.round(droneAlt)}m • ${formatSpeed(telemetry.speed)}`
            : `${flight.flightNumber || "DRONE"} • ${Math.round(droneAlt)}m${clusterSuffix}`;

        const visuals: ResolvedDroneVisuals = {
            flight,
            droneLng,
            droneLat,
            droneAlt,
            droneHeading,
            isSelected,
            hasAlert,
            droneColor,
            labelAccentColor,
            iconUri,
            iconSize,
            showFullLabel,
            maxDistance,
            labelText,
            showTrail,
            interpolate,
            now,
        };

        const state = tracksMap.get(flight.id);
        if (!state) {
            tracksMap.set(flight.id, createDroneTrackEntities(Cesium, viewer, entities, visuals));
        } else {
            updateDroneTrackEntities(Cesium, entities, state, visuals, anyInterpolatingRef);
        }
    }

    for (const [flightId, stale] of tracksMap.entries()) {
        if (!activeFlightIds.has(flightId)) {
            entities.remove(stale.droneEntity);
            if (stale.trailEntity) entities.remove(stale.trailEntity);
            entities.remove(stale.tetherEntity);
            tracksMap.delete(flightId);
            deleteLiveInterpolatedPosition(flightId);
        }
    }

    return { allPoints, focusedDronePos };
}
