import type { Viewer } from "cesium";
import { setLiveInterpolatedPosition } from "../../livePositionRegistry";
import type { DroneTrackState } from "./types";

function shortestAngleLerp(fromDeg: number, toDeg: number, t: number): number {
    const delta = ((((toDeg - fromDeg) % 360) + 540) % 360) - 180;
    return (fromDeg + delta * t + 360) % 360;
}

// Advance interpolated UAV positions in preUpdate (before DataSourceDisplay & trackedEntity
// camera follow) and schedule the next frame directly in postRender so requestRenderMode
// runs at a smooth locked 60 FPS with zero Follow-UAV 1-frame lag.
export function bindPreUpdateInterpolation(
    viewer: Viewer,
    tracksMap: Map<string, DroneTrackState>,
    anyInterpolatingRef: { current: boolean }
): () => void {
    let disposed = false;

    const removePreUpdate = viewer.scene.preUpdate.addEventListener(() => {
        if (viewer.isDestroyed() || tracksMap.size === 0) {
            anyInterpolatingRef.current = false;
            return;
        }

        const now = performance.now();
        let anyInterpolating = false;

        for (const state of tracksMap.values()) {
            if (state.durationMs <= 0) {
                state.currentLng = state.toLng;
                state.currentLat = state.toLat;
                state.currentAlt = state.toAlt;
                state.currentHeading = state.toHeading;
            } else {
                const elapsed = now - state.updatedAtMs;
                const t = Math.min(1, Math.max(0, elapsed / state.durationMs));
                if (t < 1) {
                    anyInterpolating = true;
                }
                state.currentLng = state.fromLng + (state.toLng - state.fromLng) * t;
                state.currentLat = state.fromLat + (state.toLat - state.fromLat) * t;
                state.currentAlt = state.fromAlt + (state.toAlt - state.fromAlt) * t;
                state.currentHeading = shortestAngleLerp(state.fromHeading, state.toHeading, t);
            }
            setLiveInterpolatedPosition(
                state.flightId,
                state.currentLng,
                state.currentLat,
                state.currentAlt,
                state.currentHeading
            );
        }

        anyInterpolatingRef.current = anyInterpolating;
    });

    const removePostRender = viewer.scene.postRender.addEventListener(() => {
        if (!disposed && anyInterpolatingRef.current && !viewer.isDestroyed()) {
            viewer.scene.requestRender();
        }
    });

    return () => {
        disposed = true;
        anyInterpolatingRef.current = false;
        removePreUpdate();
        removePostRender();
    };
}
