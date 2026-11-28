import { Suspense } from "react";
import { PageEditorSkeleton } from "@/components/ui";
import { ControlCenterClient } from "./ControlCenterClient";

export default function ControlCenterPage() {
    return (
        <Suspense fallback={<PageEditorSkeleton />}>
            <ControlCenterClient />
        </Suspense>
    );
}
