"use client";

import { useState } from "react";
import { Landmark, Edit, PowerOff } from "lucide-react";
import {
    ChamferCard,
    ChamferButton,
    StatusBadge,
    ActionMenu,
    type ActionMenuItem,
    ConfirmDialog,
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
    TableCell,
    TableLoading,
    EmptyState,
    Pagination,
} from "@/components/ui";
import { usePagination } from "@/hooks";
import { formatDate, formatNullable } from "@/utils";
import {
    type Organization,
    DEFAULT_ORGANIZATION_STATUS,
    ORGANIZATION_STATUS,
    ORGANIZATION_TYPE_LABELS,
} from "@/types";

export interface OrganizationsTableProps {
    organizations: Organization[];
    loading: boolean;
    canManage: boolean;
    hasFilters?: boolean;
    onClearFilters?: () => void;
    onEditOrganization: (organization: Organization) => void;
    onDeleteOrganization: (id: string) => void;
}

export function OrganizationsTable({
    organizations = [],
    loading = false,
    canManage,
    hasFilters = false,
    onClearFilters,
    onEditOrganization,
    onDeleteOrganization,
}: OrganizationsTableProps) {
    const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(organizations);

    const getActions = (org: Organization): ActionMenuItem[] => {
        const items: ActionMenuItem[] = [
            {
                label: "Edit",
                icon: <Edit className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onEditOrganization(org),
            },
        ];

        if (org.status !== ORGANIZATION_STATUS.INACTIVE) {
            items.push({
                label: "Deactivate",
                icon: <PowerOff className="w-3.5 h-3.5" />,
                danger: true,
                onClick: () => setOrgToDelete(org),
            });
        }

        return items;
    };

    const colSpan = canManage ? 7 : 6;

    return (
        <div className="flex flex-col gap-4 w-full">
            <ChamferCard size="lg" className="w-full">
                <Table fixed={false}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>REGISTRATION</TableHead>
                            <TableHead>ORGANIZATION</TableHead>
                            <TableHead>TYPE</TableHead>
                            <TableHead>STATUS</TableHead>
                            <TableHead>CONTACT</TableHead>
                            <TableHead>CREATED</TableHead>
                            {canManage && <TableHead align="right">ACTIONS</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={colSpan} message="Loading organizations..." />
                        ) : organizations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={colSpan} className="py-10 text-center">
                                    <EmptyState
                                        icon={Landmark}
                                        title={
                                            hasFilters
                                                ? "No matching organizations"
                                                : "No organizations found"
                                        }
                                        description={
                                            hasFilters
                                                ? "No organizations match the active search or status filter."
                                                : "Register operators, enterprises, or civil aviation authorities."
                                        }
                                        action={
                                            hasFilters && onClearFilters ? (
                                                <ChamferButton
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={onClearFilters}
                                                >
                                                    Clear Filters
                                                </ChamferButton>
                                            ) : undefined
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((org) => {
                                const regText = formatNullable(org.registrationNumber);
                                const typeLabel = org.type
                                    ? (ORGANIZATION_TYPE_LABELS[org.type] ?? org.type.toUpperCase())
                                    : "—";
                                const contactText = formatNullable(org.contactInfo);

                                return (
                                    <TableRow
                                        key={org.id}
                                        onClick={
                                            canManage ? () => onEditOrganization(org) : undefined
                                        }
                                    >
                                        <TableCell
                                            mono
                                            bold
                                            truncate
                                            className="max-w-[140px]"
                                            tooltip={regText}
                                        >
                                            {regText}
                                        </TableCell>
                                        <TableCell
                                            darkText
                                            bold
                                            truncate
                                            className="max-w-[200px]"
                                            tooltip={org.name}
                                        >
                                            {org.name}
                                        </TableCell>
                                        <TableCell muted truncate tooltip={typeLabel}>
                                            {typeLabel}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={org.status ?? DEFAULT_ORGANIZATION_STATUS}
                                            />
                                        </TableCell>
                                        <TableCell
                                            muted
                                            truncate
                                            tooltip={contactText}
                                            className="max-w-[210px]"
                                        >
                                            {contactText}
                                        </TableCell>
                                        <TableCell mono muted className="whitespace-nowrap">
                                            {formatDate(org.createdOn)}
                                        </TableCell>
                                        {canManage && (
                                            <TableCell
                                                align="right"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <ActionMenu items={getActions(org)} />
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={totalItems}
                    onPageChange={setCurrentPage}
                    itemLabel="organizations"
                />
            </ChamferCard>

            <ConfirmDialog
                isOpen={Boolean(orgToDelete)}
                title="Deactivate Organization"
                description={`Are you sure you want to deactivate "${orgToDelete?.name}"? Its status will be switched to inactive.`}
                confirmText="Deactivate"
                onConfirm={() => {
                    if (orgToDelete) {
                        onDeleteOrganization(orgToDelete.id);
                    }
                    setOrgToDelete(null);
                }}
                onClose={() => setOrgToDelete(null)}
            />
        </div>
    );
}
