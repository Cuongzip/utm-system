"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { User, LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks";
import { getPrimaryDisplayRole } from "@/utils";
import { translateRoleLabel, type AppLocale } from "@/i18n";

export function AuthenticationInfo() {
    const t = useTranslations("common");
    const locale = useLocale() as AppLocale;
    const { data: user } = useCurrentUser();
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = () => {
        if (isLoggingOut) return;
        setIsLoggingOut(true);
        toast.success(t("loggedOutRedirect"));
        setTimeout(() => {
            window.location.href = "/logout";
        }, 600);
    };

    if (!user || !user.username || user.username === "anonymous") {
        return null;
    }

    const primaryRole = translateRoleLabel(getPrimaryDisplayRole(user.roles), locale);

    return (
        <div className="px-3.5 py-3 border-t border-slate-200 bg-slate-50/70 text-xs">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center shrink-0 text-slate-600">
                        <User className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 truncate">
                        <div className="font-semibold text-slate-800 truncate leading-tight">
                            {user.fullName || user.username}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            <span className="truncate">{primaryRole}</span>
                        </div>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    title={t("signOut")}
                    aria-label={t("signOut")}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                >
                    {isLoggingOut ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
                    ) : (
                        <LogOut className="w-3.5 h-3.5" />
                    )}
                </button>
            </div>
        </div>
    );
}
