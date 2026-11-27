"use client";

import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { UnderlineTabs } from "@/components/ui";

type EmergencyRouteTab = "console" | "incidents" | "trends";

export function EmergencyNavTabs() {
    const t = useTranslations("emergency.nav");
    const pathname = usePathname() || "";
    const router = useRouter();

    const navTabs = useMemo(
        () =>
            [
                { id: "console", label: t("console"), href: "/dashboard/emergency" },
                {
                    id: "incidents",
                    label: t("incidents"),
                    href: "/dashboard/emergency/incidents",
                },
                { id: "trends", label: t("trends"), href: "/dashboard/emergency/trends" },
            ] as const,
        [t]
    );

    const activeTab: EmergencyRouteTab = pathname.startsWith("/dashboard/emergency/trends")
        ? "trends"
        : pathname.startsWith("/dashboard/emergency/incidents")
          ? "incidents"
          : "console";

    return (
        <UnderlineTabs
            tabs={navTabs}
            activeTab={activeTab}
            onTabChange={(tabId) => {
                const target = navTabs.find((tab) => tab.id === tabId);
                if (target && target.href !== pathname) {
                    router.push(target.href);
                }
            }}
            ariaLabel={t("ariaLabel")}
        />
    );
}
