import type zod from "zod";
import {
    getDevicesQueryParams,
    type registerDeviceBody,
    type getDeviceByIdResponse,
    type getDevicesResponse,
} from "@/generated/connectivity";

export type DeviceConnectionStatus = NonNullable<
    zod.infer<typeof getDevicesQueryParams>["connectionStatus"]
>;

export const DEVICE_CONNECTION_STATUSES =
    getDevicesQueryParams.shape.connectionStatus.unwrap().options;
export const ONLINE_DEVICE_STATUS: DeviceConnectionStatus = "online";
export const OFFLINE_DEVICE_STATUS: DeviceConnectionStatus = "offline";

export type DeviceRegistrationPayload = zod.infer<typeof registerDeviceBody>;

export type DeviceRegistrationGenerated = NonNullable<zod.infer<typeof getDeviceByIdResponse>>;
export type DeviceRegistration = DeviceRegistrationGenerated & {
    id: string;
};

export type DeviceQueryParams = zod.infer<typeof getDevicesQueryParams>;

export type DeviceRegistrationListResponse = Omit<
    NonNullable<zod.infer<typeof getDevicesResponse>>,
    "items"
> & {
    items?: DeviceRegistration[];
};
