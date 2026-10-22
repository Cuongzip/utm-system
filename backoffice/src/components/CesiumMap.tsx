"use client";

import { BaseCesiumMap } from "@/components/map";

interface CesiumMapProps {
    height?: string;
    hideToolbar?: boolean;
}

export default function CesiumMap({ height = "650px", hideToolbar = false }: CesiumMapProps) {
    return (
        <BaseCesiumMap
            mode="3d"
            layerType="satellite"
            height={height}
            hideToolbar={hideToolbar}
            loadingText="Đang tải bản đồ 3D Globe..."
        />
    );
}
