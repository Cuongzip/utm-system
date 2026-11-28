import { Suspense } from "react";
import { PageEditorSkeleton } from "@/components/ui";
import { FlightDetailClient } from "./FlightDetailClient";

export default function EditFlightPage() {
    return (
        <Suspense fallback={<PageEditorSkeleton />}>
            <FlightDetailClient />
        </Suspense>
    );
}
