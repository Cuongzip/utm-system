"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Shield, Edit, Trash2 } from "lucide-react";
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
import { translateStatusLabel, type AppLocale } from "@/i18n";
import { formatNullable, formatHubName } from "@/utils";
import {
    type AirspaceZone,
    type AirspaceZoneType,
    AIRSPACE_ZONE_TYPE,
    DEFAULT_AIRSPACE_ZONE_STATUS,
    DEFAULT_AIRSPACE_ZONE_TYPE,
} from "@/types";

const DANGER_ZONE_TYPES = new Set<AirspaceZoneType>([
    AIRSPACE_ZONE_TYPE.NO_FLY_ZONE,
    AIRSPACE_ZONE_TYPE.PROHIBITED,
    AIRSPACE_ZONE_TYPE.EMERGENCY_EXCLUSION,
]);

const CAUTION_ZONE_TYPES = new Set<AirspaceZoneType>([
    AIRSPACE_ZONE_TYPE.RESTRICTED,
    AIRSPACE_ZONE_TYPE.TEMPORARY_RESTRICTION,
    AIRSPACE_ZONE_TYPE.WARNING,
]);

interface AirspaceTableProps {
    zones: AirspaceZone[];
    loading: boolean;
    canDelete: boolean;
    selectedZoneId?: string | null;
    hasFilters?: boolean;
    onClearFilters?: () => void;
    onSelectZone: (zone: AirspaceZone) => void;
    onDeleteZone: (id: string) => void;
    hubMap: Map<string, string>;
}

export function AirspaceTable({
    zones = [],
    loading = false,
    canDelete,
    selectedZoneId,
    hasFilters = false,
    onClearFilters,
    onSelectZone,
    onDeleteZone,
    hubMap = new Map(),
}: AirspaceTableProps) {
    const locale = useLocale() as AppLocale;
    const t = useTranslations("airspace");
    const tCommon = useTranslations("common");
    const [zoneToDelete, setZoneToDelete] = useState<AirspaceZone | null>(null);
    const { currentPage, totalPages, totalItems, paginatedItems, setCurrentPage } =
        usePagination(zones);

    const resolveZoneTypeLabel = (zoneType?: AirspaceZoneType | null) => {
        const effective = zoneType ?? DEFAULT_AIRSPACE_ZONE_TYPE;
        const translated = translateStatusLabel(effective, locale);
        if (translated) return translated;
        if (effective === AIRSPACE_ZONE_TYPE.HUB_ZONE) return t("zoneTypeBadges.hub_zone");
        if (effective === AIRSPACE_ZONE_TYPE.TEMPORARY_RESTRICTION) {
            return t("zoneTypeBadges.temporary_restriction");
        }
        return effective.replace(/_/g, " ").toUpperCase();
    };

    const getZoneTypeTagClass = (zoneType?: AirspaceZoneType | null) => {
        const effective = zoneType ?? DEFAULT_AIRSPACE_ZONE_TYPE;
        if (DANGER_ZONE_TYPES.has(effective)) {
            return "bg-red-50 border-red-200/90 text-red-700";
        }
        if (CAUTION_ZONE_TYPES.has(effective)) {
            return "bg-amber-50 border-amber-200/90 text-amber-800";
        }
        return "bg-slate-100 border-slate-200 text-slate-700";
    };

    const getActions = (zone: AirspaceZone): ActionMenuItem[] => {
        const items: ActionMenuItem[] = [
            {
                label: t("table.viewDetails"),
                icon: <Edit className="w-3.5 h-3.5 text-slate-500" />,
                onClick: () => onSelectZone(zone),
            },
        ];
        if (canDelete) {
            items.push({
                label: tCommon("delete"),
                icon: <Trash2 className="w-3.5 h-3.5" />,
                danger: true,
                onClick: () => setZoneToDelete(zone),
            });
        }
        return items;
    };

    return (
        <div className="flex flex-col gap-4 w-full">
            <ChamferCard size="lg" className="w-full">
                <Table fixed={false}>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("table.code")}</TableHead>
                            <TableHead>{t("table.zoneName")}</TableHead>
                            <TableHead>{t("table.type")}</TableHead>
                            <TableHead>{t("table.associatedHub")}</TableHead>
                            <TableHead>{t("table.status")}</TableHead>
                            <TableHead align="right">{t("table.actions")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableLoading colSpan={6} message={t("table.loading")} />
                        ) : zones.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="py-10 text-center">
                                    <EmptyState
                                        icon={Shield}
                                        title={
                                            hasFilters
                                                ? t("table.emptyFilteredTitle")
                                                : t("table.emptyTitle")
                                        }
                                        description={
                                            hasFilters
                                                ? t("table.emptyFilteredDesc")
                                                : t("table.emptyDesc")
                                        }
                                        action={
                                            hasFilters && onClearFilters ? (
                                                <ChamferButton
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={onClearFilters}
                                                >
                                                    {t("table.clearFilters")}
                                                </ChamferButton>
                                            ) : undefined
                                        }
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedItems.map((zone) => {
                                const isSelected = selectedZoneId === zone.id;
                                const hubName = formatHubName(null, zone.hubId, hubMap);
                                const zoneName = zone.name || t("table.unnamedSector");

                                return (
                                    <TableRow
                                        key={zone.id}
                                        selected={isSelected}
                                        onClick={() => onSelectZone(zone)}
                                    >
                                        <TableCell
                                            mono
                                            bold
                                            darkText
                                            truncate
                                            className="max-w-[130px]"
                                        >
                                            {formatNullable(zone.code)}
                                        </TableCell>
                                        <TableCell
                                            truncate
                                            bold
                                            className="max-w-[260px]"
                                            tooltip={zoneName}
                                        >
                                            <span className="font-semibold text-slate-900">
                                                {zoneName}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={`inline-flex items-center px-2 py-0.5 rounded border font-mono text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${getZoneTypeTagClass(zone.zoneType)}`}
                                            >
                                                {resolveZoneTypeLabel(zone.zoneType)}
                                            </span>
                                        </TableCell>
                                        <TableCell
                                            truncate
                                            muted
                                            className="max-w-[180px]"
                                            tooltip={hubName}
                                        >
                                            {hubName}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={zone.status ?? DEFAULT_AIRSPACE_ZONE_STATUS}
                                                showDot={true}
                                            />
                                        </TableCell>
                                        <TableCell
                                            align="right"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <ActionMenu items={getActions(zone)} />
                                        </TableCell>
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
                    itemLabel={t("table.zonesLabel")}
                />
            </ChamferCard>

            <ConfirmDialog
                isOpen={!!zoneToDelete}
                onClose={() => setZoneToDelete(null)}
                onConfirm={() => {
                    if (zoneToDelete) {
                        onDeleteZone(zoneToDelete.id);
                        setZoneToDelete(null);
                    }
                }}
                title={t("table.deleteTitle")}
                description={
                    <span>
                        {t("table.deleteDescPrefix")}{" "}
                        <strong className="text-slate-900">
                            {zoneToDelete?.name || t("table.thisSector")}
                        </strong>
                        ? {t("table.deleteDescSuffix")}
                    </span>
                }
                confirmText={t("table.deleteConfirm")}
            />
        </div>
    );
}
