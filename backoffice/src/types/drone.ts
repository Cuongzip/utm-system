export type DroneStatus =
    "IDLE" | "CHARGING" | "PRE_FLIGHT" | "IN_FLIGHT" | "RETURNING" | "MAINTENANCE" | "OFFLINE";

export interface Drone {
    id: string;
    registrationNumber?: string;
    serialNumber?: string;
    manufacturer?: string;
    model: string;
    homeHubId?: string;
    homeHubName?: string;
    homeHubCode?: string;
    homeHub?: {
        id: string;
        name: string;
        code: string;
    };
    owner?: {
        id: string;
        name: string;
    };
    deviceRegistration?: {
        id: string;
        deviceIdentifier: string;
        connectionStatus: string;
    };
    batteryLevel?: number;
    batteryCapacityWh?: number;
    maxPayload?: number;
    status: DroneStatus | string;
    flightHours?: number;
    currentLat?: number;
    currentLon?: number;
    currentAltitude?: number;
    organizationId?: string;
    ownerId?: string;
    operatorId?: string;
    updatedAt?: string;
    createdOn?: string;
}

export interface DroneListResponse {
    items: Drone[];
    total: number;
}

export interface DroneRegistrationPayload {
    registrationNumber: string;
    manufacturer: string;
    model: string;
    serialNumber?: string;
    homeHubId?: string;
    communicationProtocol?: string;
    batteryCapacityWh?: number;
    hoverPowerW?: number;
    cruisePowerW?: number;
    cruiseSpeedMs?: number;
    batteryHealthPct?: number;
    windToleranceMs?: number;
    maxPayload?: number;
    status?: string;
    ownerId?: string;
}
