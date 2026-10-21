import type zod from "zod";
import type {
    createOrganizationBody,
    updateOrganizationBody,
    getOrganizationByIdResponse,
    getOrganizationsResponse,
} from "@/generated/organization";

export type CreateOrganizationPayload = zod.infer<typeof createOrganizationBody>;
export type UpdateOrganizationPayload = zod.infer<typeof updateOrganizationBody>;
export type OrganizationType = NonNullable<zod.infer<typeof getOrganizationByIdResponse>["type"]>;
export type OrganizationStatus = NonNullable<
    zod.infer<typeof getOrganizationByIdResponse>["status"]
>;

export type OrganizationGenerated = NonNullable<zod.infer<typeof getOrganizationByIdResponse>>;
export type Organization = OrganizationGenerated & {
    id: string;
};

export type OrganizationListResponse = Omit<
    NonNullable<zod.infer<typeof getOrganizationsResponse>>,
    "items"
> & {
    items?: Organization[];
};
