"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { type Organization, DEFAULT_ORGANIZATION_STATUS, ORGANIZATION_STATUS } from "@/types";

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
    const t = useTranslations("organizations.table");
    const tOrg = useTranslations("organizations");
    const tCommon = useTranslations("common");
    const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(organizations);

    const getActions = (org: Organization): ActionMenuItem[] => {
        const items: ActionMenuItem[] = [
            {
                label: tCommon("edit"),
                icon: <Edit className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onEditOrganization(org),
            },
        ];

        if (org.status !== ORGANIZATION_STATUS.INACTIVE) {
            items.push({
                label: t("deactivate"),
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
                            <TableHead>{t("colRegistration")}</TableHead>
                            <TableHead>{t("colOrganization")}</TableHead>
                            <TableHead>{t("colType")}</TableHead>
                            <TableHead>{t("colStatus")}</TableHead>
                            <TableHead>{t("colContact")}</TableHead>
                            <TableHead>{t("colCreated")}</TableHead>
                            {canManage && <TableHead align="right">{t("colActions")}</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={colSpan} message={t("loading")} />
                        ) : organizations.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={colSpan} className="py-10 text-center">
                                    <EmptyState
                                        icon={Landmark}
                                        title={
                                            hasFilters ? t("emptyFilteredTitle") : t("emptyTitle")
                                        }
                                        description={
                                            hasFilters ? t("emptyFilteredDesc") : t("emptyDesc")
                                        }
                                        action={
                                            hasFilters && onClearFilters ? (
                                                <ChamferButton
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={onClearFilters}
                                                >
                                                    {t("clearFilters")}
                                                </ChamferButton>
                                            ) : undefined
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((org) => {
                                const regText = formatNullable(org.registrationNumber);
                                const typeLabel = org.type ? tOrg(`types.${org.type}`) : "—";
                                const contactText = formatNullable(org.contactInfo);
                                const contactParts = org.contactInfo
                                    ? org.contactInfo
                                          .split("|")
                                          .map((part) => part.trim())
                                          .filter(Boolean)
                                    : [];
                                const currentStatus = org.status ?? DEFAULT_ORGANIZATION_STATUS;

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
                                            className="min-w-[140px] whitespace-nowrap"
                                        >
                                            {regText}
                                        </TableCell>
                                        <TableCell
                                            darkText
                                            bold
                                            truncate
                                            className="max-w-[215px]"
                                            tooltip={org.name}
                                        >
                                            {org.name}
                                        </TableCell>
                                        <TableCell muted truncate tooltip={typeLabel}>
                                            {typeLabel}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={currentStatus}
                                                label={
                                                    currentStatus ===
                                                    ORGANIZATION_STATUS.PENDING_VERIFICATION
                                                        ? tOrg("statusPendingVerification")
                                                        : undefined
                                                }
                                            />
                                        </TableCell>
                                        <TableCell
                                            truncate
                                            tooltip={contactText}
                                            className="max-w-[195px]"
                                        >
                                            {contactParts.length > 1 ? (
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-medium text-slate-700 truncate">
                                                        {contactParts[0]}
                                                    </span>
                                                    <span className="text-[11px] font-mono text-slate-400 truncate">
                                                        {contactParts.slice(1).join(" · ")}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[var(--color-text-secondary)] font-medium truncate block">
                                                    {contactText}
                                                </span>
                                            )}
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
                    itemLabel={tOrg("itemLabel")}
                />
            </ChamferCard>

            <ConfirmDialog
                isOpen={Boolean(orgToDelete)}
                title={t("deactivateTitle")}
                description={t("deactivateDesc", { name: orgToDelete?.name ?? "" })}
                confirmText={t("deactivate")}
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
