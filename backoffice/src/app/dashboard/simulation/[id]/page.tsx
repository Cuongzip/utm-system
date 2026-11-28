import { Suspense } from "react";
import { SimulationDetailClient } from "./SimulationDetailClient";
import { SimulationDetailSkeleton } from "./SimulationDetailSkeleton";

interface SimulationDetailPageProps {
    params: Promise<{ id: string }>;
}

async function SimulationDetailLoader({ params }: SimulationDetailPageProps) {
    const { id } = await params;
    return <SimulationDetailClient id={id} />;
}

export default function SimulationDetailPage({ params }: SimulationDetailPageProps) {
    return (
        <Suspense fallback={<SimulationDetailSkeleton />}>
            <SimulationDetailLoader params={params} />
        </Suspense>
    );
}
