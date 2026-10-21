import type zod from "zod";
import type {
    createDroneBody,
    updateDroneBody,
    getDroneByIdResponse,
    getDronesResponse,
} from "@/generated/drone";

export type DroneRegistrationPayload = zod.infer<typeof createDroneBody>;
export type CreateDronePayload = DroneRegistrationPayload;
export type UpdateDronePayload = zod.infer<typeof updateDroneBody>;
export type DroneStatus = NonNullable<UpdateDronePayload["status"]>;

export type DroneGenerated = NonNullable<zod.infer<typeof getDroneByIdResponse>>;
export type Drone = DroneGenerated & {
    id: string;
};

export type DroneListResponse = Omit<NonNullable<zod.infer<typeof getDronesResponse>>, "items"> & {
    items?: Drone[];
};
