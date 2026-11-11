"use client";

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
    Shield,
    AlertOctagon,
    PlayCircle,
    Siren,
    Settings,
} from "lucide-react";

import { AuthenticationInfo } from "./AuthenticationInfo";

export type SidebarTabId =
    | "dashboard"
    | "control-center"
    | "connectivity"
    | "missions"
    | "flights"
    | "drones"
    | "hubs"
    | "airspace"
    | "conflicts"
    | "simulation"
    | "emergency"
    | "settings";

interface NavItem {
    id: SidebarTabId;
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
    { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    {
        id: "control-center",
        label: "Control Center",
        href: "/dashboard/control-center",
        icon: Sliders,
    },
    { id: "connectivity", label: "Connectivity", href: "/dashboard/connectivity", icon: Radio },
    { id: "missions", label: "Missions", href: "/dashboard/missions", icon: Compass },
    { id: "flights", label: "Flights", href: "/dashboard/flights", icon: PlaneTakeoff },
    { id: "drones", label: "Drones", href: "/dashboard/drones", icon: Bot },
    { id: "hubs", label: "Hubs", href: "/dashboard/hubs", icon: Building2 },
    { id: "airspace", label: "Airspace", href: "/dashboard/airspace", icon: Shield },
    { id: "conflicts", label: "Conflicts", href: "/dashboard/conflicts", icon: AlertOctagon },
    { id: "simulation", label: "Simulation", href: "/dashboard/simulation", icon: PlayCircle },
    { id: "emergency", label: "Emergency", href: "/dashboard/emergency", icon: Siren },
    { id: "settings", label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname() || "";

    return (
        <nav className="w-60 bg-white text-slate-600 flex flex-col justify-between shrink-0 z-40 border-r border-slate-200 h-full overflow-y-auto">
            <div className="flex flex-col">
                <div className="h-16 flex items-center px-5 border-b border-slate-200">
                    <Link href="/dashboard" className="flex items-center space-x-3">
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
                </div>

                <div className="space-y-1 px-3 py-4 text-xs font-medium">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive =
                            item.href === "/dashboard"
                                ? pathname === "/dashboard"
                                : pathname.startsWith(item.href);

                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                className={`flex items-center w-full px-3 py-2 rounded-md transition-colors text-left ${
                                    isActive
                                        ? "text-white bg-slate-600 shadow-sm font-semibold"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                }`}
                            >
                                <Icon
                                    className={`h-4 w-4 mr-3 shrink-0 ${
                                        isActive ? "text-white" : "text-slate-400"
                                    }`}
                                />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </div>

            <AuthenticationInfo />
        </nav>
    );
}
