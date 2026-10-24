import type zod from "zod";
import type {
    resolveConflictBody,
    getAllConflictsResponse,
    getConflictByIdResponse,
} from "@/generated/conflict";

export type ResolveConflictPayload = zod.infer<typeof resolveConflictBody>;

export type ConflictType = NonNullable<zod.infer<typeof getConflictByIdResponse>["conflictType"]>;
export type ConflictSeverity = NonNullable<zod.infer<typeof getConflictByIdResponse>["severity"]>;
export type ConflictStatus = NonNullable<zod.infer<typeof getConflictByIdResponse>["status"]>;
export type ResolutionStrategy = NonNullable<
    zod.infer<typeof getConflictByIdResponse>["resolutionStrategy"]
>;

export type ConflictGenerated = NonNullable<zod.infer<typeof getConflictByIdResponse>>;
export type Conflict = ConflictGenerated & {
    id: string;
};

export type ConflictListResponse = NonNullable<zod.infer<typeof getAllConflictsResponse>>;
