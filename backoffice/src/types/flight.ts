export type FlightStatus =
    | "PENDING"
    | "APPROVED"
    | "ACTIVE"
    | "CONFORMING"
    | "NON_CONFORMING"
    | "CONTINGENT"
    | "COMPLETED"
    | "CANCELLED";

export interface FlightPlan {
    id: string;
    flightId: string;
    droneId: string;
    droneName?: string;
    pilotName?: string;
    organizationId: string;
    status: FlightStatus;
    departureTime: string;
    arrivalTime: string;
    minAltitude: number;
    maxAltitude: number;
    waypointsCount: number;
}

export interface TelemetryPoint {
    droneId: string;
    latitude: number;
    longitude: number;
    altitudeMeters: number;
    speedMps: number;
    headingDegrees: number;
    batteryPct: number;
    timestamp: string;
}
