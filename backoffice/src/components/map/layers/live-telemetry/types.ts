import type { Cartesian3, Entity } from "cesium";

export const MAX_TRAIL_POINTS = 26;
export const DEFAULT_INTERP_MS = 950;
export const MONO_FONT_FAMILY = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

interface TrailSample {
    lng: number;
    lat: number;
    alt: number;
}

export interface DroneTrackState {
    flightId: string;
    fromLng: number;
    fromLat: number;
    fromAlt: number;
    toLng: number;
    toLat: number;
    toAlt: number;
    currentLng: number;
    currentLat: number;
    currentAlt: number;
    fromHeading: number;
    toHeading: number;
    currentHeading: number;
    updatedAtMs: number;
    avgIntervalMs: number;
    durationMs: number;
    trail: TrailSample[];
    droneEntity: Entity;
    trailEntity: Entity | null;
    tetherEntity: Entity;
    scratchPosition: Cartesian3;
    scratchTether: Cartesian3[];
    lastIconUri: string;
    lastColor: string;
    lastSelected: boolean;
    lastMaxDistance: number;
    lastLabelAccent: string;
    lastLabelText: string;
    lastShowFullLabel: boolean;
}
