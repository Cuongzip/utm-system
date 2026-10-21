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
