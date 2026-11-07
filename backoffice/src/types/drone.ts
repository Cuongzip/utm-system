import type zod from "zod";
import {
    createDroneBody,
    updateDroneBody,
    getDroneByIdResponse,
    getDronesResponse,
    getDronesQueryParams,
} from "@/generated/drone";

export type DroneRegistrationPayload = zod.infer<typeof createDroneBody>;
export type CreateDronePayload = DroneRegistrationPayload;
export type UpdateDronePayload = zod.infer<typeof updateDroneBody>;
export type DroneQueryParams = zod.infer<typeof getDronesQueryParams>;

export const DRONE_STATUSES = updateDroneBody.shape.status.unwrap().options;
export type DroneStatus = (typeof DRONE_STATUSES)[number];

export type DroneFormPayload = CreateDronePayload & Partial<Pick<UpdateDronePayload, "status">>;

export type Drone = NonNullable<zod.infer<typeof getDroneByIdResponse>> & {
    id: string;
};

export type DroneListResponse = Omit<NonNullable<zod.infer<typeof getDronesResponse>>, "items"> & {
    items?: Drone[];
};
