"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Play, Loader2, Terminal } from "lucide-react";
import { toast } from "sonner";
import {
    ChamferCard,
    ChamferButton,
    CustomSelect,
    FormInput,
    StatusBadge,
    EmptyState,
} from "@/components/ui";
import { API_ENDPOINTS } from "@/constants/apiEndpoints";
import { useDronesAll } from "@/hooks";

type EndpointKey = "status" | "telemetry" | "register";

interface TestResponse {
    status: number;
    latencyMs: number;
    body: string;
}

export function ApiTesterTab() {
    const t = useTranslations("developer.tester");
    const { data: drones = [] } = useDronesAll();
    const defaultDroneReg = drones[0]?.registrationNumber || "VN-DRONE-001";

    const endpointPresets = useMemo<
        Record<
            EndpointKey,
            { label: string; method: "GET" | "POST"; url: string; defaultBody: string }
        >
    >(
        () => ({
            status: {
                label: "GET /api/v1/integration/status",
                method: "GET",
                url: API_ENDPOINTS.INTEGRATION.STATUS,
                defaultBody: "",
            },
            telemetry: {
                label: "POST /api/v1/integration/telemetry",
                method: "POST",
                url: API_ENDPOINTS.INTEGRATION.TELEMETRY,
                defaultBody: JSON.stringify(
                    {
                        droneId: defaultDroneReg,
                        latitude: 10.7769,
                        longitude: 106.7009,
                        altitude: 65,
                        heading: 120,
                        speed: 12.5,
                        batteryLevel: 85,
                    },
                    null,
                    2
                ),
            },
            register: {
                label: "POST /api/v1/integration/register",
                method: "POST",
                url: API_ENDPOINTS.INTEGRATION.REGISTER,
                defaultBody: JSON.stringify(
                    {
                        registrationNumber: "OEM-TEST-001",
                        manufacturer: "DJI Enterprise",
                        model: "Matrice 350 RTK",
                        serialNumber: "SN-M350-001",
                        maxPayload: 2.7,
                        maxFlightTime: 55,
                    },
                    null,
                    2
                ),
            },
        }),
        [defaultDroneReg]
    );

    const [endpointKey, setEndpointKey] = useState<EndpointKey>("status");
    const [apiKey, setApiKey] = useState("");
    const [bodyText, setBodyText] = useState("");
    const [sending, setSending] = useState(false);
    const [response, setResponse] = useState<TestResponse | null>(null);

    const preset = endpointPresets[endpointKey];

    const handleEndpointChange = (val: string) => {
        const key = val as EndpointKey;
        setEndpointKey(key);
        setBodyText(endpointPresets[key].defaultBody);
        setResponse(null);
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiKey.trim()) {
            toast.error(t("missingKeyToast"));
            return;
        }
        if (preset.method === "POST") {
            if (!bodyText.trim()) {
                toast.error(t("missingBodyToast"));
                return;
            }
            try {
                JSON.parse(bodyText);
            } catch {
                toast.error(t("invalidJsonToast"));
                return;
            }
        }

        setSending(true);
        const start = performance.now();
        try {
            const res = await fetch(preset.url, {
                method: preset.method,
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": apiKey.trim(),
                },
                ...(preset.method === "POST" ? { body: bodyText } : {}),
            });
            const latencyMs = Math.round(performance.now() - start);
            const rawText = await res.text();
            let pretty = rawText;
            try {
                pretty = JSON.stringify(JSON.parse(rawText), null, 2);
            } catch {
                // keep raw text
            }
            setResponse({
                status: res.status,
                latencyMs,
                body: pretty || t("emptyResponse"),
            });
        } catch (err: unknown) {
            const latencyMs = Math.round(performance.now() - start);
            const message = err instanceof Error ? err.message : t("networkError");
            toast.error(message);
            setResponse({
                status: 0,
                latencyMs,
                body: JSON.stringify({ error: message }, null, 2),
            });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <ChamferCard size="md">
                <div className="px-4 py-3 border-b border-slate-200">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                        {t("requestBuilder")}
                    </span>
                </div>
                <form onSubmit={handleSend} className="p-4 flex flex-col gap-3.5">
                    <div className="form-group">
                        <label className="form-label" htmlFor="tester-endpoint">
                            {t("endpointLabel")}
                        </label>
                        <CustomSelect
                            id="tester-endpoint"
                            value={endpointKey}
                            onValueChange={handleEndpointChange}
                            options={Object.entries(endpointPresets).map(([k, v]) => ({
                                value: k,
                                label: v.label,
                            }))}
                        />
                    </div>

                    <FormInput
                        id="tester-api-key"
                        label={t("apiKeyHeaderLabel")}
                        required
                        type="password"
                        autoComplete="off"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={t("apiKeyPlaceholder")}
                        className="font-mono"
                    />

                    {preset.method === "POST" && (
                        <div className="form-group">
                            <label className="form-label" htmlFor="tester-body">
                                {t("jsonPayloadLabel")}
                            </label>
                            <textarea
                                id="tester-body"
                                rows={10}
                                value={bodyText}
                                onChange={(e) => setBodyText(e.target.value)}
                                className="form-input font-mono text-xs leading-relaxed"
                            />
                        </div>
                    )}

                    <div className="flex justify-end pt-1">
                        <ChamferButton variant="dark" size="sm" type="submit" disabled={sending}>
                            {sending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Play className="w-3.5 h-3.5" />
                            )}
                            <span>{sending ? t("sending") : t("sendRequest")}</span>
                        </ChamferButton>
                    </div>
                </form>
            </ChamferCard>

            <ChamferCard size="md">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                        {t("liveResponse")}
                    </span>
                    {response && (
                        <div className="flex items-center gap-3">
                            <StatusBadge
                                status={
                                    response.status >= 200 && response.status < 300
                                        ? "ok"
                                        : response.status >= 400 || response.status === 0
                                          ? "error"
                                          : "warning"
                                }
                                label={
                                    response.status === 0
                                        ? t("netErrorBadge")
                                        : `HTTP ${response.status}`
                                }
                            />
                            <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                                {response.latencyMs} ms
                            </span>
                        </div>
                    )}
                </div>
                <div className="p-4">
                    {response ? (
                        <pre className="rounded-md bg-slate-900 text-slate-100 p-4 text-xs font-mono overflow-auto max-h-[380px] whitespace-pre-wrap break-words">
                            {response.body}
                        </pre>
                    ) : (
                        <EmptyState
                            compact
                            icon={Terminal}
                            title={t("readyTitle")}
                            description={t("readyDesc")}
                        />
                    )}
                </div>
            </ChamferCard>
        </div>
    );
}
