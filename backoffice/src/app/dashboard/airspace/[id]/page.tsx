import { Suspense } from "react";
import { PageEditorSkeleton } from "@/components/ui";
import { EditAirspaceClient } from "./EditAirspaceClient";

export default function EditAirspacePage() {
    return (
        <Suspense fallback={<PageEditorSkeleton />}>
            <EditAirspaceClient />
        </Suspense>
    );
}
