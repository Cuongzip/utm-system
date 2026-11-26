"use client";

import { useEffect, useRef, useState } from "react";
import { useCesium } from "../CesiumContext";
import { getCesium } from "../cesiumLoader";
import { getAircraftIconUri } from "../mapIcons";
import { createTacticalLabel } from "../mapLabels";
import { addAltitudeDropLine } from "../cesiumOutlineUtils";
import type { AdsbAircraft } from "@/types";

export interface AdsbLayerProps {
    aircraft: AdsbAircraft[];
}

export function AdsbLayer({ aircraft = [] }: AdsbLayerProps) {
    const { viewer, isLoaded } = useCesium();
    const entityIdsRef = useRef<string[]>([]);
    const [sceneRevision, setSceneRevision] = useState(0);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;
        const removeListener = viewer.scene.morphComplete.addEventListener(() => {
            setSceneRevision((rev) => rev + 1);
        });
        return () => {
            removeListener();
        };
    }, [viewer, isLoaded]);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;

        let cancelled = false;

        async function renderAdsb() {
            const Cesium = await getCesium();
            if (!viewer || viewer.isDestroyed() || cancelled) return;

            for (const id of entityIdsRef.current) {
                const entity = viewer.entities.getById(id);
                if (entity) viewer.entities.remove(entity);
            }
            entityIdsRef.current = [];

            const nextIds: string[] = [];
            const iconAirborne = getAircraftIconUri("#f59e0b");
            const iconGround = getAircraftIconUri("#94a3b8");

            for (const target of aircraft) {
                if (
                    typeof target.latitude !== "number" ||
                    typeof target.longitude !== "number" ||
                    Number.isNaN(target.latitude) ||
                    Number.isNaN(target.longitude)
                ) {
                    continue;
                }

                const id = `adsb-${target.hex || target.callsign || nextIds.length}`;
                const altM = target.onGround
                    ? 5
                    : typeof target.altitudeM === "number" && target.altitudeM >= 0
                      ? Math.min(Math.max(target.altitudeM, 15), 15000)
                      : 300;
                const heading = target.headingDeg ?? 0;
                const callsign = target.callsign || target.hex || "AIRCRAFT";
                const altLabel =
                    target.altitudeFt !== undefined
                        ? `${Math.round(target.altitudeFt).toLocaleString()}ft`
                        : `${Math.round(altM)}m`;

                viewer.entities.add({
                    id,
                    name: `${callsign} (${target.aircraftType || "ADS-B"})`,
                    position: Cesium.Cartesian3.fromDegrees(
                        target.longitude,
                        target.latitude,
                        altM
                    ),
                    billboard: {
                        image: target.onGround ? iconGround : iconAirborne,
                        width: 26,
                        height: 26,
                        rotation: -Cesium.Math.toRadians(heading),
                        eyeOffset: new Cesium.Cartesian3(0, 0, -25),
                        disableDepthTestDistance: Number.POSITIVE_INFINITY,
                    },
                    label: createTacticalLabel(Cesium, {
                        text: `${callsign} • ${altLabel}`,
                        isSelected: false,
                        accentColor: "#f59e0b",
                        pixelOffset: new Cesium.Cartesian2(0, -18),
                        eyeOffset: new Cesium.Cartesian3(0, 0, -25),
                        maxDistance: 400000,
                    }),
                });
                nextIds.push(id);

                if (!target.onGround) {
                    const dropId = addAltitudeDropLine(Cesium, viewer, {
                        id: `${id}-drop`,
                        lng: target.longitude,
                        lat: target.latitude,
                        altitudeM: altM,
                        colorCss: "#f59e0b",
                        alpha: 0.35,
                    });
                    if (dropId) nextIds.push(dropId);
                }
            }

            entityIdsRef.current = nextIds;
            viewer.scene.requestRender();
        }

        renderAdsb();

        return () => {
            cancelled = true;
            if (viewer && !viewer.isDestroyed()) {
                for (const id of entityIdsRef.current) {
                    const entity = viewer.entities.getById(id);
                    if (entity) viewer.entities.remove(entity);
                }
                viewer.scene.requestRender();
            }
            entityIdsRef.current = [];
        };
    }, [viewer, isLoaded, aircraft, sceneRevision]);

    return null;
}
