export type UTMMode = "3d" | "2d" | "split";

export type FlightStatus =
  | "PENDING"
  | "APPROVED"
  | "ACTIVE"
  | "CONFORMING"
  | "NON_CONFORMING"
  | "CONTINGENT"
  | "COMPLETED"
  | "CANCELLED";

export type DroneStatus =
  | "IDLE"
  | "CHARGING"
  | "PRE_FLIGHT"
  | "IN_FLIGHT"
  | "RETURNING"
  | "MAINTENANCE"
  | "OFFLINE";

export interface Drone {
  id: string;
  serialNumber: string;
  model: string;
  batteryLevel: number;
  status: DroneStatus;
  currentLat?: number;
  currentLon?: number;
  currentAltitude?: number;
  organizationId: string;
  operatorId: string;
  updatedAt: string;
}

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

export interface AirspaceZone {
  id: string;
  name: string;
  type: "RESTRICTED" | "CONTROLLED" | "GEO_FENCE" | "NO_FLY";
  floorAltitude: number;
  ceilingAltitude: number;
  isActive: boolean;
}

export interface ConflictAlert {
  id: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  type: "STRATEGIC" | "TACTICAL" | "GEO_FENCE_BREACH" | "PROXIMITY";
  sourceDroneId: string;
  targetDroneId?: string;
  detectedAt: string;
  status: "ACTIVE" | "RESOLVED" | "ACKNOWLEDGED";
  description: string;
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

export interface SystemMetrics {
  activeFlights: number;
  totalDrones: number;
  activeAirspaces: number;
  activeConflicts: number;
  systemHealth: "OPTIMAL" | "DEGRADED" | "CRITICAL";
}

export type DeviceConnectionStatus = "online" | "offline" | "connecting";

export interface DeviceRegistration {
  id: string;
  droneId: string;
  droneRegistrationNumber?: string;
  droneModel?: string;
  deviceIdentifier: string;
  connectionStatus: DeviceConnectionStatus;
  socketId?: string;
  certificateFingerprint?: string;
  lastSeenAt?: string;
  createdOn: string;
  lastModifiedOn?: string;
}

export interface DeviceRegistrationListResponse {
  items: DeviceRegistration[];
  total: number;
}

export interface DeviceRegistrationPayload {
  droneId: string;
  deviceIdentifier: string;
  certificateFingerprint?: string;
}

export interface ConnectivityStats {
  totalDevices: number;
  onlineDevices: number;
  activeDevices: number;
  pendingCommands: number;
  protocolStatusCount: number;
  latencyMs: number;
  telemetryModes: Record<string, number>;
  commandQueue: {
    pendingCount: number;
    byPriority: Record<number, number>;
  };
}
