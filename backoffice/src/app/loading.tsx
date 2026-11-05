import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex min-h-screen w-full flex-col items-center justify-center gap-3 bg-zinc-950 text-white">
            <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
            <p className="font-mono text-xs text-zinc-400">Đang tải hệ thống UTM Backoffice...</p>
        </div>
    );
}
