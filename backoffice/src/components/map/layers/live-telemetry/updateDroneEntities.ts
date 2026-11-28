import type * as CesiumType from "cesium";
import type { EntityCollection } from "cesium";
import { setLiveInterpolatedPosition } from "../../livePositionRegistry";
import { createTrailEntity, type ResolvedDroneVisuals } from "./createDroneEntities";
import { type DroneTrackState, MAX_TRAIL_POINTS, MONO_FONT_FAMILY } from "./types";

export function updateDroneTrackEntities(
    Cesium: typeof CesiumType,
    entities: EntityCollection,
    state: DroneTrackState,
    visuals: ResolvedDroneVisuals,
    anyInterpolatingRef: { current: boolean }
): void {
    const {
        flight,
        droneLng,
        droneLat,
        droneAlt,
        droneHeading,
        isSelected,
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

    const movedMeters =
        Math.hypot((droneLat - state.toLat) * 111320, (droneLng - state.toLng) * 111320) +
        Math.abs(droneAlt - state.toAlt);

    if (!interpolate) {
        state.fromLng = droneLng;
        state.fromLat = droneLat;
        state.fromAlt = droneAlt;
        state.toLng = droneLng;
        state.toLat = droneLat;
        state.toAlt = droneAlt;
        state.currentLng = droneLng;
        state.currentLat = droneLat;
        state.currentAlt = droneAlt;
        state.fromHeading = droneHeading;
        state.toHeading = droneHeading;
        state.currentHeading = droneHeading;
        state.durationMs = 0;
        state.updatedAtMs = now;
        setLiveInterpolatedPosition(flight.id, droneLng, droneLat, droneAlt, droneHeading);
    } else if (movedMeters > 0.15 || Math.abs(droneHeading - state.toHeading) > 0.4) {
        const rawDt = Math.min(Math.max(now - state.updatedAtMs, 60), 2400);
        state.avgIntervalMs = state.avgIntervalMs * 0.55 + rawDt * 0.45;
        if (showTrail && movedMeters > 2) {
            state.trail.push({
                lng: state.toLng,
                lat: state.toLat,
                alt: state.toAlt,
            });
            if (state.trail.length > MAX_TRAIL_POINTS) {
                state.trail.shift();
            }
        }
        state.fromLng = state.currentLng;
        state.fromLat = state.currentLat;
        state.fromAlt = state.currentAlt;
        state.fromHeading = state.currentHeading;
        state.toLng = droneLng;
        state.toLat = droneLat;
        state.toAlt = droneAlt;
        state.toHeading = droneHeading;
        state.durationMs = Math.min(Math.max(state.avgIntervalMs * 1.06, 85), 2200);
        state.updatedAtMs = now;
        anyInterpolatingRef.current = true;
    }

    if (!showTrail && state.trailEntity) {
        entities.remove(state.trailEntity);
        state.trailEntity = null;
        state.trail = [];
    } else if (showTrail && !state.trailEntity) {
        state.trail = [{ lng: droneLng, lat: droneLat, alt: droneAlt }];
        state.trailEntity = createTrailEntity(
            Cesium,
            entities,
            flight.id,
            state,
            droneColor,
            isSelected
        );
    }

    const selectionChanged = state.lastSelected !== isSelected;
    const colorChanged = state.lastColor !== droneColor;
    const maxDistChanged = state.lastMaxDistance !== maxDistance;
    const accentChanged = state.lastLabelAccent !== labelAccentColor;

    if (state.droneEntity.billboard) {
        if (state.lastIconUri !== iconUri) {
            state.droneEntity.billboard.image = new Cesium.ConstantProperty(iconUri);
            state.lastIconUri = iconUri;
        }
        if (selectionChanged) {
            state.droneEntity.billboard.width = new Cesium.ConstantProperty(iconSize);
            state.droneEntity.billboard.height = new Cesium.ConstantProperty(iconSize);
            state.droneEntity.billboard.eyeOffset = new Cesium.ConstantProperty(
                new Cesium.Cartesian3(0, 0, isSelected ? -50 : -30)
            );
        }
    }

    if (state.droneEntity.label) {
        if (state.lastShowFullLabel !== showFullLabel) {
            state.droneEntity.label.show = new Cesium.ConstantProperty(showFullLabel);
            state.lastShowFullLabel = showFullLabel;
        }
        if (state.lastLabelText !== labelText) {
            state.droneEntity.label.text = new Cesium.ConstantProperty(labelText);
            state.lastLabelText = labelText;
        }
        if (selectionChanged) {
            state.droneEntity.label.pixelOffset = new Cesium.ConstantProperty(
                new Cesium.Cartesian2(0, isSelected ? -32 : -26)
            );
        }

        if (selectionChanged || maxDistChanged || accentChanged) {
            const fadeStart = Math.max(2500, maxDistance * 0.62);
            state.droneEntity.label.font = new Cesium.ConstantProperty(
                `${isSelected ? "700" : "600"} 11px ${MONO_FONT_FAMILY}`
            );
            state.droneEntity.label.fillColor = new Cesium.ConstantProperty(
                isSelected ? Cesium.Color.fromCssColorString(labelAccentColor) : Cesium.Color.WHITE
            );
            state.droneEntity.label.backgroundColor = new Cesium.ConstantProperty(
                isSelected
                    ? new Cesium.Color(0.02, 0.14, 0.25, 0.94)
                    : new Cesium.Color(0.04, 0.08, 0.16, 0.88)
            );
            state.droneEntity.label.eyeOffset = new Cesium.ConstantProperty(
                new Cesium.Cartesian3(0, 0, isSelected ? -55 : -32)
            );
            state.droneEntity.label.scaleByDistance = new Cesium.ConstantProperty(
                isSelected
                    ? new Cesium.NearFarScalar(1500, 1.04, maxDistance, 0.88)
                    : new Cesium.NearFarScalar(1500, 1.0, maxDistance, 0.78)
            );
            state.droneEntity.label.translucencyByDistance = isSelected
                ? undefined
                : new Cesium.ConstantProperty(
                      new Cesium.NearFarScalar(fadeStart, 1.0, maxDistance, 0.0)
                  );
            state.droneEntity.label.distanceDisplayCondition = new Cesium.ConstantProperty(
                new Cesium.DistanceDisplayCondition(0, maxDistance)
            );
        }
    }

    if (selectionChanged || colorChanged) {
        if (state.trailEntity?.polyline) {
            state.trailEntity.polyline.width = new Cesium.ConstantProperty(isSelected ? 3.2 : 2.2);
            state.trailEntity.polyline.material = new Cesium.PolylineOutlineMaterialProperty({
                color: Cesium.Color.fromCssColorString(droneColor).withAlpha(
                    isSelected ? 0.88 : 0.68
                ),
                outlineColor: Cesium.Color.fromCssColorString("#071328").withAlpha(0.6),
                outlineWidth: 1,
            });
        }
        if (state.tetherEntity.polyline) {
            state.tetherEntity.polyline.material = new Cesium.PolylineDashMaterialProperty({
                color: Cesium.Color.fromCssColorString(droneColor).withAlpha(0.55),
                dashLength: 10,
            });
        }
    }

    state.lastSelected = isSelected;
    state.lastColor = droneColor;
    state.lastMaxDistance = maxDistance;
    state.lastLabelAccent = labelAccentColor;
}
