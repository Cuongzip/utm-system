"use client";

import { useTranslations } from "next-intl";
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import { MapPin, RotateCcw } from "lucide-react";
import { FormInput } from "@/components/ui";
import type { HubFormPayload } from "@/types";

interface HubLocationSectionProps {
    hasMovedFromOriginal: boolean;
    onResetLocation: () => void;
    register: UseFormRegister<HubFormPayload>;
    errors: FieldErrors<HubFormPayload>;
}

export function HubLocationSection({
    hasMovedFromOriginal,
    onResetLocation,
    register,
    errors,
}: HubLocationSectionProps) {
    const t = useTranslations("hubs.editor");

    return (
        <section className="flex flex-col gap-2.5 pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    {t("locationSection")}
                </h3>
                <div className="flex items-center gap-2.5">
                    {hasMovedFromOriginal && (
                        <button
                            type="button"
                            onClick={onResetLocation}
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
    );
}
