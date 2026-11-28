import { Suspense } from "react";
import { EmergencyIncidentDetailView } from "@/components/emergency/detail/EmergencyIncidentDetailView";
import { IncidentDetailSkeleton } from "@/components/emergency/detail/IncidentDetailSkeleton";

interface IncidentDetailPageProps {
    params: Promise<{ id: string }>;
}

async function IncidentDetailLoader({ params }: IncidentDetailPageProps) {
    const { id } = await params;
    return <EmergencyIncidentDetailView id={id} />;
}

export default function EmergencyIncidentDetailPage({ params }: IncidentDetailPageProps) {
    return (
        <Suspense fallback={<IncidentDetailSkeleton />}>
            <IncidentDetailLoader params={params} />
        </Suspense>
    );
}
