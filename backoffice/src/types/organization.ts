import type zod from "zod";
import {
    createOrganizationBody,
    updateOrganizationBody,
    getOrganizationByIdResponse,
    getOrganizationsResponse,
    getOrganizationsQueryParams,
} from "@/generated/organization";

export type CreateOrganizationPayload = zod.infer<typeof createOrganizationBody>;
export type UpdateOrganizationPayload = zod.infer<typeof updateOrganizationBody>;
export type OrganizationQueryParams = zod.infer<typeof getOrganizationsQueryParams>;

export const ORGANIZATION_TYPES = createOrganizationBody.shape.type.options;
export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const ORGANIZATION_TYPE = {
    OPERATOR: "operator",
    PARTNER: "partner",
    REGULATORY: "regulatory",
    SERVICE_PROVIDER: "service_provider",
    AUTHORITY: "authority",
    ENTERPRISE: "enterprise",
} as const satisfies Record<string, OrganizationType>;

export const DEFAULT_ORGANIZATION_TYPE: OrganizationType = ORGANIZATION_TYPE.OPERATOR;

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
    operator: "Drone Operator",
    partner: "Partner",
    regulatory: "Regulatory Body",
    service_provider: "Service Provider",
    authority: "Aviation Authority",
    enterprise: "Enterprise Client",
};

export const ORGANIZATION_STATUSES = updateOrganizationBody.shape.status.unwrap().options;
export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export const ORGANIZATION_STATUS = {
    ACTIVE: "active",
    SUSPENDED: "suspended",
    INACTIVE: "inactive",
    PENDING: "pending",
    PENDING_VERIFICATION: "pending_verification",
} as const satisfies Record<string, OrganizationStatus>;

export const DEFAULT_ORGANIZATION_STATUS: OrganizationStatus = ORGANIZATION_STATUS.ACTIVE;

export type OrganizationFormPayload = CreateOrganizationPayload &
    Partial<Pick<UpdateOrganizationPayload, "status">>;

export type Organization = NonNullable<zod.infer<typeof getOrganizationByIdResponse>> & {
    id: string;
    name: string;
};

export type OrganizationListResponse = Omit<
    NonNullable<zod.infer<typeof getOrganizationsResponse>>,
    "items"
> & {
    items?: Organization[];
};
