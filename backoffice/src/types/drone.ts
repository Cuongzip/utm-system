import type zod from "zod";
import type {
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

export type Drone = NonNullable<zod.infer<typeof getDroneByIdResponse>> & {
    id: string;
};

export type DroneListResponse = Omit<NonNullable<zod.infer<typeof getDronesResponse>>, "items"> & {
    items?: Drone[];
};
