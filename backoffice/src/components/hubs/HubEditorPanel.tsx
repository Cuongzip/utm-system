"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch, type Resolver, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { ChamferCard, ChamferButton } from "@/components/ui";
import { parseApiError } from "@/utils";
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
import { buildHubFormSchema } from "./editor/hubFormSchema";
import { HubIdentitySection } from "./editor/HubIdentitySection";
import { HubLocationSection } from "./editor/HubLocationSection";
import { HubAirspaceSection } from "./editor/HubAirspaceSection";

interface HubEditorPanelProps {
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
    const [submitting, setSubmitting] = useState(false);
    const nameInputRef = useRef<HTMLInputElement | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const lastAppliedPickSeqRef = useRef<number>(0);

    const isEditMode = Boolean(hubToEdit);

    const formSchema = useMemo(
        () =>
            buildHubFormSchema(isEditMode, {
                radiusPositive: t("validation.radiusPositive"),
                wholePositive: t("validation.wholePositive"),
                floorNonNegative: t("validation.floorNonNegative"),
                ceilingPositive: t("validation.ceilingPositive"),
                ceilingAboveFloor: t("validation.ceilingAboveFloor"),
            }),
        [isEditMode, t]
    );

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
                    <HubIdentitySection
                        isEditMode={isEditMode}
                        hubCode={hubToEdit?.code}
                        register={register}
                        control={control}
                        errors={errors}
                        nameInputRef={nameInputRef}
                    />

                    <HubLocationSection
                        hasMovedFromOriginal={hasMovedFromOriginal}
                        onResetLocation={handleResetLocation}
                        register={register}
                        errors={errors}
                    />

                    <HubAirspaceSection register={register} errors={errors} />
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
