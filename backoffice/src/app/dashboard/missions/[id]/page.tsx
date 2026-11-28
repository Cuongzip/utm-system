import { Suspense } from "react";
import { PageEditorSkeleton } from "@/components/ui";
import { EditMissionClient } from "./EditMissionClient";

export default function EditMissionPage() {
    return (
        <Suspense fallback={<PageEditorSkeleton />}>
            <EditMissionClient />
        </Suspense>
    );
}
