import type * as CesiumType from "cesium";
import type { Entity, EntityCollection, Viewer } from "cesium";
import type { Flight } from "@/types";
import { createTacticalLabel } from "../../mapLabels";
import { setLiveInterpolatedPosition } from "../../livePositionRegistry";
import { DEFAULT_INTERP_MS, type DroneTrackState } from "./types";

export interface ResolvedDroneVisuals {
    flight: Flight;
    droneLng: number;
    droneLat: number;
    droneAlt: number;
    droneHeading: number;
    isSelected: boolean;
    hasAlert: boolean;
    droneColor: string;
    labelAccentColor: string;
    iconUri: string;
    iconSize: number;
    showFullLabel: boolean;
    maxDistance: number;
    labelText: string;
    showTrail: boolean;
    interpolate: boolean;
    now: number;
}

export function createTrailEntity(
    Cesium: typeof CesiumType,
    entities: EntityCollection,
    flightId: string,
    stateRef: DroneTrackState,
    colorHex: string,
    selected: boolean
): Entity {
    return entities.add({
        id: `drone-trail-${flightId}`,
        polyline: {
            positions: new Cesium.CallbackProperty(() => {
                const pts = stateRef.trail;
                const flat: number[] = [];
                for (const s of pts) {
                    flat.push(s.lng, s.lat, s.alt);
                }
                flat.push(stateRef.currentLng, stateRef.currentLat, stateRef.currentAlt);
                return flat.length >= 6 ? Cesium.Cartesian3.fromDegreesArrayHeights(flat) : [];
            }, false),
            width: selected ? 3.2 : 2.2,
            material: new Cesium.PolylineOutlineMaterialProperty({
                color: Cesium.Color.fromCssColorString(colorHex).withAlpha(selected ? 0.88 : 0.68),
                outlineColor: Cesium.Color.fromCssColorString("#071328").withAlpha(0.6),
                outlineWidth: 1,
            }),
        },
    });
}

export function createDroneTrackEntities(
    Cesium: typeof CesiumType,
    viewer: Viewer,
    entities: EntityCollection,
    visuals: ResolvedDroneVisuals
): DroneTrackState {
    const {
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
    } = visuals;

    const initialRenderAlt =
        viewer.scene.mode === Cesium.SceneMode.SCENE3D ? Math.max(droneAlt, 2) : 25;
    const scratchPosition = Cesium.Cartesian3.fromDegrees(droneLng, droneLat, initialRenderAlt);
    const scratchTether = [
        Cesium.Cartesian3.fromDegrees(droneLng, droneLat, 0),
        Cesium.Cartesian3.fromDegrees(droneLng, droneLat, droneAlt),
    ];

    const newState: DroneTrackState = {
        flightId: flight.id,
        fromLng: droneLng,
        fromLat: droneLat,
        fromAlt: droneAlt,
        toLng: droneLng,
        toLat: droneLat,
        toAlt: droneAlt,
        currentLng: droneLng,
        currentLat: droneLat,
        currentAlt: droneAlt,
        fromHeading: droneHeading,
        toHeading: droneHeading,
        currentHeading: droneHeading,
        updatedAtMs: now,
        avgIntervalMs: DEFAULT_INTERP_MS,
        durationMs: interpolate ? DEFAULT_INTERP_MS : 0,
        trail: showTrail ? [{ lng: droneLng, lat: droneLat, alt: droneAlt }] : [],
        droneEntity: null as unknown as Entity,
        trailEntity: null,
        tetherEntity: null as unknown as Entity,
        scratchPosition,
        scratchTether,
        lastIconUri: iconUri,
        lastColor: droneColor,
        lastSelected: isSelected,
        lastMaxDistance: maxDistance,
        lastLabelAccent: labelAccentColor,
        lastLabelText: labelText,
        lastShowFullLabel: showFullLabel,
    };

    setLiveInterpolatedPosition(flight.id, droneLng, droneLat, droneAlt, droneHeading);

    const dynamicPos = new Cesium.CallbackPositionProperty(() => {
        const is3D = !viewer.isDestroyed() && viewer.scene.mode === Cesium.SceneMode.SCENE3D;
        const renderAlt = is3D ? Math.max(newState.currentAlt, 2) : 25;
        return Cesium.Cartesian3.fromDegrees(
            newState.currentLng,
            newState.currentLat,
            renderAlt,
            undefined,
            newState.scratchPosition
        );
    }, false);

    const dynamicRotation = new Cesium.CallbackProperty(
        () => -Cesium.Math.toRadians(newState.currentHeading),
        false
    );

    const droneEntity = entities.add({
        id: `drone-live-${flight.id}`,
        name: flight.flightNumber || `Drone ${flight.droneId?.slice(0, 8) || "UAV"}`,
        position: dynamicPos,
        billboard: {
            image: iconUri,
            width: iconSize,
            height: iconSize,
            rotation: dynamicRotation,
            eyeOffset: new Cesium.Cartesian3(0, 0, isSelected ? -50 : -30),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
        label: createTacticalLabel(Cesium, {
            text: labelText,
            isSelected,
            variant: hasAlert ? "alert" : "aircraft",
            accentColor: labelAccentColor,
            pixelOffset: new Cesium.Cartesian2(0, isSelected ? -32 : -26),
            eyeOffset: new Cesium.Cartesian3(0, 0, isSelected ? -55 : -32),
            maxDistance,
        }),
    });
    if (droneEntity.label) {
        droneEntity.label.show = new Cesium.ConstantProperty(showFullLabel);
    }

    const trailEntity = showTrail
        ? createTrailEntity(Cesium, entities, flight.id, newState, droneColor, isSelected)
        : null;

    const tetherEntity = entities.add({
        id: `drone-tether-${flight.id}`,
        polyline: {
            show: new Cesium.CallbackProperty(
                () =>
                    !viewer.isDestroyed() &&
                    viewer.scene.mode === Cesium.SceneMode.SCENE3D &&
                    newState.currentAlt > 8,
                false
            ),
            positions: new Cesium.CallbackProperty(() => {
                Cesium.Cartesian3.fromDegrees(
                    newState.currentLng,
                    newState.currentLat,
                    0,
                    undefined,
                    newState.scratchTether[0]
                );
                Cesium.Cartesian3.fromDegrees(
                    newState.currentLng,
                    newState.currentLat,
                    newState.currentAlt,
                    undefined,
                    newState.scratchTether[1]
                );
                return newState.scratchTether;
            }, false),
            width: 1.4,
            material: new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.fromCssColorString(droneColor).withAlpha(0.55),
                dashLength: 10,
            }),
        },
    });

    newState.droneEntity = droneEntity;
    newState.trailEntity = trailEntity;
    newState.tetherEntity = tetherEntity;
    return newState;
}
