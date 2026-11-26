"use client";

import { useState, useCallback, useMemo, useDeferredValue } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ChamferButton,
    PageHeader,
    TableFilterBar,
    ErrorState,
    type SelectOption,
} from "@/components/ui";
import { OrganizationsTable, OrganizationModal } from "@/components/organizations";
import { organizationService } from "@/services/organizationService";
import { useCrudList, usePermissions, QUERY_KEYS } from "@/hooks";
import { createStatusOptions } from "@/utils";
import {
    ORGANIZATION_STATUS,
    ORGANIZATION_STATUSES,
    type Organization,
    type CreateOrganizationPayload,
    type UpdateOrganizationPayload,
} from "@/types";

const STATUS_OPTIONS: SelectOption[] = createStatusOptions(ORGANIZATION_STATUSES);

export default function OrganizationsPage() {
    const queryClient = useQueryClient();
    const { canManageOrganizations } = usePermissions();

    const fetchOrganizations = useCallback(
        () => organizationService.getOrganizations({ limit: 0 }),
        []
    );
    const deleteOrganization = useCallback(
        (id: string) => organizationService.deleteOrganization(id),
        []
    );

    const {
        items: organizations,
        loading,
        isError,
        refresh,
        isModalOpen,
        itemToEdit,
        openCreateModal,
        openEditModal,
        closeModal,
        handleDelete,
    } = useCrudList<Organization>({
        queryKey: QUERY_KEYS.organizations,
        fetchFn: fetchOrganizations,
        deleteFn: deleteOrganization,
        entityName: "Organization",
    });

    const saveMutation = useMutation({
        mutationFn: ({
            payload,
            id,
        }: {
            payload: CreateOrganizationPayload | UpdateOrganizationPayload;
            id?: string;
        }) =>
            id
                ? organizationService.updateOrganization(id, payload as UpdateOrganizationPayload)
                : organizationService.createOrganization(payload as CreateOrganizationPayload),
        onSuccess: (_data, variables) => {
            toast.success(
                variables.id
                    ? "Organization updated successfully"
                    : "Organization registered successfully"
            );
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizations });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.organizationsAll });
        },
        meta: { defaultErrorMessage: "Failed to save organization" },
    });

    const [searchQuery, setSearchQuery] = useState("");
    const deferredSearch = useDeferredValue(searchQuery);
    const [statusFilter, setStatusFilter] = useState("all");

    const hasFilters = Boolean(searchQuery.trim()) || statusFilter !== "all";

    const clearFilters = useCallback(() => {
        setSearchQuery("");
        setStatusFilter("all");
    }, []);

    const filteredOrganizations = useMemo(() => {
        const query = deferredSearch.toLowerCase().trim();
        const status = statusFilter.toLowerCase();
        return [...organizations]
            .filter((org) => {
                const matchesSearch =
                    !query ||
                    org.name.toLowerCase().includes(query) ||
                    (org.registrationNumber || "").toLowerCase().includes(query) ||
                    (org.contactInfo || "").toLowerCase().includes(query);
                const matchesStatus =
                    status === "all" || (org.status || "").toLowerCase() === status;
                return matchesSearch && matchesStatus;
            })
            .sort((a, b) => {
                const aInactive = a.status === ORGANIZATION_STATUS.INACTIVE ? 1 : 0;
                const bInactive = b.status === ORGANIZATION_STATUS.INACTIVE ? 1 : 0;
                if (aInactive !== bInactive) return aInactive - bInactive;
                return (a.name || "").localeCompare(b.name || "");
            });
    }, [organizations, deferredSearch, statusFilter]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-5 w-full">
            <PageHeader title="ORGANIZATIONS">
                {canManageOrganizations && (
                    <ChamferButton variant="dark" size="sm" onClick={openCreateModal}>
                        <Plus className="w-4 h-4 text-white" />
                        <span>Register Organization</span>
                    </ChamferButton>
                )}
            </PageHeader>

            <TableFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Search organization name, registration, or contact..."
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                statusOptions={STATUS_OPTIONS}
                onClearFilters={clearFilters}
                totalCount={organizations.length}
                filteredCount={filteredOrganizations.length}
            />

            {isError && organizations.length === 0 ? (
                <ErrorState
                    title="Unable to load organizations"
                    description="The Organization Service could not be reached. Please try again."
                    onRetry={refresh}
                />
            ) : (
                <OrganizationsTable
                    organizations={filteredOrganizations}
                    loading={loading}
                    canManage={canManageOrganizations}
                    hasFilters={hasFilters}
                    onClearFilters={clearFilters}
                    onEditOrganization={openEditModal}
                    onDeleteOrganization={handleDelete}
                />
            )}

            {canManageOrganizations && (
                <OrganizationModal
                    isOpen={isModalOpen}
                    organizationToEdit={itemToEdit}
                    onClose={closeModal}
                    onSubmit={(payload, id) => saveMutation.mutateAsync({ payload, id })}
                />
            )}
        </div>
    );
}
