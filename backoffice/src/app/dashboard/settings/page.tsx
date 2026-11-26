"use client";

import { useSyncExternalStore } from "react";
import { Globe, Map as MapIcon, ExternalLink, LogOut } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, ChamferCard, ChamferButton, StatusBadge } from "@/components/ui";
import { useCurrentUser, usePermissions } from "@/hooks";
import { getPrimaryDisplayRole } from "@/utils";
import type { ImageryType } from "@/components/map/types";

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
    if (typeof window === "undefined") return "satellite";
    try {
        const val = localStorage.getItem("utm_map_layer");
        if (val === "satellite" || val === "street" || val === "carto") return val;
    } catch {
        // ignore
    }
    return "satellite";
}

export default function SettingsPage() {
    const { data: user } = useCurrentUser();
    const permissions = usePermissions();

    const mapMode = useSyncExternalStore(subscribeMapMode, getMapMode, () => "2d");
    const mapLayer = useSyncExternalStore(subscribeMapLayer, getMapLayer, () => "satellite");
    const swaggerUrl = useSyncExternalStore(
        subscribeNoop,
        getSwaggerUiUrl,
        () => "http://localhost:8081/swagger-ui/"
    );

    const primaryRole = getPrimaryDisplayRole(user?.roles);

    const setMapMode = (mode: "globe" | "2d") => {
        try {
            localStorage.setItem("utm_map_mode", mode);
            window.dispatchEvent(new Event("utm_map_mode_change"));
            toast.success(`Default map view set to ${mode === "globe" ? "3D Globe" : "2D Flat"}.`);
        } catch {
            // ignore
        }
    };

    const setMapLayer = (layer: ImageryType) => {
        try {
            localStorage.setItem("utm_map_layer", layer);
            window.dispatchEvent(new Event("utm_map_layer_change"));
            toast.success(`Default basemap set to ${layer}.`);
        } catch {
            // ignore
        }
    };

    const permissionMatrix = [
        { label: "Manage Organizations", allowed: permissions.canManageOrganizations },
        { label: "Create / Deactivate Hubs", allowed: permissions.canCreateHub },
        { label: "Edit Hub Profiles", allowed: permissions.canEditHub },
        { label: "Create / Edit Drones", allowed: permissions.canCreateDrone },
        { label: "Decommission Drones", allowed: permissions.canDeleteDrone },
        { label: "Manage Fleet & Rebalancing", allowed: permissions.canManageFleet },
        { label: "Create Airspace Zones", allowed: permissions.canCreateAirspaceZone },
        { label: "Delete Airspace Zones", allowed: permissions.canDeleteAirspaceZone },
        { label: "Authorize / Reject Flights", allowed: permissions.canAuthorizeFlight },
        { label: "Resolve Airspace Conflicts", allowed: permissions.canResolveConflict },
        { label: "Manage Emergency Protocols", allowed: permissions.canManageEmergencyProtocols },
        { label: "Manage OEM API Keys", allowed: permissions.canManageApiKeys },
    ];

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
            <PageHeader title="SETTINGS" />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <ChamferCard size="md">
                    <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                            Operator Profile
                        </span>
                        <StatusBadge status="online" label={primaryRole} />
                    </div>

                    <div className="p-5 flex flex-col gap-4">
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs">
                            <div>
                                <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                                    Full Name
                                </dt>
                                <dd className="text-sm font-semibold text-slate-900 mt-0.5">
                                    {user?.fullName || "—"}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                                    Username
                                </dt>
                                <dd className="text-sm font-mono font-semibold text-slate-900 mt-0.5">
                                    {user?.username || "—"}
                                </dd>
                            </div>
                            <div className="sm:col-span-2 pt-3 border-t border-slate-100">
                                <dt className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                                    Email
                                </dt>
                                <dd className="font-mono text-slate-800 mt-0.5">
                                    {user?.email || "—"}
                                </dd>
                            </div>
                        </dl>

                        <div className="flex items-center justify-end pt-3 border-t border-slate-200">
                            <ChamferButton href="/logout" nativeAnchor variant="outline" size="xs">
                                <LogOut className="w-3.5 h-3.5 text-red-600" />
                                <span>Sign Out</span>
                            </ChamferButton>
                        </div>
                    </div>
                </ChamferCard>

                <ChamferCard size="md">
                    <div className="px-5 py-3.5 border-b border-slate-200">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                            Map Preferences
                        </span>
                    </div>

                    <div className="p-5 flex flex-col gap-5">
                        <div className="flex flex-col gap-2">
                            <div className="text-xs font-semibold text-slate-800">
                                Default Projection
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <button
                                    type="button"
                                    aria-pressed={mapMode === "2d"}
                                    onClick={() => setMapMode("2d")}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded border text-xs font-mono font-bold transition-colors cursor-pointer ${
                                        mapMode === "2d"
                                            ? "bg-slate-800 text-white border-slate-800"
                                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <MapIcon className="w-4 h-4" />
                                    <span>2D Flat</span>
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={mapMode === "globe"}
                                    onClick={() => setMapMode("globe")}
                                    className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded border text-xs font-mono font-bold transition-colors cursor-pointer ${
                                        mapMode === "globe"
                                            ? "bg-slate-800 text-white border-slate-800"
                                            : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                                    }`}
                                >
                                    <Globe className="w-4 h-4" />
                                    <span>3D Globe</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 pt-4 border-t border-slate-200">
                            <div className="text-xs font-semibold text-slate-800">
                                Default Basemap
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {(
                                    [
                                        { id: "satellite", label: "Satellite" },
                                        { id: "street", label: "Street" },
                                        { id: "carto", label: "Carto Voyager" },
                                    ] as const
                                ).map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        aria-pressed={mapLayer === opt.id}
                                        onClick={() => setMapLayer(opt.id)}
                                        className={`px-3 py-2 rounded border text-xs font-mono font-bold transition-colors cursor-pointer ${
                                            mapLayer === opt.id
                                                ? "bg-slate-800 text-white border-slate-800"
                                                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </ChamferCard>

                <ChamferCard size="md" className="xl:col-span-2">
                    <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                            RBAC Clearance Matrix
                        </span>
                        <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                            {permissionMatrix.filter((p) => p.allowed).length}/
                            {permissionMatrix.length} granted
                        </span>
                    </div>

                    <div className="px-5 py-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8">
                        {permissionMatrix.map((item) => (
                            <div
                                key={item.label}
                                className="py-2.5 border-b border-slate-100 flex items-center justify-between gap-2"
                            >
                                <span className="text-xs text-slate-700">{item.label}</span>
                                <span
                                    className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                        item.allowed ? "text-emerald-700" : "text-slate-400"
                                    }`}
                                >
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                            item.allowed ? "bg-emerald-500" : "bg-slate-300"
                                        }`}
                                    />
                                    {item.allowed ? "GRANTED" : "DENIED"}
                                </span>
                            </div>
                        ))}
                    </div>
                </ChamferCard>

                <ChamferCard size="sm" className="xl:col-span-2">
                    <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                            Platform Tools
                        </span>
                        <div className="flex flex-wrap items-center gap-2">
                            {permissions.canManageApiKeys && (
                                <ChamferButton
                                    href="/dashboard/developer"
                                    variant="outline"
                                    size="xs"
                                >
                                    <span>Developer Portal</span>
                                </ChamferButton>
                            )}
                            <ChamferButton href={swaggerUrl} external variant="dark" size="xs">
                                <span>Swagger UI</span>
                                <ExternalLink className="w-3 h-3" />
                            </ChamferButton>
                        </div>
                    </div>
                </ChamferCard>
            </div>
        </div>
    );
}
