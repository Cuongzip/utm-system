import zod from "zod";
import { createHubBody, updateHubBody } from "@/generated/hub";
import { HUB_AIRSPACE_DEFAULTS } from "@/types";

const normalizeOptionalNumber = (v: unknown) =>
    v === "" || v === null || v === undefined || Number.isNaN(v) ? undefined : v;

interface HubBoundsValidationMessages {
    radiusPositive: string;
    wholePositive: string;
    floorNonNegative: string;
    ceilingPositive: string;
    ceilingAboveFloor: string;
}

const makeHubBoundsRefinement =
    (messages: HubBoundsValidationMessages) =>
    (
        data: {
            airspaceRadius?: number;
            maxSimultaneousDrones?: number;
            airspaceFloor?: number;
            airspaceCeiling?: number;
        },
        ctx: zod.RefinementCtx
    ) => {
        if (data.airspaceRadius !== undefined && data.airspaceRadius <= 0) {
            ctx.addIssue({
                code: "custom",
                path: ["airspaceRadius"],
                message: messages.radiusPositive,
            });
        }
        if (
            data.maxSimultaneousDrones !== undefined &&
            (!Number.isInteger(data.maxSimultaneousDrones) || data.maxSimultaneousDrones <= 0)
        ) {
            ctx.addIssue({
                code: "custom",
                path: ["maxSimultaneousDrones"],
                message: messages.wholePositive,
            });
        }
        if (data.airspaceFloor !== undefined && data.airspaceFloor < 0) {
            ctx.addIssue({
                code: "custom",
                path: ["airspaceFloor"],
                message: messages.floorNonNegative,
            });
        }
        if (data.airspaceCeiling !== undefined && data.airspaceCeiling <= 0) {
            ctx.addIssue({
                code: "custom",
                path: ["airspaceCeiling"],
                message: messages.ceilingPositive,
            });
        }
        const effectiveFloor = data.airspaceFloor ?? HUB_AIRSPACE_DEFAULTS.airspaceFloor;
        const effectiveCeiling = data.airspaceCeiling ?? HUB_AIRSPACE_DEFAULTS.airspaceCeiling;
        if (effectiveCeiling <= effectiveFloor) {
            ctx.addIssue({
                code: "custom",
                path: ["airspaceCeiling"],
                message: messages.ceilingAboveFloor,
            });
        }
    };

const optionalNumberOverrides = {
    maxSimultaneousDrones: zod.preprocess(
        normalizeOptionalNumber,
        createHubBody.shape.maxSimultaneousDrones
    ),
    airspaceFloor: zod.preprocess(normalizeOptionalNumber, createHubBody.shape.airspaceFloor),
    airspaceCeiling: zod.preprocess(normalizeOptionalNumber, createHubBody.shape.airspaceCeiling),
};

export function buildHubFormSchema(isEditMode: boolean, messages: HubBoundsValidationMessages) {
    const refinement = makeHubBoundsRefinement(messages);
    return isEditMode
        ? updateHubBody.extend(optionalNumberOverrides).superRefine(refinement)
        : createHubBody.extend(optionalNumberOverrides).superRefine(refinement);
}
