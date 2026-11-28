import { Suspense } from "react";
import { PageEditorSkeleton } from "@/components/ui";
import { FlightCockpitClient } from "./FlightCockpitClient";

export default function FlightCockpitPage() {
    return (
        <Suspense fallback={<PageEditorSkeleton />}>
            <FlightCockpitClient />
        </Suspense>
    );
}
