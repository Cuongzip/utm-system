export interface HubLocation {
    lat: number;
    lng: number;
}

export interface Hub {
    id: string;
    name: string;
    code: string;
    location?: HubLocation;
    latitude?: number;
    longitude?: number;
    altitudeMsl?: number;
    airspaceRadius?: number;
    status?: string;
    availableDronesCount?: number;
    maxDrones?: number;
    corridors?: string[];
    createdOn?: string;
    lastModifiedOn?: string;
}

export interface CreateHubPayload {
    code: string;
    name: string;
    location: HubLocation;
    altitudeMsl: number;
    airspaceRadius: number;
}

export interface UpdateHubPayload {
    name?: string;
    altitudeMsl?: number;
    airspaceRadius?: number;
    status?: string;
}

export interface HubListResponse {
    items: Hub[];
    total: number;
}
