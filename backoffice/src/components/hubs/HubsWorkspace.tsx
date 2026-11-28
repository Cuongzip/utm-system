"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Columns2, Plus, Table2 } from "lucide-react";
import { ChamferButton, ErrorState, PageHeader, TableFilterBar } from "@/components/ui";
import { HubsKpiStrip } from "./HubsKpiStrip";
import { HubsTable } from "./HubsTable";
import { HubEditorPanel } from "./HubEditorPanel";
import { HubsMap } from "./HubsMap";
import { useHubsWorkspaceData } from "./useHubsWorkspaceData";
import type { Hub, HubDraftPreview } from "@/types";
import { cn } from "@/lib";

type HubsViewMode = "split" | "table";

export function HubsWorkspace() {
    const t = useTranslations("hubs");
    const {
        hubs,
        filteredHubs,
        loading,
        hubsError,
        refetchHubs,
        canManageHubs,
        canEditHubs,
        statusOptions,
        searchQuery,
        setSearchQuery,
        statusFilter,
        setStatusFilter,
        hasActiveFilters,
        handleClearFilters,
        highlightedHubId,
        setHighlightedHubId,
        hubMetricsMap,
        kpiSummary,
        defaultCenter,
        saveHubMutation,
        handleChangeStatus,
        handleDeactivateHub,
    } = useHubsWorkspaceData();

    const [viewMode, setViewMode] = useState<HubsViewMode>("split");
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingHub, setEditingHub] = useState<Hub | null>(null);
    const [pickedCoords, setPickedCoords] = useState<{
        latitude: number;
        longitude: number;
        seq: number;
    } | null>(null);
    const [draftPreview, setDraftPreview] = useState<HubDraftPreview | null>(null);

    const handleSelectHub = useCallback(
        (hub: Hub | null) => {
            setHighlightedHubId(hub?.id ?? null);
        },
        [setHighlightedHubId]
    );

    const handleFocusOnMap = useCallback(
        (hub: Hub) => {
            setHighlightedHubId(hub.id);
            setViewMode("split");
        },
        [setHighlightedHubId]
    );

    const openCreateEditor = useCallback(() => {
        setHighlightedHubId(null);
        setEditingHub(null);
        setIsEditorOpen(true);
        setViewMode("split");
    }, [setHighlightedHubId]);

    const openEditEditor = useCallback(
        (hub: Hub) => {
            setEditingHub(hub);
            setHighlightedHubId(hub.id);
            setIsEditorOpen(true);
            setViewMode("split");
        },
        [setHighlightedHubId]
    );

    const closeEditor = useCallback(() => {
        setIsEditorOpen(false);
        setEditingHub(null);
        setDraftPreview(null);
    }, []);

    const handleMapPick = useCallback((coords: { latitude: number; longitude: number }) => {
        setPickedCoords((prev) => ({
            latitude: coords.latitude,
            longitude: coords.longitude,
            seq: (prev?.seq ?? 0) + 1,
        }));
    }, []);

    const isCreatingNewHub = isEditorOpen && !editingHub;
    const isSplitDesktop = viewMode === "split" || isEditorOpen;

    return (
        <div
            className={cn(
                "px-4 py-4 sm:px-6 sm:py-5 xl:px-8 xl:py-6 flex flex-col gap-4 w-full",
                isSplitDesktop ? "flex-1 min-h-0 lg:overflow-hidden" : "min-h-full"
            )}
        >
            <PageHeader title={t("title")}>
                <div
                    role="group"
                    aria-label={t("layoutAria")}
                    className="inline-flex items-center rounded-md border border-[var(--color-border-strong)] bg-[var(--color-surface-panel)] p-0.5"
                >
                    <button
                        type="button"
                        aria-pressed={viewMode === "split"}
                        onClick={() => setViewMode("split")}
                        className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                            viewMode === "split"
                                ? "bg-slate-800 text-white"
                                : "text-slate-600 hover:text-slate-900"
                        )}
                    >
                        <Columns2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t("splitView")}</span>
                    </button>
                    <button
                        type="button"
                        aria-pressed={viewMode === "table"}
                        onClick={() => {
                            if (isEditorOpen) closeEditor();
                            setViewMode("table");
                        }}
                        className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400",
                            viewMode === "table"
                                ? "bg-slate-800 text-white"
                                : "text-slate-600 hover:text-slate-900"
                        )}
                    >
                        <Table2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{t("tableView")}</span>
                    </button>
                </div>

                {canManageHubs && !isCreatingNewHub && (
                    <ChamferButton variant="dark" size="sm" onClick={openCreateEditor}>
                        <Plus className="w-4 h-4 text-white" aria-hidden="true" />
                        <span>{t("addHub")}</span>
                    </ChamferButton>
                )}
            </PageHeader>

            {hubsError && hubs.length === 0 ? (
                <ErrorState
                    title={t("loadErrorTitle")}
                    description={t("loadErrorDesc")}
                    onRetry={() => refetchHubs()}
                />
            ) : (
                <>
                    <HubsKpiStrip
                        totalHubs={hubs.length}
                        activeHubs={kpiSummary.activeHubs}
                        maintenanceHubs={kpiSummary.maintenanceHubs}
                        inactiveHubs={kpiSummary.inactiveHubs}
                        activeFlightsTotal={kpiSummary.activeFlightsTotal}
                        totalCapacity={kpiSummary.totalCapacity}
                        stationedDronesTotal={kpiSummary.stationedDronesTotal}
                        statusFilter={isEditorOpen ? "all" : statusFilter}
                        onFilterByStatus={setStatusFilter}
                        isLoading={loading}
                    />

                    {!isEditorOpen && (
                        <TableFilterBar
                            searchQuery={searchQuery}
                            onSearchChange={setSearchQuery}
                            searchPlaceholder={t("searchPlaceholder")}
                            statusFilter={statusFilter}
                            onStatusFilterChange={setStatusFilter}
                            statusOptions={statusOptions}
                            onClearFilters={handleClearFilters}
                            totalCount={hubs.length}
                            filteredCount={filteredHubs.length}
                            itemLabel={t("itemLabel")}
                        />
                    )}

                    {viewMode === "table" && !isEditorOpen ? (
                        <div className="w-full">
                            <HubsTable
                                hubs={filteredHubs}
                                totalHubsCount={hubs.length}
                                loading={loading}
                                selectedHubId={highlightedHubId}
                                hubMetricsMap={hubMetricsMap}
                                canManageHubs={canManageHubs}
                                canEditHubs={canEditHubs}
                                hasActiveFilters={hasActiveFilters}
                                compact={false}
                                onClearFilters={handleClearFilters}
                                onAddHub={canManageHubs ? openCreateEditor : undefined}
                                onSelectHub={handleSelectHub}
                                onFocusOnMap={handleFocusOnMap}
                                onEditHub={openEditEditor}
                                onChangeStatus={handleChangeStatus}
                                onDeactivateHub={handleDeactivateHub}
                            />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full flex-1 min-h-0">
                            <div
                                className={cn(
                                    "flex flex-col min-h-[420px] lg:min-h-0 lg:h-full",
                                    isEditorOpen ? "lg:col-span-5" : "lg:col-span-7"
                                )}
                            >
                                {isEditorOpen ? (
                                    <HubEditorPanel
                                        hubToEdit={editingHub}
                                        defaultCenter={defaultCenter}
                                        pickedCoords={pickedCoords}
                                        onDraftChange={setDraftPreview}
                                        onClose={closeEditor}
                                        onSubmit={(payload, id) =>
                                            saveHubMutation.mutateAsync({ payload, id })
                                        }
                                    />
                                ) : (
                                    <HubsTable
                                        hubs={filteredHubs}
                                        totalHubsCount={hubs.length}
                                        loading={loading}
                                        selectedHubId={highlightedHubId}
                                        hubMetricsMap={hubMetricsMap}
                                        canManageHubs={canManageHubs}
                                        canEditHubs={canEditHubs}
                                        hasActiveFilters={hasActiveFilters}
                                        compact
                                        onClearFilters={handleClearFilters}
                                        onAddHub={canManageHubs ? openCreateEditor : undefined}
                                        onSelectHub={handleSelectHub}
                                        onFocusOnMap={handleFocusOnMap}
                                        onEditHub={openEditEditor}
                                        onChangeStatus={handleChangeStatus}
                                        onDeactivateHub={handleDeactivateHub}
                                    />
                                )}
                            </div>

                            <div
                                className={cn(
                                    "flex flex-col min-h-[440px] lg:min-h-0 lg:h-full",
                                    isEditorOpen ? "lg:col-span-7" : "lg:col-span-5"
                                )}
                            >
                                <HubsMap
                                    hubs={filteredHubs}
                                    selectedHubId={highlightedHubId}
                                    hubMetricsMap={hubMetricsMap}
                                    onSelectHub={handleSelectHub}
                                    onEditHub={canEditHubs ? openEditEditor : undefined}
                                    pickMode={isEditorOpen}
                                    onMapPick={handleMapPick}
                                    draftPreview={draftPreview}
                                    editingHubId={editingHub?.id ?? null}
                                />
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
