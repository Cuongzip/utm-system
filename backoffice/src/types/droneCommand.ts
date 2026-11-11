import type zod from "zod";
import type {
    sendCommandBody,
    getCommandsResponse,
    getCommandsQueryParams,
} from "@/generated/drone";

export type CommandTypeGenerated = NonNullable<zod.infer<typeof sendCommandBody>["commandType"]>;
export type CommandStatusGenerated = NonNullable<
    NonNullable<zod.infer<typeof getCommandsQueryParams>["status"]>
>;

export type CommandType = CommandTypeGenerated | Uppercase<CommandTypeGenerated>;
export type CommandStatus = CommandStatusGenerated | Uppercase<CommandStatusGenerated>;

export const COMMAND_STATUS = {
    PENDING: "pending",
    SENT: "sent",
    ACKNOWLEDGED: "acknowledged",
    EXECUTING: "executing",
    COMPLETED: "completed",
    FAILED: "failed",
    CANCELLED: "cancelled",
} as const satisfies Record<string, CommandStatusGenerated>;

export const COMMAND_TYPE = {
    TAKEOFF: "takeoff",
    LAND: "land",
    RTL: "rtl",
    EMERGENCY_STOP: "emergency_stop",
    PAUSE: "pause",
    HOVER: "hover",
    RESUME: "resume",
} as const satisfies Record<string, CommandTypeGenerated>;

export const DEFAULT_COMMAND_STATUS: CommandStatusGenerated = COMMAND_STATUS.PENDING;

export type SendCommandPayload = Omit<zod.infer<typeof sendCommandBody>, "commandType"> & {
    commandType: CommandType;
};

export type DroneCommandGenerated = NonNullable<
    NonNullable<zod.infer<typeof getCommandsResponse>["items"]>[number]
>;

export type DroneCommand = Omit<DroneCommandGenerated, "id" | "commandType" | "status"> & {
    id: string;
    commandType: CommandType;
    status?: CommandStatus;
};

export type DroneCommandListResponse = Omit<
    NonNullable<zod.infer<typeof getCommandsResponse>>,
    "items"
> & {
    items?: DroneCommand[];
};
