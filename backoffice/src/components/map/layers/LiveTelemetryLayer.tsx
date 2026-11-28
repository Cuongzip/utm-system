"use client";

import { memo, useEffect, useRef } from "react";
import type { CustomDataSource } from "cesium";
import type { Flight, TelemetryRecord } from "@/types";
import { useCesium } from "../CesiumContext";
import { getCesium } from "../cesiumLoader";
import { fitCameraToBounds } from "../cesiumUtils";
import { deleteLiveInterpolatedPosition } from "../livePositionRegistry";
import { reconcileDroneTracks } from "./live-telemetry/droneTrackEntities";
import { bindPreUpdateInterpolation } from "./live-telemetry/interpolationLoop";
import type { DroneTrackState } from "./live-telemetry/types";

interface LiveTelemetryLayerProps {
    flights: Flight[];
    telemetryMap: Record<string, TelemetryRecord>;
    selectedFlightId?: string | null;
    autoFollowSelected?: boolean;
    autoFitInitialBounds?: boolean;
    showTrail?: boolean;
    interpolate?: boolean;
    variant?: "live" | "replay";
}

const EMPTY_FLIGHTS: Flight[] = [];
const EMPTY_TELEMETRY_MAP: Record<string, TelemetryRecord> = {};

export const LiveTelemetryLayer = memo(function LiveTelemetryLayer({
    flights = EMPTY_FLIGHTS,
    telemetryMap = EMPTY_TELEMETRY_MAP,
    selectedFlightId,
    autoFollowSelected = true,
    autoFitInitialBounds = false,
    showTrail = true,
    interpolate = true,
    variant = "live",
}: LiveTelemetryLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const tracksRef = useRef<Map<string, DroneTrackState>>(new Map());
    const dataSourceRef = useRef<CustomDataSource | null>(null);
    const cesiumRef = useRef<typeof import("cesium") | null>(null);
    const anyInterpolatingRef = useRef(false);
    const lastCameraFocusRef = useRef<string | null>(null);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;
        const tracksMap = tracksRef.current;

        getCesium().then((mod) => {
            if (!cancelled) {
                cesiumRef.current = mod;
            }
        });

        const unbindInterpolation = bindPreUpdateInterpolation(
            viewer,
            tracksMap,
            anyInterpolatingRef
        );

        return () => {
            cancelled = true;
            unbindInterpolation();
            const ds = dataSourceRef.current;
            for (const flightId of tracksMap.keys()) {
                deleteLiveInterpolatedPosition(flightId);
            }
            if (viewer && !viewer.isDestroyed()) {
                if (ds && viewer.dataSources.contains(ds)) {
                    viewer.dataSources.remove(ds, true);
                } else {
                    for (const state of tracksMap.values()) {
                        viewer.entities.remove(state.droneEntity);
                        if (state.trailEntity) viewer.entities.remove(state.trailEntity);
                        viewer.entities.remove(state.tetherEntity);
                    }
                }
                viewer.scene.requestRender();
            }
            dataSourceRef.current = null;
            tracksMap.clear();
        };
    }, [viewer, isLoaded]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function reconcileTelemetry() {
            const Cesium = cesiumRef.current ?? (await getCesium());
            cesiumRef.current = Cesium;
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            // Keep live/replay UAV billboards in a top-most CustomDataSource so they always
            // render above Hub/Airspace/Flight billboards in viewer.entities in both 2D and 3D.
            let ds = dataSourceRef.current;
            if (!ds) {
                ds = new Cesium.CustomDataSource("utm-live-telemetry");
                await viewer.dataSources.add(ds);
                if (viewer.isDestroyed()) return;
                if (dataSourceRef.current || cancelled) {
                    if (viewer.dataSources.contains(ds)) {
                        viewer.dataSources.remove(ds, true);
                    }
                    return;
                }
                dataSourceRef.current = ds;
            }
            const dsCount = viewer.dataSources.length;
            if (dsCount > 1 && viewer.dataSources.indexOf(ds) !== dsCount - 1) {
                viewer.dataSources.raiseToTop(ds);
            }

            const { allPoints, focusedDronePos } = reconcileDroneTracks({
                Cesium,
                viewer,
                entities: ds.entities,
                tracksMap: tracksRef.current,
                flights,
                telemetryMap,
                selectedFlightId,
                showTrail,
                interpolate,
                variant,
                anyInterpolatingRef,
            });

            if (autoFollowSelected && focusedDronePos) {
                const cameraKey = `${selectedFlightId}_initial`;
                if (lastCameraFocusRef.current !== cameraKey) {
                    lastCameraFocusRef.current = cameraKey;
                    fitCameraToBounds(
                        viewer,
                        [{ lat: focusedDronePos.lat, lng: focusedDronePos.lng }],
                        {
                            animate: true,
                            duration: 1.0,
                            minHeight: Math.max(focusedDronePos.alt * 10, 4500),
                        }
                    );
                }
            } else if (
                autoFitInitialBounds &&
                allPoints.length > 0 &&
                !lastCameraFocusRef.current
            ) {
                lastCameraFocusRef.current = "bounds_fit";
                fitCameraToBounds(viewer, allPoints, { animate: false });
            }

            viewer.scene.requestRender();
        }

        reconcileTelemetry();

        return () => {
            cancelled = true;
        };
    }, [
        viewer,
        isLoaded,
        flights,
        telemetryMap,
        selectedFlightId,
        autoFollowSelected,
        autoFitInitialBounds,
        showTrail,
        interpolate,
        variant,
    ]);

    return null;
});
