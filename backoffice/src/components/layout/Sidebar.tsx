"use client";

import Image from "next/image";
import {
  LayoutDashboard,
  Sliders,
  AlertTriangle,
  Layers,
  Radio,
  Compass,
  PlaneTakeoff,
  Bot,
  Building2,
  Shield,
  AlertOctagon,
  CloudSun,
  Code2,
  Settings,
  Moon,
} from "lucide-react";

export type SidebarTabId =
  | "dashboard"
  | "control-center"
  | "emergency"
  | "fleet"
  | "connectivity"
  | "missions"
  | "flights"
  | "drones"
  | "hubs"
  | "airspace"
  | "conflicts"
  | "weather"
  | "developer"
  | "settings";

interface SidebarProps {
  activeTab: SidebarTabId;
  onTabChange: (tabId: SidebarTabId) => void;
  isDarkMode?: boolean;
  onToggleDarkMode?: () => void;
}

interface NavItem {
  id: SidebarTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "control-center", label: "Control Center", icon: Sliders },
  { id: "emergency", label: "Emergency", icon: AlertTriangle },
  { id: "fleet", label: "Fleet", icon: Layers },
  { id: "connectivity", label: "Connectivity", icon: Radio },
  { id: "missions", label: "Missions", icon: Compass },
  { id: "flights", label: "Flights", icon: PlaneTakeoff },
  { id: "drones", label: "Drones", icon: Bot },
  { id: "hubs", label: "Hubs", icon: Building2 },
  { id: "airspace", label: "Airspace", icon: Shield },
  { id: "conflicts", label: "Conflicts", icon: AlertOctagon },
  { id: "weather", label: "Weather", icon: CloudSun },
  { id: "developer", label: "Developer", icon: Code2 },
  { id: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  activeTab,
  onTabChange,
  isDarkMode = false,
  onToggleDarkMode,
}: SidebarProps) {
  return (
    <nav className="w-60 bg-white text-slate-600 flex flex-col justify-between shrink-0 z-40 border-r border-slate-200 min-h-full">
      <div className="flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-slate-200">
          <div className="flex items-center space-x-3">
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
                DROPS
              </span>
              <span className="block text-[9px] tracking-wider text-slate-500 font-semibold uppercase mt-0.5 font-mono">
                UTM SYSTEM
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-1 px-3 py-4 text-xs font-medium">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`flex items-center w-full px-3 py-2 rounded-md transition-colors text-left cursor-pointer ${
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
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 border-t border-slate-200">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center text-xs font-medium text-slate-700">
            <Moon className="h-4 w-4 mr-2 text-slate-500" />
            <span>Dark Mode</span>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={isDarkMode}
              onChange={onToggleDarkMode}
              className="sr-only peer"
            />
            <div className="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-slate-600" />
          </div>
        </label>
      </div>
    </nav>
  );
}

export default Sidebar;
