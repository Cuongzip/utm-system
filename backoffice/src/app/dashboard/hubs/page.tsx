import { Suspense } from "react";
import { HubsWorkspace } from "@/components/hubs";

export default function HubsPage() {
    return (
        <Suspense fallback={null}>
            <HubsWorkspace />
        </Suspense>
    );
}
