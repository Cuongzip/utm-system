import { CompassLoader } from "@/components/ui";

export default function Loading() {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 text-white">
            <CompassLoader size={140} text="Đang tải hệ thống UTM Backoffice..." />
        </div>
    );
}
