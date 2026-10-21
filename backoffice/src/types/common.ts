export type UTMMode = "3d" | "2d" | "split";

export interface SystemMetrics {
  activeFlights: number;
  totalDrones: number;
  activeAirspaces: number;
  activeConflicts: number;
  systemHealth: "OPTIMAL" | "DEGRADED" | "CRITICAL";
}
