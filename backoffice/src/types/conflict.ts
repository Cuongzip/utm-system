import type zod from "zod";
import type {
    resolveConflictBody,
    getAllConflictsResponse,
    getConflictByIdResponse,
} from "@/generated/conflict";

export type ResolveConflictPayload = zod.infer<typeof resolveConflictBody>;

export type ConflictGenerated = NonNullable<zod.infer<typeof getConflictByIdResponse>>;
export type Conflict = ConflictGenerated & {
    id: string;
};

export type ConflictListResponse = NonNullable<zod.infer<typeof getAllConflictsResponse>>;
