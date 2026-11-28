"use client";

import type { MutableRefObject } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Controller, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { CustomSelect, FormInput, AutoGenInput } from "@/components/ui";
import { translateStatusLabel, type AppLocale } from "@/i18n";
import { ACTIVE_HUB_STATUS, HUB_STATUSES, type HubFormPayload } from "@/types";

interface HubIdentitySectionProps {
    isEditMode: boolean;
    hubCode?: string;
    register: UseFormRegister<HubFormPayload>;
    control: Control<HubFormPayload>;
    errors: FieldErrors<HubFormPayload>;
    nameInputRef: MutableRefObject<HTMLInputElement | null>;
}

export function HubIdentitySection({
    isEditMode,
    hubCode,
    register,
    control,
    errors,
    nameInputRef,
}: HubIdentitySectionProps) {
    const t = useTranslations("hubs.editor");
    const locale = useLocale() as AppLocale;
    const nameRegistration = register("name");

    return (
        <section className="flex flex-col gap-3">
            {isEditMode ? (
                <FormInput
                    id="hubCode"
                    label={t("code")}
                    value={hubCode ?? ""}
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
                                    label: translateStatusLabel(opt, locale) ?? opt.toUpperCase(),
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
    );
}
