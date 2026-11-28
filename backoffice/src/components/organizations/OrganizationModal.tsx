"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useForm, Controller, type Resolver, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, CustomSelect, FormInput, AutoGenInput } from "@/components/ui";
import { parseApiError } from "@/utils";
import { translateStatusLabel, type AppLocale } from "@/i18n";
import { createOrganizationBody, updateOrganizationBody } from "@/generated/organization";
import {
    ORGANIZATION_TYPES,
    DEFAULT_ORGANIZATION_TYPE,
    ORGANIZATION_STATUSES,
    ORGANIZATION_STATUS,
    DEFAULT_ORGANIZATION_STATUS,
    type Organization,
    type CreateOrganizationPayload,
    type UpdateOrganizationPayload,
    type OrganizationFormPayload,
} from "@/types";

function buildOrganizationFormValues(org?: Organization | null): OrganizationFormPayload {
    return {
        registrationNumber: org?.registrationNumber || undefined,
        name: org?.name || "",
        type: org?.type ?? DEFAULT_ORGANIZATION_TYPE,
        contactInfo: org?.contactInfo || "",
        status: org?.status ?? DEFAULT_ORGANIZATION_STATUS,
    };
}

interface OrganizationModalProps {
    isOpen: boolean;
    organizationToEdit?: Organization | null;
    onClose: () => void;
    onSubmit: (
        payload: CreateOrganizationPayload | UpdateOrganizationPayload,
        id?: string
    ) => Promise<unknown>;
}

export function OrganizationModal({
    isOpen,
    organizationToEdit,
    onClose,
    onSubmit,
}: OrganizationModalProps) {
    const t = useTranslations("organizations.form");
    const tOrg = useTranslations("organizations");
    const tCommon = useTranslations("common");
    const locale = useLocale() as AppLocale;
    const [loading, setLoading] = useState(false);
    const isEdit = Boolean(organizationToEdit);

    const typeOptions = ORGANIZATION_TYPES.map((orgType) => ({
        value: orgType,
        label: tOrg(`types.${orgType}`),
    }));

    const statusOptions = ORGANIZATION_STATUSES.map((s) => ({
        value: s,
        label:
            s === ORGANIZATION_STATUS.PENDING_VERIFICATION
                ? tOrg("statusPendingVerification")
                : (translateStatusLabel(s, locale) ?? s.replace(/_/g, " ").toUpperCase()),
    }));

    const {
        register,
        handleSubmit,
        reset,
        control,
        setError,
        formState: { errors },
    } = useForm<OrganizationFormPayload>({
        resolver: zodResolver(
            isEdit ? updateOrganizationBody : createOrganizationBody
        ) as Resolver<OrganizationFormPayload>,
        defaultValues: buildOrganizationFormValues(organizationToEdit),
    });

    useEffect(() => {
        if (!isOpen) return;
        reset(buildOrganizationFormValues(organizationToEdit));
    }, [isOpen, organizationToEdit, reset]);

    const onFormSubmit = async (data: OrganizationFormPayload) => {
        try {
            setLoading(true);
            if (organizationToEdit) {
                const payload: UpdateOrganizationPayload = {
                    name: data.name.trim(),
                    contactInfo: data.contactInfo?.trim() || undefined,
                    status: data.status,
                };
                await onSubmit(payload, organizationToEdit.id);
            } else {
                const payload: CreateOrganizationPayload = {
                    name: data.name.trim(),
                    type: data.type,
                    registrationNumber: data.registrationNumber?.trim().toUpperCase() || undefined,
                    contactInfo: data.contactInfo?.trim() || undefined,
                };
                await onSubmit(payload);
            }
            onClose();
        } catch (err: unknown) {
            const parsed = parseApiError(err, tOrg("saveError"));
            if (Object.keys(parsed.fieldErrors).length > 0) {
                Object.entries(parsed.fieldErrors).forEach(([field, msg]) => {
                    setError(field as Path<OrganizationFormPayload>, { message: msg });
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? tOrg("editTitle") : tOrg("registerBtn")}
            maxWidth="500px"
            onSubmit={handleSubmit(onFormSubmit)}
            loading={loading}
            submitText={isEdit ? tCommon("saveChanges") : tOrg("registerBtn")}
            loadingText={tCommon("saving")}
        >
            <AutoGenInput
                id="orgRegistrationNumber"
                label={t("registrationNumber")}
                showAutoGen={!isEdit}
                disabled={isEdit}
                manualPlaceholder={t("registrationPlaceholder")}
                error={errors.registrationNumber?.message}
                {...register("registrationNumber")}
            />

            <FormInput
                id="orgName"
                label={t("nameLabel")}
                required
                placeholder={t("namePlaceholder")}
                error={errors.name?.message}
                {...register("name")}
            />

            <div className="form-row-2">
                <div className="form-group">
                    <label className="form-label" htmlFor="orgType">
                        {t("typeLabel")} {!isEdit && <span className="text-red-500">*</span>}
                    </label>
                    <Controller
                        name="type"
                        control={control}
                        render={({ field }) => (
                            <CustomSelect
                                id="orgType"
                                value={field.value ?? DEFAULT_ORGANIZATION_TYPE}
                                disabled={isEdit}
                                onValueChange={field.onChange}
                                options={typeOptions}
                                error={Boolean(errors.type)}
                            />
                        )}
                    />
                    {errors.type && <span className="form-error-msg">{errors.type.message}</span>}
                </div>

                {isEdit && (
                    <div className="form-group">
                        <label className="form-label" htmlFor="orgStatus">
                            {t("statusLabel")}
                        </label>
                        <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <CustomSelect
                                    id="orgStatus"
                                    value={field.value ?? DEFAULT_ORGANIZATION_STATUS}
                                    onValueChange={field.onChange}
                                    options={statusOptions}
                                    error={Boolean(errors.status)}
                                />
                            )}
                        />
                        {errors.status && (
                            <span className="form-error-msg">{errors.status.message}</span>
                        )}
                    </div>
                )}
            </div>

            <div className="form-group">
                <label className="form-label" htmlFor="orgContactInfo">
                    {t("contactLabel")}
                </label>
                <textarea
                    id="orgContactInfo"
                    rows={3}
                    placeholder={t("contactPlaceholder")}
                    className="form-input resize-none"
                    {...register("contactInfo")}
                />
                {errors.contactInfo && (
                    <span className="form-error-msg">{errors.contactInfo.message}</span>
                )}
            </div>
        </Modal>
    );
}
