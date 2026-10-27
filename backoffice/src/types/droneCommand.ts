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

export type DroneCommandQueryParams = zod.infer<typeof getCommandsQueryParams>;

export type DroneCommandListResponse = Omit<
    NonNullable<zod.infer<typeof getCommandsResponse>>,
    "items"
> & {
    items?: DroneCommand[];
};
