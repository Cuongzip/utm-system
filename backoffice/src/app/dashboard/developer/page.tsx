"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
    const t = useTranslations("developer");
    const { canManageApiKeys, isLoading: permissionsLoading } = usePermissions();
    const { data: keys = [] } = useIntegrationApiKeys();
    const [activeTab, setActiveTab] = useState<DeveloperTab>("keys");

    if (permissionsLoading) {
        return (
            <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
                <PageHeader title={t("title")} />
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
                <PageHeader title={t("title")} />
                <ChamferCard size="md">
                    <EmptyState
                        icon={ShieldAlert}
                        title={t("adminRequiredTitle")}
                        description={t("adminRequiredDesc")}
                    />
                </ChamferCard>
            </div>
        );
    }

    const activeKeysCount = keys.filter((k) => k.isActive !== false && !k.revokedAt).length;

    const tabs: readonly UnderlineTabItem<DeveloperTab>[] = [
        { id: "keys", label: t("tabKeys"), count: activeKeysCount },
        { id: "tester", label: t("tabTester") },
        { id: "docs", label: t("tabDocs") },
    ];

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
            <PageHeader title={t("title")} />

            <UnderlineTabs
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                ariaLabel={t("tabsAria")}
            />

            {activeTab === "keys" && <ApiKeysTab />}
            {activeTab === "tester" && <ApiTesterTab />}
            {activeTab === "docs" && <QuickStartTab />}
        </div>
    );
}
