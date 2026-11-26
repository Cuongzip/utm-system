"use client";

import { useEffect, useState } from "react";
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
    Sparkles,
} from "lucide-react";

import { usePermissions, type Permissions } from "@/hooks";
import { toggleCopilot } from "@/components/copilot";
import { AuthenticationInfo } from "./AuthenticationInfo";

type SidebarTabId =
    | "dashboard"
    | "control-center"
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

interface NavItem {
    id: SidebarTabId;
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    isVisible?: (permissions: Permissions) => boolean;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
    {
        title: "Operations",
        items: [
            { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
            {
                id: "control-center",
                label: "Control Center",
                href: "/dashboard/control-center",
                icon: Sliders,
            },
            {
                id: "connectivity",
                label: "Connectivity",
                href: "/dashboard/connectivity",
                icon: Radio,
            },
            {
                id: "simulation",
                label: "Simulation",
                href: "/dashboard/simulation",
                icon: PlayCircle,
            },
        ],
    },
    {
        title: "Planning & Assets",
        items: [
            { id: "missions", label: "Missions", href: "/dashboard/missions", icon: Compass },
            { id: "flights", label: "Flights", href: "/dashboard/flights", icon: PlaneTakeoff },
            {
                id: "fleet",
                label: "Fleet",
                href: "/dashboard/fleet",
                icon: Layers,
                isVisible: (p) => p.canManageFleet,
            },
            { id: "drones", label: "Drones", href: "/dashboard/drones", icon: Bot },
            { id: "hubs", label: "Hubs", href: "/dashboard/hubs", icon: Building2 },
            {
                id: "organizations",
                label: "Organizations",
                href: "/dashboard/organizations",
                icon: Landmark,
            },
        ],
    },
    {
        title: "Safety & Weather",
        items: [
            { id: "airspace", label: "Airspace", href: "/dashboard/airspace", icon: Shield },
            { id: "weather", label: "Weather & AIS", href: "/dashboard/weather", icon: CloudSun },
            {
                id: "conflicts",
                label: "Conflicts",
                href: "/dashboard/conflicts",
                icon: AlertOctagon,
            },
            { id: "emergency", label: "Emergency", href: "/dashboard/emergency", icon: Siren },
        ],
    },
    {
        title: "Platform",
        items: [
            {
                id: "developer",
                label: "Developer",
                href: "/dashboard/developer",
                icon: Code2,
                isVisible: (p) => p.canManageApiKeys,
            },
            { id: "settings", label: "Settings", href: "/dashboard/settings", icon: Settings },
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname() || "";
    const permissions = usePermissions();
    const [mobileOpen, setMobileOpen] = useState(false);

    const visibleSections = NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) =>
            item.isVisible ? item.isVisible(permissions) : true
        ),
    })).filter((section) => section.items.length > 0);

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

    return (
        <>
            <header className="lg:hidden h-14 px-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 z-30">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => setMobileOpen(true)}
                        aria-label="Open navigation menu"
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

                <button
                    type="button"
                    onClick={toggleCopilot}
                    aria-label="Toggle Operations Copilot"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-[11px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                    <Sparkles className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                    <span>Copilot</span>
                </button>
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
                aria-label="Main navigation"
                className={`fixed inset-y-0 left-0 z-50 w-60 bg-white text-slate-600 flex flex-col justify-between shrink-0 border-r border-slate-200 h-full overflow-y-auto transition-transform duration-200 lg:static lg:translate-x-0 lg:z-40 ${
                    mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
                }`}
            >
                <div className="flex flex-col">
                    <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200">
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
                            aria-label="Close navigation menu"
                            className="lg:hidden p-1.5 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                    </div>

                    <div className="px-3 py-3 space-y-4 text-xs font-medium">
                        {visibleSections.map((section) => (
                            <div key={section.title} className="space-y-0.5">
                                <div className="px-3 pb-1 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 select-none">
                                    {section.title}
                                </div>
                                {section.items.map((item) => {
                                    const Icon = item.icon;
                                    const isActive =
                                        item.href === "/dashboard"
                                            ? pathname === "/dashboard"
                                            : pathname.startsWith(item.href);

                                    return (
                                        <Link
                                            key={item.id}
                                            href={item.href}
                                            onClick={() => setMobileOpen(false)}
                                            aria-current={isActive ? "page" : undefined}
                                            className={`flex items-center w-full px-3 py-1.5 rounded-md transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                                                isActive
                                                    ? "text-white bg-slate-700 shadow-2xs font-semibold"
                                                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                            }`}
                                        >
                                            <Icon
                                                className={`h-4 w-4 mr-2.5 shrink-0 ${
                                                    isActive ? "text-white" : "text-slate-400"
                                                }`}
                                                aria-hidden="true"
                                            />
                                            <span>{item.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="shrink-0 flex flex-col">
                    <div className="px-3 py-2 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => {
                                setMobileOpen(false);
                                toggleCopilot();
                            }}
                            aria-label="Open Operations Copilot"
                            className="flex items-center justify-between w-full px-3 py-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                        >
                            <span className="inline-flex items-center gap-2 text-xs font-semibold">
                                <Sparkles
                                    className="w-3.5 h-3.5 text-slate-600 shrink-0"
                                    aria-hidden="true"
                                />
                                <span>Operations Copilot</span>
                            </span>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                                AI
                            </span>
                        </button>
                    </div>
                    <AuthenticationInfo />
                </div>
            </nav>
        </>
    );
}
