"use client";

import { usePathname, useRouter } from "next/navigation";
import { UnderlineTabs } from "@/components/ui";

type EmergencyRouteTab = "console" | "incidents" | "trends";

const EMERGENCY_NAV_TABS = [
    { id: "console", label: "Live Console", href: "/dashboard/emergency" },
    { id: "incidents", label: "Incident History", href: "/dashboard/emergency/incidents" },
    { id: "trends", label: "Trend Analysis", href: "/dashboard/emergency/trends" },
] as const;

export function EmergencyNavTabs() {
    const pathname = usePathname() || "";
    const router = useRouter();

    const activeTab: EmergencyRouteTab = pathname.startsWith("/dashboard/emergency/trends")
        ? "trends"
        : pathname.startsWith("/dashboard/emergency/incidents")
          ? "incidents"
          : "console";

    return (
        <UnderlineTabs
            tabs={EMERGENCY_NAV_TABS}
            activeTab={activeTab}
            onTabChange={(tabId) => {
                const target = EMERGENCY_NAV_TABS.find((t) => t.id === tabId);
                if (target && target.href !== pathname) {
                    router.push(target.href);
                }
            }}
            ariaLabel="Emergency navigation"
        />
    );
}
