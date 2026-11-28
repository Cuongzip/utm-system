"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check, Download } from "lucide-react";
import { toast } from "sonner";
import { ChamferCard, ChamferButton, Skeleton } from "@/components/ui";
import { useConnectivityCaCertificate, useCopyFeedback } from "@/hooks";
import { downloadTextFile, formatDateTime } from "@/utils";

type SnippetLang = "curl" | "python" | "javascript";

function subscribeNoop() {
    return () => {};
}

function getGatewayBaseUrl(): string {
    if (typeof window === "undefined") return "http://localhost:8081";
    return window.location.origin;
}

function buildSnippets(baseUrl: string): Record<SnippetLang, string> {
    return {
        curl: `# 1. Send OEM telemetry via X-API-Key
curl -X POST ${baseUrl}/api/v1/integration/telemetry \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: <YOUR_API_KEY>" \\
  -d '{
    "droneId": "VN-DRONE-001",
    "latitude": 10.7769,
    "longitude": 106.7009,
    "altitude": 65.0,
    "heading": 120,
    "speed": 12.5,
    "batteryLevel": 84
  }'

# 2. Check manufacturer fleet status
curl ${baseUrl}/api/v1/integration/status \\
  -H "X-API-Key: <YOUR_API_KEY>"`,

        python: `import requests

BASE_URL = "${baseUrl}/api/v1/integration"
HEADERS = {"X-API-Key": "<YOUR_API_KEY>", "Content-Type": "application/json"}

payload = {
    "droneId": "VN-DRONE-001",
    "latitude": 10.7769,
    "longitude": 106.7009,
    "altitude": 65.0,
    "heading": 120,
    "speed": 12.5,
    "batteryLevel": 84,
}

res = requests.post(f"{BASE_URL}/telemetry", json=payload, headers=HEADERS, timeout=5)
res.raise_for_status()
print(res.json())`,

        javascript: `const BASE_URL = "${baseUrl}/api/v1/integration";

const res = await fetch(\`\${BASE_URL}/telemetry\`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "X-API-Key": "<YOUR_API_KEY>",
    },
    body: JSON.stringify({
        droneId: "VN-DRONE-001",
        latitude: 10.7769,
        longitude: 106.7009,
        altitude: 65.0,
        heading: 120,
        speed: 12.5,
        batteryLevel: 84,
    }),
});

console.log(await res.json());`,
    };
}

export function QuickStartTab() {
    const t = useTranslations("developer.docs");
    const [lang, setLang] = useState<SnippetLang>("curl");
    const { copiedKey, copyWithFeedback } = useCopyFeedback<"code" | "ca">();
    const copiedCode = copiedKey === "code";
    const copiedCa = copiedKey === "ca";
    const { data: caCert, isLoading: caLoading } = useConnectivityCaCertificate();

    const endpoints = useMemo(
        () => [
            {
                method: "POST" as const,
                path: "/api/v1/integration/telemetry",
                scope: "telemetry:write",
                summary: t("epTelemetrySummary"),
                fields: "droneId*, latitude*, longitude*, altitude*, flightId?, heading?, speed?, batteryLevel?, armed?",
            },
            {
                method: "POST" as const,
                path: "/api/v1/integration/register",
                scope: "drone:register",
                summary: t("epRegisterSummary"),
                fields: "registrationNumber*, model*, manufacturer?, serialNumber?, ownerId?, homeHubId?, maxPayload?, maxRange?",
            },
            {
                method: "GET" as const,
                path: "/api/v1/integration/status",
                scope: "status:read",
                summary: t("epStatusSummary"),
                fields: t("epStatusFields"),
            },
            {
                method: "GET" as const,
                path: "/api/v1/connectivity/ca-certificate",
                scope: t("epCaScope"),
                summary: t("epCaSummary"),
                fields: t("epCaFields", {
                    shape: "{ caCertificatePem, commonName, expiresAt }",
                }),
            },
        ],
        [t]
    );

    const gatewayBaseUrl = useSyncExternalStore(
        subscribeNoop,
        getGatewayBaseUrl,
        () => "http://localhost:8081"
    );
    const snippets = useMemo(() => buildSnippets(gatewayBaseUrl), [gatewayBaseUrl]);

    const copySnippet = async () => {
        if (await copyWithFeedback("code", snippets[lang])) {
            toast.success(t("snippetCopiedToast"));
        }
    };

    const copyCaPem = async () => {
        if (!caCert?.caCertificatePem) return;
        if (await copyWithFeedback("ca", caCert.caCertificatePem)) {
            toast.success(t("caCopiedToast"));
        }
    };

    const downloadCaPem = () => {
        if (!caCert?.caCertificatePem) return;
        downloadTextFile("utm-root-ca.pem", caCert.caCertificatePem);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                <ChamferCard size="md">
                    <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                            {t("quickStartHeading")}
                        </span>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 rounded-md bg-slate-100 p-0.5 border border-slate-200">
                                {(
                                    [
                                        { id: "curl", label: "cURL" },
                                        { id: "python", label: "Python" },
                                        { id: "javascript", label: "JavaScript" },
                                    ] as const
                                ).map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setLang(item.id)}
                                        className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer ${
                                            lang === item.id
                                                ? "bg-slate-800 text-white"
                                                : "text-slate-600 hover:text-slate-900"
                                        }`}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                            <ChamferButton variant="outline" size="xs" onClick={copySnippet}>
                                {copiedCode ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                    <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedCode ? t("copied") : t("copy")}</span>
                            </ChamferButton>
                        </div>
                    </div>
                    <div className="p-4">
                        <pre className="rounded-md bg-slate-900 text-slate-100 p-4 text-xs font-mono overflow-x-auto leading-relaxed">
                            {snippets[lang]}
                        </pre>
                    </div>
                </ChamferCard>

                <ChamferCard size="md">
                    <div className="px-4 py-3 border-b border-slate-200">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                            {t("endpointsHeading")}
                        </span>
                    </div>
                    <div className="divide-y divide-slate-200">
                        {endpoints.map((ep) => (
                            <div key={ep.path} className="p-4 flex flex-col gap-1.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                                                ep.method === "POST"
                                                    ? "bg-slate-800 text-white"
                                                    : "bg-slate-200 text-slate-800"
                                            }`}
                                        >
                                            {ep.method}
                                        </span>
                                        <code className="text-xs font-mono font-bold text-slate-900">
                                            {ep.path}
                                        </code>
                                    </div>
                                    <span className="font-mono text-[11px] text-slate-500">
                                        {ep.scope}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-600">{ep.summary}</p>
                                <code className="text-[11px] font-mono text-slate-500">
                                    {ep.fields}
                                </code>
                            </div>
                        ))}
                    </div>
                </ChamferCard>
            </div>

            <ChamferCard size="md">
                <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800">
                        {t("rootCaHeading")}
                    </span>
                    {caCert?.caCertificatePem && (
                        <div className="flex items-center gap-2">
                            <ChamferButton variant="outline" size="xs" onClick={copyCaPem}>
                                {copiedCa ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                    <Copy className="w-3 h-3" />
                                )}
                                <span>{copiedCa ? t("copied") : t("copyPem")}</span>
                            </ChamferButton>
                            <ChamferButton variant="dark" size="xs" onClick={downloadCaPem}>
                                <Download className="w-3 h-3" />
                                <span>{t("downloadPem")}</span>
                            </ChamferButton>
                        </div>
                    )}
                </div>

                <div className="p-4 flex flex-col gap-3">
                    {caLoading ? (
                        <div className="flex flex-col gap-2.5">
                            <div className="flex gap-6">
                                <Skeleton className="h-3.5 w-36" />
                                <Skeleton className="h-3.5 w-44" />
                            </div>
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : caCert?.caCertificatePem ? (
                        <>
                            <div className="flex flex-wrap gap-6 text-xs font-mono text-slate-600">
                                <span>
                                    <strong className="text-slate-800">CN:</strong>{" "}
                                    {caCert.commonName || "UTM Root CA"}
                                </span>
                                {caCert.expiresAt && (
                                    <span>
                                        <strong className="text-slate-800">
                                            {t("expiresLabel")}
                                        </strong>{" "}
                                        {formatDateTime(caCert.expiresAt)}
                                    </span>
                                )}
                            </div>
                            <pre className="rounded-md bg-slate-900 text-slate-200 p-3 text-[11px] font-mono max-h-48 overflow-auto">
                                {caCert.caCertificatePem}
                            </pre>
                        </>
                    ) : (
                        <p className="text-xs text-slate-500">{t("caUnavailable")}</p>
                    )}
                </div>
            </ChamferCard>
        </div>
    );
}
