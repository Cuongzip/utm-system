"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import {
    PageHeader,
    ChamferCard,
    EmptyState,
    Skeleton,
    UnderlineTabs,
    type UnderlineTabItem,
} from "@/components/ui";
import { ApiKeysTab, QuickStartTab, ApiTesterTab } from "@/components/developer";
import { usePermissions, useIntegrationApiKeys } from "@/hooks";

type DeveloperTab = "keys" | "tester" | "docs";

export default function DeveloperPage() {
    const { canManageApiKeys, isLoading: permissionsLoading } = usePermissions();
    const { data: keys = [] } = useIntegrationApiKeys();
    const [activeTab, setActiveTab] = useState<DeveloperTab>("keys");

    if (permissionsLoading) {
        return (
            <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
                <PageHeader title="DEVELOPER PORTAL" />
                <div className="flex items-center gap-4 border-b border-slate-200 pb-2.5">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-28" />
                </div>
                <ChamferCard size="md">
                    <div className="p-5 flex flex-col gap-3">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <Skeleton key={idx} className="h-9 w-full" />
                        ))}
                    </div>
                </ChamferCard>
            </div>
        );
    }

    if (!canManageApiKeys) {
        return (
            <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
                <PageHeader title="DEVELOPER PORTAL" />
                <ChamferCard size="md">
                    <EmptyState
                        icon={ShieldAlert}
                        title="Administrator Access Required"
                        description="OEM API key management and integration credentials are restricted to Admin operators."
                    />
                </ChamferCard>
            </div>
        );
    }

    const activeKeysCount = keys.filter((k) => k.isActive !== false && !k.revokedAt).length;

    const tabs: readonly UnderlineTabItem<DeveloperTab>[] = [
        { id: "keys", label: "API Keys", count: activeKeysCount },
        { id: "tester", label: "API Playground" },
        { id: "docs", label: "Docs & Root CA" },
    ];

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
            <PageHeader title="DEVELOPER PORTAL" />

            <UnderlineTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                ariaLabel="Developer portal sections"
            />

            {activeTab === "keys" && <ApiKeysTab />}
            {activeTab === "tester" && <ApiTesterTab />}
            {activeTab === "docs" && <QuickStartTab />}
        </div>
    );
}
