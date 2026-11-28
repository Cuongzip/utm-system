export interface LiveInterpolatedSample {
    lng: number;
    lat: number;
    alt: number;
    heading: number;
}

const livePositions = new Map<string, LiveInterpolatedSample>();

export function setLiveInterpolatedPosition(
    flightId: string,
    lng: number,
    lat: number,
    alt: number,
    heading: number
): void {
    const existing = livePositions.get(flightId);
    if (existing) {
        existing.lng = lng;
        existing.lat = lat;
        existing.alt = alt;
        existing.heading = heading;
    } else {
        livePositions.set(flightId, { lng, lat, alt, heading });
    }
}

export function getLiveInterpolatedPosition(flightId: string): LiveInterpolatedSample | undefined {
    return livePositions.get(flightId);
}

export function deleteLiveInterpolatedPosition(flightId: string): void {
    livePositions.delete(flightId);
}
