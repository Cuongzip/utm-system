import type zod from "zod";
import {
    createDroneBody,
    updateDroneBody,
    getDroneByIdResponse,
    getDronesResponse,
    getDronesQueryParams,
} from "@/generated/drone";

export const DRONE_PHYSICS_DEFAULTS = {
    batteryCapacityWh: 400,
    maxPayload: 2.5,
    hoverPowerW: 350,
    cruisePowerW: 280,
    cruiseSpeedMs: 15,
    batteryHealthPct: 100,
    windToleranceMs: 12,
} as const;

export type CreateDronePayload = zod.infer<typeof createDroneBody>;
export type UpdateDronePayload = zod.infer<typeof updateDroneBody>;
export type DroneQueryParams = zod.infer<typeof getDronesQueryParams>;

export const DRONE_STATUSES = updateDroneBody.shape.status.unwrap().options;
type DroneStatus = (typeof DRONE_STATUSES)[number];

export const DRONE_STATUS = {
    AVAILABLE: "available",
    IN_FLIGHT: "in_flight",
    MAINTENANCE: "maintenance",
    CHARGING: "charging",
    OFFLINE: "offline",
    RETIRED: "retired",
} as const satisfies Record<string, DroneStatus>;

export const DEFAULT_DRONE_STATUS: DroneStatus = DRONE_STATUS.AVAILABLE;

export type DroneFormPayload = CreateDronePayload & Partial<Pick<UpdateDronePayload, "status">>;

export type Drone = NonNullable<zod.infer<typeof getDroneByIdResponse>> & {
    id: string;
};

export type DroneListResponse = Omit<NonNullable<zod.infer<typeof getDronesResponse>>, "items"> & {
    items?: Drone[];
};
