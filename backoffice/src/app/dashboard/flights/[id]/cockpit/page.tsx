"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useHubsAll, useDronesAll, useFlightDetail } from "@/hooks";
import { FlightCockpitWorkspace } from "@/components/flights/cockpit";
import { EmptyState, PageEditorSkeleton } from "@/components/ui";

function FlightCockpitPageContent() {
    const router = useRouter();
    const t = useTranslations("flights");
    const params = useParams();
    const flightId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string);

    const { data: hubs = [], isLoading: hubsLoading } = useHubsAll();
    const { data: drones = [], isLoading: dronesLoading } = useDronesAll();
    const {
        data: flight,
        isLoading: flightLoading,
        error: flightError,
    } = useFlightDetail(flightId, 2500);

    if (flightLoading || hubsLoading || dronesLoading) {
        return <PageEditorSkeleton />;
    }

    if (flightError || !flight) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-8">
                <EmptyState
                    icon={AlertCircle}
                    title={t("notFoundTitle")}
                    description={
                        flightError instanceof Error ? flightError.message : t("notFoundDesc")
                    }
                    action={{
                        label: t("backToFlights"),
                        onClick: () => router.push("/dashboard/flights"),
                        icon: ArrowLeft,
                        variant: "chamfer",
                    }}
                />
            </div>
        );
    }

    return <FlightCockpitWorkspace flight={flight} hubs={hubs} drones={drones} />;
}

export default function FlightCockpitPage() {
    return (
        <Suspense fallback={<PageEditorSkeleton />}>
            <FlightCockpitPageContent />
        </Suspense>
    );
}
