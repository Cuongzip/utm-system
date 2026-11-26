"use client";

import { useEffect, useState } from "react";
import { useForm, Controller, type Resolver, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Modal, CustomSelect, FormInput, AutoGenInput } from "@/components/ui";
import { parseApiError } from "@/utils";
import { createOrganizationBody, updateOrganizationBody } from "@/generated/organization";
import {
    ORGANIZATION_TYPES,
    ORGANIZATION_TYPE_LABELS,
    DEFAULT_ORGANIZATION_TYPE,
    ORGANIZATION_STATUSES,
    DEFAULT_ORGANIZATION_STATUS,
    type Organization,
    type CreateOrganizationPayload,
    type UpdateOrganizationPayload,
    type OrganizationFormPayload,
} from "@/types";

export interface OrganizationModalProps {
    isOpen: boolean;
    organizationToEdit?: Organization | null;
    onClose: () => void;
    onSubmit: (
        payload: CreateOrganizationPayload | UpdateOrganizationPayload,
        id?: string
    ) => Promise<unknown>;
}

const TYPE_OPTIONS = ORGANIZATION_TYPES.map((t) => ({
    value: t,
    label: ORGANIZATION_TYPE_LABELS[t] ?? t.toUpperCase(),
}));

const STATUS_OPTIONS = ORGANIZATION_STATUSES.map((s) => ({
    value: s,
    label: s.replace(/_/g, " ").toUpperCase(),
}));

export function OrganizationModal({
    isOpen,
    organizationToEdit,
    onClose,
    onSubmit,
}: OrganizationModalProps) {
    const [loading, setLoading] = useState(false);
    const isEdit = Boolean(organizationToEdit);

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
        defaultValues: {
            registrationNumber: undefined,
            name: "",
            type: DEFAULT_ORGANIZATION_TYPE,
            contactInfo: "",
            status: DEFAULT_ORGANIZATION_STATUS,
        },
    });

    useEffect(() => {
        if (!isOpen) return;

        reset({
            registrationNumber: organizationToEdit?.registrationNumber || undefined,
            name: organizationToEdit?.name || "",
            type: organizationToEdit?.type ?? DEFAULT_ORGANIZATION_TYPE,
            contactInfo: organizationToEdit?.contactInfo || "",
            status: organizationToEdit?.status ?? DEFAULT_ORGANIZATION_STATUS,
        });
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
            const parsed = parseApiError(err, "Failed to save organization");
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
            title={isEdit ? "Edit Organization" : "Register Organization"}
            maxWidth="500px"
            onSubmit={handleSubmit(onFormSubmit)}
            loading={loading}
            submitText={isEdit ? "Save Changes" : "Register Organization"}
            loadingText="Saving..."
        >
            <AutoGenInput
                id="orgRegistrationNumber"
                label="Registration Number"
                showAutoGen={!isEdit}
                disabled={isEdit}
                manualPlaceholder="e.g. ORG-2026-VN01"
                error={errors.registrationNumber?.message}
                {...register("registrationNumber")}
            />

            <FormInput
                id="orgName"
                label="Organization Name"
                required
                placeholder="e.g. SkyLink Drone Logistics JSC"
                error={errors.name?.message}
                {...register("name")}
            />

            <div className="form-row-2">
                <div className="form-group">
                    <label className="form-label" htmlFor="orgType">
                        Organization Type {!isEdit && <span className="text-red-500">*</span>}
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
                                options={TYPE_OPTIONS}
                                error={Boolean(errors.type)}
                            />
                        )}
                    />
                    {errors.type && <span className="form-error-msg">{errors.type.message}</span>}
                </div>

                {isEdit && (
                    <div className="form-group">
                        <label className="form-label" htmlFor="orgStatus">
                            Operational Status
                        </label>
                        <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <CustomSelect
                                    id="orgStatus"
                                    value={field.value ?? DEFAULT_ORGANIZATION_STATUS}
                                    onValueChange={field.onChange}
                                    options={STATUS_OPTIONS}
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
                    Contact Information
                </label>
                <textarea
                    id="orgContactInfo"
                    rows={3}
                    placeholder="Operations email, hotline phone, and registered office address..."
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
