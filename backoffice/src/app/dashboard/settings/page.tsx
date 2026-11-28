"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Globe, Map as MapIcon, ExternalLink, LogOut } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, ChamferCard, ChamferButton, StatusBadge } from "@/components/ui";
import { BASEMAP_OPTIONS, VALID_IMAGERY_TYPES, type ImageryType } from "@/components/map";
import { useCurrentUser, usePermissions } from "@/hooks";
import { getPrimaryDisplayRole } from "@/utils";
import { setCurrentLocale, translateRoleLabel, useAppLocale, type AppLocale } from "@/i18n";

function subscribeNoop() {
    return () => {};
}

function getSwaggerUiUrl(): string {
    if (typeof window === "undefined") return "http://localhost:8081/swagger-ui/";
    return `${window.location.protocol}//${window.location.hostname}:8081/swagger-ui/`;
}

function subscribeMapMode(cb: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("storage", cb);
    window.addEventListener("utm_map_mode_change", cb);
    return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener("utm_map_mode_change", cb);
    };
}

function getMapMode(): "globe" | "2d" {
    if (typeof window === "undefined") return "2d";
    try {
        const val = localStorage.getItem("utm_map_mode");
        if (val === "2d" || val === "globe") return val;
    } catch {
        // ignore
    }
    return "2d";
}

function subscribeMapLayer(cb: () => void) {
    if (typeof window === "undefined") return () => {};
    window.addEventListener("storage", cb);
    window.addEventListener("utm_map_layer_change", cb);
    return () => {
        window.removeEventListener("storage", cb);
        window.removeEventListener("utm_map_layer_change", cb);
    };
}

function getMapLayer(): ImageryType {
    if (typeof window === "undefined") return "satellite-hybrid";
    try {
        const val = localStorage.getItem("utm_map_layer");
        if (val && (VALID_IMAGERY_TYPES as readonly string[]).includes(val)) {
            return val as ImageryType;
        }
    } catch {
        // ignore
    }
    return "satellite-hybrid";
}

export default function SettingsPage() {
    const t = useTranslations("settings");
    const tMap = useTranslations("map");
    const locale = useAppLocale();
    const { data: user } = useCurrentUser();
    const permissions = usePermissions();

    const mapMode = useSyncExternalStore(subscribeMapMode, getMapMode, () => "2d");
    const mapLayer = useSyncExternalStore(subscribeMapLayer, getMapLayer, () => "satellite-hybrid");
    const swaggerUrl = useSyncExternalStore(
        subscribeNoop,
        getSwaggerUiUrl,
        () => "http://localhost:8081/swagger-ui/"
    );

    const rawPrimaryRole = getPrimaryDisplayRole(user?.roles);
    const displayRole = translateRoleLabel(rawPrimaryRole, locale);

    const handleLanguageChange = (nextLocale: AppLocale) => {
        if (nextLocale === locale) return;
        setCurrentLocale(nextLocale);
        toast.success(nextLocale === "vi" ? t("languageSavedVi") : t("languageSavedEn"));
    };

    const setMapMode = (mode: "globe" | "2d") => {
        try {
            localStorage.setItem("utm_map_mode", mode);
            window.dispatchEvent(new Event("utm_map_mode_change"));
            toast.success(
                t("mapModeToast", { mode: mode === "globe" ? t("globe3d") : t("flat2d") })
            );
        } catch {
            // ignore
        }
    };

    const getBasemapLabel = (id: ImageryType) => tMap(`basemaps.${id}`);

    const setMapLayer = (layer: ImageryType) => {
        try {
            localStorage.setItem("utm_map_layer", layer);
            window.dispatchEvent(new Event("utm_map_layer_change"));
            const label = getBasemapLabel(layer);
            toast.success(t("basemapToast", { label }));
        } catch {
            // ignore
        }
    };

    const permissionMatrix = [
        {
            label: t("permissions.manageOrganizations"),
            allowed: permissions.canManageOrganizations,
        },
        { label: t("permissions.createDeactivateHubs"), allowed: permissions.canCreateHub },
        { label: t("permissions.editHubProfiles"), allowed: permissions.canEditHub },
        { label: t("permissions.createEditDrones"), allowed: permissions.canCreateDrone },
        { label: t("permissions.decommissionDrones"), allowed: permissions.canDeleteDrone },
        { label: t("permissions.manageFleet"), allowed: permissions.canManageFleet },
        { label: t("permissions.createAirspaceZones"), allowed: permissions.canCreateAirspaceZone },
        { label: t("permissions.deleteAirspaceZones"), allowed: permissions.canDeleteAirspaceZone },
        { label: t("permissions.authorizeFlights"), allowed: permissions.canAuthorizeFlight },
        { label: t("permissions.resolveConflicts"), allowed: permissions.canResolveConflict },
        {
            label: t("permissions.manageEmergency"),
            allowed: permissions.canManageEmergencyProtocols,
        },
        { label: t("permissions.manageApiKeys"), allowed: permissions.canManageApiKeys },
    ];

    const grantedCount = permissionMatrix.filter((p) => p.allowed).length;

    return (
        <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6 shrink-0">
            <PageHeader title={t("title")} />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
                <ChamferCard size="md" className="h-full" innerClassName="h-full">
                    <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                            {t("operatorProfile")}
                        </span>
                        <StatusBadge status="online" label={displayRole} />
                    </div>

                    <div className="p-5 flex flex-col gap-4 flex-1">
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs">
                            <div>
                                <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                                    {t("fullName")}
                                </dt>
                                <dd className="text-sm font-semibold text-slate-900 mt-0.5">
                                    {user?.fullName || "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                                    {t("username")}
                                </dt>
                                <dd className="text-sm font-mono font-semibold text-slate-900 mt-0.5">
                                    {user?.username || "—"}
                                </dd>
                            </div>
                            <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                                <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                                    {t("email")}
                                </dt>
                                <dd className="font-mono text-slate-800 mt-0.5">
                                    {user?.email || "—"}
                                </dd>
                            </div>
                        </dl>

                        <div className="flex items-center justify-end pt-3 mt-auto border-t border-slate-200">
                            <ChamferButton href="/logout" nativeAnchor variant="outline" size="xs">
                                <LogOut className="w-3.5 h-3.5 text-red-600" aria-hidden="true" />
                                <span>{t("signOut")}</span>
                            </ChamferButton>
                        </div>
                    </div>
                </ChamferCard>

                <ChamferCard size="md" className="h-full" innerClassName="h-full">
                    <div className="px-5 py-3.5 border-b border-slate-200">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                            {t("preferencesTitle")}
                        </span>
                    </div>

                    <div className="p-5 flex flex-col gap-5 flex-1">
                        <div className="flex flex-col gap-2">
                            <div className="text-xs font-semibold text-slate-800">
                                {t("displayLanguage")}
                            </div>
                            <div
                                className="grid grid-cols-2 gap-2.5"
                                role="group"
                                aria-label={t("displayLanguage")}
                            >
                                <button
                                    type="button"
                                    aria-pressed={locale === "en"}
                                    onClick={() => handleLanguageChange("en")}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded border text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                                        locale === "en"
                                            ? "bg-slate-800 text-white border-slate-800"
                                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold leading-none ${
                                            locale === "en"
                                                ? "bg-white/15 text-white"
                                                : "bg-slate-100 text-slate-700"
                                        }`}
                                    >
                                        EN
                                    </span>
                                    <span>{t("langEn")}</span>
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={locale === "vi"}
                                    onClick={() => handleLanguageChange("vi")}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded border text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                                        locale === "vi"
                                            ? "bg-slate-800 text-white border-slate-800"
                                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <span
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold leading-none ${
                                            locale === "vi"
                                                ? "bg-white/15 text-white"
                                                : "bg-slate-100 text-slate-700"
                                        }`}
                                    >
                                        VI
                                    </span>
                                    <span>{t("langVi")}</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
                            <div className="text-xs font-semibold text-slate-800">
                                {t("defaultProjection")}
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    aria-pressed={mapMode === "2d"}
                                    onClick={() => setMapMode("2d")}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded border text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                                        mapMode === "2d"
                                            ? "bg-slate-800 text-white border-slate-800"
                                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <MapIcon className="w-4 h-4" aria-hidden="true" />
                                    <span>{t("flat2d")}</span>
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={mapMode === "globe"}
                                    onClick={() => setMapMode("globe")}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded border text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                                        mapMode === "globe"
                                            ? "bg-slate-800 text-white border-slate-800"
                                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <Globe className="w-4 h-4" aria-hidden="true" />
                                    <span>{t("globe3d")}</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
                            <div className="text-xs font-semibold text-slate-800">
                                {t("defaultBasemap")}
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {BASEMAP_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        aria-pressed={mapLayer === opt.id}
                                        onClick={() => setMapLayer(opt.id)}
                                        className={`px-3 py-2 rounded border text-xs font-semibold transition-colors cursor-pointer truncate focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
                                            mapLayer === opt.id
                                                ? "bg-slate-800 text-white border-slate-800"
                                                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        {getBasemapLabel(opt.id)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </ChamferCard>

                <ChamferCard size="md" className="xl:col-span-2">
                    <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                            {t("rbacMatrix")}
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                            {t("grantedCount", {
                                granted: grantedCount,
                                total: permissionMatrix.length,
                            })}
                        </span>
                    </div>

                    <div className="px-5 py-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                        {permissionMatrix.map((item) => (
                            <div
                                key={item.label}
                                className="py-2.5 border-b border-slate-100 flex items-center justify-between gap-2"
                            >
                                <span className="text-xs text-slate-700">{item.label}</span>
                                <StatusBadge
                                    status={item.allowed ? "online" : "offline"}
                                    label={item.allowed ? t("granted") : t("denied")}
                                    className={
                                        item.allowed ? "text-[10px]" : "text-[10px] text-slate-400"
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </ChamferCard>

                <ChamferCard size="sm" className="xl:col-span-2">
                    <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                            {t("platformTools")}
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                            {permissions.canManageApiKeys && (
                                <ChamferButton
                                    href="/dashboard/developer"
                                    variant="outline"
                                    size="xs"
                                >
                                    <span>{t("developerPortal")}</span>
                                </ChamferButton>
                            )}
                            <ChamferButton href={swaggerUrl} external variant="outline" size="xs">
                                <span>{t("swaggerUi")}</span>
                                <ExternalLink className="w-3 h-3" aria-hidden="true" />
                            </ChamferButton>
                        </div>
                    </div>
                </ChamferCard>
            </div>
        </div>
    );
}
