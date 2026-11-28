"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Sliders,
    Radio,
    Compass,
    PlaneTakeoff,
    Bot,
    Building2,
    Landmark,
    Shield,
    AlertOctagon,
    PlayCircle,
    Siren,
    Layers,
    CloudSun,
    Code2,
    Settings,
    Menu,
    X,
} from "lucide-react";

import {
    useConflictsActive,
    useEmergencyActiveIncidents,
    usePermissions,
    type Permissions,
} from "@/hooks";
import { CLOSED_INCIDENT_STATUSES } from "@/types";
import { AuthenticationInfo } from "./AuthenticationInfo";

type SidebarTabId =
    | "dashboard"
    | "controlCenter"
    | "connectivity"
    | "missions"
    | "flights"
    | "fleet"
    | "drones"
    | "hubs"
    | "organizations"
    | "airspace"
    | "weather"
    | "conflicts"
    | "simulation"
    | "emergency"
    | "developer"
    | "settings";

type SectionKey = "operations" | "planningAssets" | "safetyWeather" | "platform";

interface NavItemConfig {
    id: SidebarTabId;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    isVisible?: (permissions: Permissions) => boolean;
}

interface NavSectionConfig {
    sectionKey: SectionKey;
    items: NavItemConfig[];
}

const NAV_SECTIONS: NavSectionConfig[] = [
    {
        sectionKey: "operations",
        items: [
            { id: "dashboard", href: "/dashboard", icon: LayoutDashboard },
            { id: "controlCenter", href: "/dashboard/control-center", icon: Sliders },
            { id: "connectivity", href: "/dashboard/connectivity", icon: Radio },
            { id: "simulation", href: "/dashboard/simulation", icon: PlayCircle },
        ],
    },
    {
        sectionKey: "planningAssets",
        items: [
            { id: "missions", href: "/dashboard/missions", icon: Compass },
            { id: "flights", href: "/dashboard/flights", icon: PlaneTakeoff },
            {
                id: "fleet",
                href: "/dashboard/fleet",
                icon: Layers,
                isVisible: (p) => p.canManageFleet,
            },
            { id: "drones", href: "/dashboard/drones", icon: Bot },
            { id: "hubs", href: "/dashboard/hubs", icon: Building2 },
            { id: "organizations", href: "/dashboard/organizations", icon: Landmark },
        ],
    },
    {
        sectionKey: "safetyWeather",
        items: [
            { id: "airspace", href: "/dashboard/airspace", icon: Shield },
            { id: "weather", href: "/dashboard/weather", icon: CloudSun },
            { id: "conflicts", href: "/dashboard/conflicts", icon: AlertOctagon },
            { id: "emergency", href: "/dashboard/emergency", icon: Siren },
        ],
    },
    {
        sectionKey: "platform",
        items: [
            {
                id: "developer",
                href: "/dashboard/developer",
                icon: Code2,
                isVisible: (p) => p.canManageApiKeys,
            },
            { id: "settings", href: "/dashboard/settings", icon: Settings },
        ],
    },
];

function formatNavCount(count: number): string {
    return count > 99 ? "99+" : String(count).padStart(2, "0");
}

export function Sidebar() {
    const t = useTranslations("nav");
    const pathname = usePathname();
    const permissions = usePermissions();
    const { data: activeConflicts = [] } = useConflictsActive();
    const { data: activeIncidents = [] } = useEmergencyActiveIncidents();
    const [mobileOpen, setMobileOpen] = useState(false);

    const conflictsCount = activeConflicts.length;
    const emergencyCount = useMemo(
        () =>
            activeIncidents.filter(
                (inc) => !inc.status || !CLOSED_INCIDENT_STATUSES.includes(inc.status)
            ).length,
        [activeIncidents]
    );

    const visibleSections = NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => !item.isVisible || item.isVisible(permissions)),
    })).filter((section) => section.items.length > 0);

    const isImmersiveCockpit = /^\/dashboard\/flights\/[^/]+\/cockpit(?:\/|$)/.test(pathname);

    useEffect(() => {
        if (!mobileOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setMobileOpen(false);
            }
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [mobileOpen]);

    if (isImmersiveCockpit) {
        return null;
    }

    return (
        <>
            <header className="lg:hidden h-14 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-30">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setMobileOpen(true)}
                        aria-label={t("openMenu")}
                        aria-expanded={mobileOpen}
                        aria-controls="main-sidebar-nav"
                        className="p-1.5 -ml-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors cursor-pointer"
                    >
                        <Menu className="w-5 h-5" aria-hidden="true" />
                    </button>

                    <Link href="/dashboard" className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-slate-100 border border-slate-300 flex items-center justify-center p-1">
                            <Image
                                src="/svg/utm-logo.svg"
                                alt="UTM Logo"
                                width={20}
                                height={20}
                                className="h-5 w-5 object-contain"
                                priority
                            />
                        </div>
                        <span className="text-sm font-bold tracking-widest text-slate-900 leading-none">
                            UTM
                        </span>
                    </Link>
                </div>
            </header>

            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/45 backdrop-blur-xs z-40"
                    onClick={() => setMobileOpen(false)}
                    aria-hidden="true"
                />
            )}

            <nav
                id="main-sidebar-nav"
                aria-label={t("mainNavigation")}
                className={`fixed inset-y-0 left-0 z-50 w-60 bg-white text-slate-600 flex flex-col shrink-0 border-r border-slate-200 h-full overflow-hidden transition-transform duration-200 lg:static lg:translate-x-0 lg:z-40 ${
                    mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
                }`}
            >
                <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 shrink-0">
                    <Link
                        href="/dashboard"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center space-x-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-300 flex items-center justify-center p-1 shadow-2xs">
                            <Image
                                src="/svg/utm-logo.svg"
                                alt="UTM Logo"
                                width={24}
                                height={24}
                                className="h-6 w-6 object-contain"
                                priority
                            />
                        </div>
                        <div>
                            <span className="block text-sm font-bold tracking-widest text-slate-900 leading-none">
                                UTM
                            </span>
                        </div>
                    </Link>

                    <button
                        type="button"
                        onClick={() => setMobileOpen(false)}
                        aria-label={t("closeMenu")}
                        className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto utm-scroll px-3 py-3 space-y-4 text-xs font-medium">
                    {visibleSections.map((section) => (
                        <div key={section.sectionKey} className="space-y-0.5">
                            <div className="px-3 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 select-none">
                                {t(`sections.${section.sectionKey}`)}
                            </div>
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                const isActive =
                                    item.href === "/dashboard"
                                        ? pathname === "/dashboard"
                                        : pathname.startsWith(item.href);
                                const badgeCount =
                                    item.id === "conflicts"
                                        ? conflictsCount
                                        : item.id === "emergency"
                                          ? emergencyCount
                                          : 0;

                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        onClick={() => setMobileOpen(false)}
                                        aria-current={isActive ? "page" : undefined}
                                        className={`group flex items-center justify-between gap-2 w-full px-3 py-1.5 rounded-md transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                                            isActive
                                                ? "text-white bg-slate-700 shadow-2xs font-semibold"
                                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                        }`}
                                    >
                                        <span className="flex items-center min-w-0">
                                            <Icon
                                                className={`h-4 w-4 mr-2.5 shrink-0 ${
                                                    isActive
                                                        ? "text-white"
                                                        : "text-slate-400 group-hover:text-slate-600"
                                                }`}
                                                aria-hidden="true"
                                            />
                                            <span className="truncate">
                                                {t(`items.${item.id}`)}
                                            </span>
                                        </span>

                                        {badgeCount > 0 && (
                                            <span
                                                className={`px-2 py-0.5 rounded-[5px] font-mono text-[11px] font-bold tabular-nums leading-tight shrink-0 transition-colors ${
                                                    isActive
                                                        ? "bg-slate-900/75 text-white"
                                                        : "bg-slate-200/85 text-slate-700 group-hover:bg-slate-200 group-hover:text-slate-900"
                                                }`}
                                            >
                                                {formatNavCount(badgeCount)}
                                            </span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </div>

                <div className="shrink-0">
                    <AuthenticationInfo />
                </div>
            </nav>
        </>
    );
}
