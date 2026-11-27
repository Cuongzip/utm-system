"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import {
    PageHeader,
    ChamferButton,
    ChamferCard,
    CustomSelect,
    EmptyState,
    ErrorState,
    Skeleton,
    UnderlineTabs,
} from "@/components/ui";
import {
    FleetKpiStrip,
    FleetHubStatusTab,
    FleetRebalancingTab,
    FleetConfigTab,
} from "@/components/fleet";
import {
    QUERY_KEYS,
    usePermissions,
    useFleetOverview,
    useFleetConfigs,
    useFleetActiveConfig,
    useFleetRebalancingPending,
    useFleetRebalancingActive,
    useFleetRebalancingHistory,
} from "@/hooks";
import { fleetService } from "@/services";

type FleetTab = "hubs" | "rebalancing" | "config";

export default function FleetPage() {
    const t = useTranslations("fleet");
    const tCommon = useTranslations("common");
    const queryClient = useQueryClient();
    const { canManageFleet, isLoading: permissionsLoading } = usePermissions();
    const [activeTab, setActiveTab] = useState<FleetTab>("hubs");

    const {
        data: overview,
        isLoading: overviewLoading,
        isError: overviewError,
    } = useFleetOverview(canManageFleet);
    const { data: configs = [], isLoading: configsLoading } = useFleetConfigs(canManageFleet);
    const { data: activeConfig } = useFleetActiveConfig(canManageFleet);
    const { data: pendingTasks = [], isLoading: pendingLoading } =
        useFleetRebalancingPending(canManageFleet);
    const { data: activeTasks = [], isLoading: activeLoading } =
        useFleetRebalancingActive(canManageFleet);
    const { data: historyTasks = [] } = useFleetRebalancingHistory(canManageFleet);

    const activateConfigMutation = useMutation({
        mutationFn: (id: string) => fleetService.activateConfig(id),
        meta: { defaultErrorMessage: t("switchModeFailed") },
        onSuccess: (cfg) => {
            toast.success(t("switchedProfileToast", { name: cfg.name ?? "" }));
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fleetConfigs });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fleetActiveConfig });
        },
    });

    const configOptions = useMemo(
        () =>
            configs
                .filter((c) => Boolean(c.id))
                .map((c) => ({
                    value: c.id!,
                    label: c.name || c.id!,
                })),
        [configs]
    );

    const fleetTabs = useMemo(
        () =>
            [
                { id: "hubs", label: t("tabs.hubs"), count: overview?.hubStatuses?.length },
                {
                    id: "rebalancing",
                    label: t("tabs.rebalancing"),
                    count: pendingTasks.length + activeTasks.length,
                },
                { id: "config", label: t("tabs.config") },
            ] as const,
        [t, overview?.hubStatuses?.length, pendingTasks.length, activeTasks.length]
    );

    const handleRefresh = () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fleetOverview });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fleetConfigs });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fleetActiveConfig });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fleetRebalancingPending });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fleetRebalancingActive });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fleetRebalancingHistory });
    };

    if (permissionsLoading) {
        return (
            <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
                <PageHeader title={t("title")} />
                <FleetKpiStrip loading />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, idx) => (
                        <ChamferCard key={idx} size="md">
                            <div className="p-4 h-36 flex flex-col justify-between">
                                <Skeleton className="h-4 w-36" />
                                <Skeleton className="h-2 w-full" />
                                <Skeleton className="h-8 w-full" />
                            </div>
                        </ChamferCard>
                    ))}
                </div>
            </div>
        );
    }

    if (!canManageFleet) {
        return (
            <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
                <PageHeader title={t("title")} />
                <ChamferCard size="md">
                    <EmptyState
                        icon={ShieldAlert}
                        title={t("accessRestrictedTitle")}
                        description={t("accessRestrictedDesc")}
                    />
                </ChamferCard>
            </div>
        );
    }

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-5">
            <PageHeader title={t("title")}>
                {configOptions.length > 0 && (
                    <div className="w-full sm:w-52">
                        <CustomSelect
                            ariaLabel={t("activeModeAria")}
                            value={activeConfig?.id ?? ""}
                            onValueChange={(id) => {
                                if (id && id !== activeConfig?.id) {
                                    activateConfigMutation.mutate(id);
                                }
                            }}
                            options={configOptions}
                            placeholder={t("activeModePlaceholder")}
                            disabled={activateConfigMutation.isPending}
                        />
                    </div>
                )}
                <ChamferButton variant="outline" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{tCommon("refresh")}</span>
                </ChamferButton>
            </PageHeader>

            {overviewError && !overview ? (
                <ErrorState
                    title={t("loadErrorTitle")}
                    description={t("loadErrorDesc")}
                    onRetry={handleRefresh}
                />
            ) : (
                <>
                    <FleetKpiStrip overview={overview} loading={overviewLoading} />

                    <UnderlineTabs
                        tabs={fleetTabs}
                        activeTab={activeTab}
                        onTabChange={setActiveTab}
                        ariaLabel={t("viewsAria")}
                    />

                    {activeTab === "hubs" && (
                        <FleetHubStatusTab
                            hubStatuses={overview?.hubStatuses ?? []}
                            loading={overviewLoading}
                        />
                    )}

                    {activeTab === "rebalancing" && (
                        <FleetRebalancingTab
                            pendingTasks={pendingTasks}
                            activeTasks={activeTasks}
                            historyTasks={historyTasks}
                            loading={pendingLoading || activeLoading}
                        />
                    )}

                    {activeTab === "config" && (
                        <FleetConfigTab
                            activeConfig={activeConfig}
                            configs={configs}
                            loading={configsLoading}
                        />
                    )}
                </>
            )}
        </div>
    );
}
