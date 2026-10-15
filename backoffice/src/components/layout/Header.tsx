"use client";

import { Building2, Navigation, Radio, Bell, ChevronDown } from "lucide-react";

interface HeaderProps {
  activeViewTitle?: string;
  userInitials?: string;
}

export function Header({
  activeViewTitle = "Live Operations",
  userInitials = "CU",
}: HeaderProps) {
  return (
    <header className="h-16 px-6 flex items-center justify-between bg-white border-b border-slate-200 shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          {activeViewTitle}
        </h1>
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="inline-flex items-center px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-600 font-medium">
            <Building2 className="h-3.5 w-3.5 mr-1 text-slate-500" />
            5 HUBS
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded border border-slate-300 bg-slate-100 text-slate-900 font-semibold">
            <Navigation className="h-3.5 w-3.5 mr-1 text-slate-700 rotate-45" />
            4 ACTIVE
          </span>
          <span className="inline-flex items-center px-2.5 py-1 rounded border border-slate-200 bg-slate-50 text-slate-600 font-medium">
            <Radio className="h-3.5 w-3.5 mr-1 text-slate-500" />
            26 ADS-B
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-5">
        <div className="flex items-center text-xs font-semibold text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse" />
          System Online
        </div>

        <div className="relative cursor-pointer">
          <button
            type="button"
            aria-label="Notifications"
            className="p-1 rounded text-slate-600 hover:bg-slate-100 flex items-center"
          >
            <Bell className="h-4 w-4" />
          </button>
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
            2
          </span>
        </div>

        <div className="flex items-center space-x-1.5 cursor-pointer pl-1">
          <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-mono text-[11px] font-bold flex items-center justify-center shadow-xs">
            {userInitials}
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
        </div>
      </div>
    </header>
  );
}

export default Header;
