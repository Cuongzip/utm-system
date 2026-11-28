import type zod from "zod";
import {
    getDevicesQueryParams,
    setDeviceTelemetryModeBody,
    type registerDeviceBody,
    type getDeviceByIdResponse,
    type getDevicesResponse,
    type getTelemetryModesResponseItem,
    type setDeviceTelemetryModeResponse,
    type getConnectivityStatusResponse,
    type getCaCertificateResponse,
    type getDeviceCertificateResponse,
    type issueCertificateResponse,
    type listApiKeysResponseItem,
    type createApiKeyBody,
    type createApiKeyResponse,
} from "@/generated/connectivity";

export type DeviceConnectionStatus = NonNullable<
    zod.infer<typeof getDevicesQueryParams>["connectionStatus"]
>;

export const DEVICE_CONNECTION_STATUSES =
    getDevicesQueryParams.shape.connectionStatus.unwrap().options;
export const ONLINE_DEVICE_STATUS: DeviceConnectionStatus = "online";
export const OFFLINE_DEVICE_STATUS: DeviceConnectionStatus = "offline";

export const TELEMETRY_MODES = setDeviceTelemetryModeBody.shape.mode.options;
export type TelemetryMode = zod.infer<typeof setDeviceTelemetryModeBody>["mode"];

export const OEM_API_KEY_SCOPES = ["telemetry:write", "drone:register", "status:read"] as const;
export type OemApiKeyScope = (typeof OEM_API_KEY_SCOPES)[number];

export type DeviceRegistrationPayload = zod.infer<typeof registerDeviceBody>;

type DeviceRegistrationGenerated = NonNullable<zod.infer<typeof getDeviceByIdResponse>>;
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

export type TelemetryModeConfig = NonNullable<zod.infer<typeof getTelemetryModesResponseItem>>;
export type SetTelemetryModePayload = zod.infer<typeof setDeviceTelemetryModeBody>;
export type SetTelemetryModeResponse = NonNullable<
    zod.infer<typeof setDeviceTelemetryModeResponse>
>;
export type ConnectivityStatusResponse = NonNullable<
    zod.infer<typeof getConnectivityStatusResponse>
>;
export type CaCertificate = NonNullable<zod.infer<typeof getCaCertificateResponse>>;
export type DeviceCertificate = NonNullable<zod.infer<typeof getDeviceCertificateResponse>>;
export type IssuedCertificateBundle = NonNullable<zod.infer<typeof issueCertificateResponse>>;
export type ApiKeyInfo = NonNullable<zod.infer<typeof listApiKeysResponseItem>>;
export type CreateApiKeyPayload = zod.infer<typeof createApiKeyBody>;
export type CreateApiKeyResponse = NonNullable<zod.infer<typeof createApiKeyResponse>>;
