"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm, useWatch, Controller, type Resolver, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MapPin, RotateCcw, X } from "lucide-react";
import zod from "zod";
import { ChamferCard, ChamferButton, CustomSelect, FormInput, AutoGenInput } from "@/components/ui";
import { parseApiError } from "@/utils";
import { translateStatusLabel, type AppLocale } from "@/i18n";
import { createHubBody, updateHubBody } from "@/generated/hub";
import {
    ACTIVE_HUB_STATUS,
    HUB_AIRSPACE_DEFAULTS,
    HUB_STATUSES,
    type CreateHubPayload,
    type Hub,
    type HubDraftPreview,
    type HubFormPayload,
    type UpdateHubPayload,
} from "@/types";

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

export interface HubEditorPanelProps {
    hubToEdit: Hub | null;
    defaultCenter: { latitude: number; longitude: number };
    pickedCoords: { latitude: number; longitude: number; seq: number } | null;
    onDraftChange: (draft: HubDraftPreview | null) => void;
    onClose: () => void;
    onSubmit: (payload: CreateHubPayload | UpdateHubPayload, id?: string) => Promise<unknown>;
}

export function HubEditorPanel({
    hubToEdit,
    defaultCenter,
    pickedCoords,
    onDraftChange,
    onClose,
    onSubmit,
}: HubEditorPanelProps) {
    const t = useTranslations("hubs.editor");
    const tHubs = useTranslations("hubs");
    const tCommon = useTranslations("common");
    const locale = useLocale() as AppLocale;
    const [submitting, setSubmitting] = useState(false);
    const nameInputRef = useRef<HTMLInputElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const lastAppliedPickSeqRef = useRef<number>(0);

    const isEditMode = Boolean(hubToEdit);

    const formSchema = useMemo(() => {
        const refinement = makeHubBoundsRefinement({
            radiusPositive: t("validation.radiusPositive"),
            wholePositive: t("validation.wholePositive"),
            floorNonNegative: t("validation.floorNonNegative"),
            ceilingPositive: t("validation.ceilingPositive"),
            ceilingAboveFloor: t("validation.ceilingAboveFloor"),
        });
        return isEditMode
            ? updateHubBody.extend(optionalNumberOverrides).superRefine(refinement)
            : createHubBody.extend(optionalNumberOverrides).superRefine(refinement);
    }, [isEditMode, t]);

    const {
        register,
        handleSubmit,
        reset,
        control,
        setError,
        setValue,
        formState: { errors },
    } = useForm<HubFormPayload>({
        resolver: zodResolver(formSchema) as Resolver<HubFormPayload>,
        defaultValues: {
            code: undefined,
            name: "",
            location: defaultCenter,
            airspaceRadius: HUB_AIRSPACE_DEFAULTS.airspaceRadius,
            altitudeMsl: HUB_AIRSPACE_DEFAULTS.altitudeMsl,
            maxSimultaneousDrones: HUB_AIRSPACE_DEFAULTS.maxSimultaneousDrones,
            airspaceFloor: HUB_AIRSPACE_DEFAULTS.airspaceFloor,
            airspaceCeiling: HUB_AIRSPACE_DEFAULTS.airspaceCeiling,
            status: ACTIVE_HUB_STATUS,
        },
    });

    useEffect(() => {
        const matchedStatus = hubToEdit?.status
            ? HUB_STATUSES.find((s) => s.toLowerCase() === hubToEdit.status?.toLowerCase())
            : undefined;

        reset({
            code: hubToEdit?.code || undefined,
            name: hubToEdit?.name || "",
            location: {
                latitude: hubToEdit?.location?.latitude ?? defaultCenter.latitude,
                longitude: hubToEdit?.location?.longitude ?? defaultCenter.longitude,
            },
            airspaceRadius: hubToEdit?.airspaceRadius ?? HUB_AIRSPACE_DEFAULTS.airspaceRadius,
            altitudeMsl: hubToEdit?.altitudeMsl ?? HUB_AIRSPACE_DEFAULTS.altitudeMsl,
            maxSimultaneousDrones:
                hubToEdit?.maxSimultaneousDrones ?? HUB_AIRSPACE_DEFAULTS.maxSimultaneousDrones,
            airspaceFloor: hubToEdit?.airspaceFloor ?? HUB_AIRSPACE_DEFAULTS.airspaceFloor,
            airspaceCeiling: hubToEdit?.airspaceCeiling ?? HUB_AIRSPACE_DEFAULTS.airspaceCeiling,
            status: matchedStatus ?? ACTIVE_HUB_STATUS,
        });

        requestAnimationFrame(() => {
            if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollTop = 0;
            }
            nameInputRef.current?.focus({ preventScroll: true });
        });
    }, [hubToEdit, defaultCenter.latitude, defaultCenter.longitude, reset]);

    useEffect(() => {
        if (!pickedCoords || pickedCoords.seq === lastAppliedPickSeqRef.current) return;
        lastAppliedPickSeqRef.current = pickedCoords.seq;
        setValue("location.latitude", pickedCoords.latitude, {
            shouldDirty: true,
            shouldValidate: true,
        });
        setValue("location.longitude", pickedCoords.longitude, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }, [pickedCoords, setValue]);

    const [
        watchedLat,
        watchedLng,
        watchedRadius,
        watchedFloor,
        watchedCeiling,
        watchedCode,
        watchedName,
        watchedStatus,
    ] = useWatch({
        control,
        name: [
            "location.latitude",
            "location.longitude",
            "airspaceRadius",
            "airspaceFloor",
            "airspaceCeiling",
            "code",
            "name",
            "status",
        ],
    });

    useEffect(() => {
        if (Number.isFinite(watchedLat) && Number.isFinite(watchedLng)) {
            onDraftChange({
                latitude: watchedLat,
                longitude: watchedLng,
                airspaceRadius:
                    Number.isFinite(watchedRadius) && watchedRadius > 0
                        ? watchedRadius
                        : HUB_AIRSPACE_DEFAULTS.airspaceRadius,
                airspaceFloor: Number.isFinite(watchedFloor)
                    ? watchedFloor
                    : HUB_AIRSPACE_DEFAULTS.airspaceFloor,
                airspaceCeiling: Number.isFinite(watchedCeiling)
                    ? watchedCeiling
                    : HUB_AIRSPACE_DEFAULTS.airspaceCeiling,
                code: hubToEdit?.code || watchedCode,
                name: watchedName,
                status: watchedStatus,
            });
        }
    }, [
        watchedLat,
        watchedLng,
        watchedRadius,
        watchedFloor,
        watchedCeiling,
        watchedCode,
        watchedName,
        watchedStatus,
        hubToEdit?.code,
        onDraftChange,
    ]);

    useEffect(() => {
        return () => {
            onDraftChange(null);
        };
    }, [onDraftChange]);

    const nameRegistration = register("name");

    const onFormSubmit = async (values: HubFormPayload) => {
        try {
            setSubmitting(true);

            const capacityFields = {
                maxSimultaneousDrones: values.maxSimultaneousDrones,
                airspaceFloor: values.airspaceFloor,
                airspaceCeiling: values.airspaceCeiling,
            };

            if (hubToEdit) {
                const payload: UpdateHubPayload = {
                    name: values.name?.trim() || undefined,
                    location: values.location,
                    airspaceRadius: values.airspaceRadius,
                    altitudeMsl: values.altitudeMsl,
                    status: values.status,
                    ...capacityFields,
                };
                await onSubmit(payload, hubToEdit.id);
            } else {
                const payload: CreateHubPayload = {
                    code: values.code?.trim() ? values.code.trim().toUpperCase() : undefined,
                    name: values.name.trim(),
                    location: values.location,
                    airspaceRadius: values.airspaceRadius,
                    altitudeMsl: values.altitudeMsl,
                    ...capacityFields,
                };
                await onSubmit(payload);
            }
            onClose();
        } catch (err: unknown) {
            const parsed = parseApiError(err, tHubs("saveError"));
            if (Object.keys(parsed.fieldErrors).length > 0) {
                Object.entries(parsed.fieldErrors).forEach(([field, msg]) => {
                    if (field === "latitude" || field === "location.latitude") {
                        setError("location.latitude", { message: msg });
                    } else if (field === "longitude" || field === "location.longitude") {
                        setError("location.longitude", { message: msg });
                    } else if (field === "airspaceBoundsValid") {
                        setError("airspaceCeiling", { message: msg });
                    } else {
                        setError(field as Path<HubFormPayload>, { message: msg });
                    }
                });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const originalLat = hubToEdit?.location?.latitude;
    const originalLng = hubToEdit?.location?.longitude;
    const hasMovedFromOriginal =
        isEditMode &&
        originalLat !== undefined &&
        originalLng !== undefined &&
        Number.isFinite(watchedLat) &&
        Number.isFinite(watchedLng) &&
        (Math.abs(watchedLat - originalLat) > 0.000001 ||
            Math.abs(watchedLng - originalLng) > 0.000001);

    const handleResetLocation = () => {
        if (originalLat === undefined || originalLng === undefined) return;
        setValue("location.latitude", originalLat, { shouldDirty: true, shouldValidate: true });
        setValue("location.longitude", originalLng, { shouldDirty: true, shouldValidate: true });
    };

    return (
        <ChamferCard size="lg" className="w-full h-full flex flex-col min-h-0">
            <div className="px-5 py-3 border-b border-[var(--color-border-default)] flex items-center justify-between gap-3 shrink-0 bg-[var(--color-surface-panel)]">
                <h2 className="text-[15px] font-bold text-[var(--color-text-primary)] tracking-tight">
                    {isEditMode ? t("editTitle") : t("registerTitle")}
                </h2>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors cursor-pointer"
                    aria-label={t("closeAria")}
                >
                    <X className="w-4 h-4" aria-hidden="true" />
                </button>
            </div>

            <form
                onSubmit={handleSubmit(onFormSubmit)}
                className="flex flex-col flex-1 min-h-0"
                noValidate
            >
                <div
                    ref={scrollContainerRef}
                    className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-3.5 flex flex-col gap-4"
                >
                    <section className="flex flex-col gap-3">
                        {isEditMode ? (
                            <FormInput
                                id="hubCode"
                                label={t("code")}
                                value={hubToEdit?.code ?? ""}
                                disabled
                                readOnly
                                className="font-mono"
                            />
                        ) : (
                            <AutoGenInput
                                id="hubCode"
                                label={t("code")}
                                showAutoGen
                                manualPlaceholder={t("codePlaceholder")}
                                spellCheck={false}
                                autoComplete="off"
                                required
                                error={errors.code?.message}
                                {...register("code")}
                            />
                        )}

                        <FormInput
                            id="hubName"
                            label={t("hubName")}
                            required
                            autoComplete="off"
                            placeholder={t("hubNamePlaceholder")}
                            error={errors.name?.message}
                            {...nameRegistration}
                            ref={(el) => {
                                nameRegistration.ref(el);
                                nameInputRef.current = el;
                            }}
                        />

                        {isEditMode && (
                            <div className="form-group">
                                <label className="form-label" htmlFor="hubStatus">
                                    {t("operationalStatus")}
                                </label>
                                <Controller
                                    name="status"
                                    control={control}
                                    render={({ field }) => (
                                        <CustomSelect
                                            id="hubStatus"
                                            value={field.value ?? ACTIVE_HUB_STATUS}
                                            onValueChange={field.onChange}
                                            options={HUB_STATUSES.map((opt) => ({
                                                value: opt,
                                                label:
                                                    translateStatusLabel(opt, locale) ??
                                                    opt.toUpperCase(),
                                            }))}
                                            error={Boolean(errors.status)}
                                        />
                                    )}
                                />
                                {errors.status && (
                                    <span className="form-error-msg">{errors.status.message}</span>
                                )}
                            </div>
                        )}
                    </section>

                    <section className="flex flex-col gap-2.5 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between gap-2">
                            <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                                {t("locationSection")}
                            </h3>
                            <div className="flex items-center gap-2.5">
                                {hasMovedFromOriginal && (
                                    <button
                                        type="button"
                                        onClick={handleResetLocation}
                                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 rounded cursor-pointer"
                                    >
                                        <RotateCcw className="w-3 h-3" aria-hidden="true" />
                                        <span>{t("resetLocation")}</span>
                                    </button>
                                )}
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                                    <MapPin className="w-3 h-3 text-slate-400" aria-hidden="true" />
                                    <span>{t("clickMapHint")}</span>
                                </span>
                            </div>
                        </div>

                        <div className="form-row-2">
                            <FormInput
                                id="hubLatitude"
                                label={t("latitude")}
                                required
                                type="number"
                                step="any"
                                inputMode="decimal"
                                placeholder="10.7769"
                                error={errors.location?.latitude?.message}
                                {...register("location.latitude", { valueAsNumber: true })}
                            />
                            <FormInput
                                id="hubLongitude"
                                label={t("longitude")}
                                required
                                type="number"
                                step="any"
                                inputMode="decimal"
                                placeholder="106.7009"
                                error={errors.location?.longitude?.message}
                                {...register("location.longitude", { valueAsNumber: true })}
                            />
                        </div>

                        <FormInput
                            id="altitudeMsl"
                            label={t("altitudeMsl")}
                            required
                            type="number"
                            step="any"
                            min={0}
                            inputMode="decimal"
                            placeholder="12.5"
                            error={errors.altitudeMsl?.message}
                            {...register("altitudeMsl", { valueAsNumber: true })}
                        />
                    </section>

                    <section className="flex flex-col gap-2.5 pt-3 border-t border-slate-100">
                        <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                            {t("airspaceSection")}
                        </h3>

                        <div className="form-row-2">
                            <FormInput
                                id="airspaceRadius"
                                label={t("protectionRadiusM")}
                                required
                                type="number"
                                step="any"
                                min={1}
                                inputMode="decimal"
                                placeholder="1500"
                                error={errors.airspaceRadius?.message}
                                {...register("airspaceRadius", { valueAsNumber: true })}
                            />
                            <FormInput
                                id="maxSimultaneousDrones"
                                label={t("maxConcurrentDrones")}
                                type="number"
                                step={1}
                                min={1}
                                inputMode="numeric"
                                placeholder="10"
                                error={errors.maxSimultaneousDrones?.message}
                                {...register("maxSimultaneousDrones", { valueAsNumber: true })}
                            />
                        </div>

                        <div className="form-row-2">
                            <FormInput
                                id="airspaceFloor"
                                label={t("airspaceFloorM")}
                                type="number"
                                step="any"
                                min={0}
                                inputMode="decimal"
                                placeholder="0"
                                error={errors.airspaceFloor?.message}
                                {...register("airspaceFloor", { valueAsNumber: true })}
                            />
                            <FormInput
                                id="airspaceCeiling"
                                label={t("airspaceCeilingM")}
                                type="number"
                                step="any"
                                min={1}
                                inputMode="decimal"
                                placeholder="120"
                                error={errors.airspaceCeiling?.message}
                                {...register("airspaceCeiling", { valueAsNumber: true })}
                            />
                        </div>
                    </section>
                </div>

                <div className="px-5 py-3.5 border-t border-[var(--color-border-default)] bg-[var(--color-surface-panel)] flex items-center justify-end gap-2.5 shrink-0">
                    <ChamferButton
                        variant="outline"
                        size="sm"
                        clip="xs"
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                    >
                        {tCommon("cancel")}
                    </ChamferButton>
                    <ChamferButton
                        variant="dark"
                        size="sm"
                        clip="sm"
                        type="submit"
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                <span>{isEditMode ? t("saving") : t("creating")}</span>
                            </>
                        ) : (
                            <span>{isEditMode ? tCommon("saveChanges") : t("createHub")}</span>
                        )}
                    </ChamferButton>
                </div>
            </form>
        </ChamferCard>
    );
}
