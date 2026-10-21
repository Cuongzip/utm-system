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
