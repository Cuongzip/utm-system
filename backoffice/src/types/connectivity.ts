import type zod from "zod";
import type {
    registerDeviceBody,
    getDeviceByIdResponse,
    getDevicesResponse,
    getDevicesQueryParams,
} from "@/generated/connectivity";

export type DeviceConnectionStatus = NonNullable<
    zod.infer<typeof getDevicesQueryParams>["connectionStatus"]
>;

export type DeviceRegistrationPayload = zod.infer<typeof registerDeviceBody>;

export type DeviceRegistrationGenerated = NonNullable<zod.infer<typeof getDeviceByIdResponse>>;
export type DeviceRegistration = DeviceRegistrationGenerated & {
    id: string;
};

export type DeviceRegistrationListResponse = Omit<
    NonNullable<zod.infer<typeof getDevicesResponse>>,
    "items"
> & {
    items?: DeviceRegistration[];
};
