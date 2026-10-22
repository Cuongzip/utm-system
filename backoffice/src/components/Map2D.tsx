"use client";

import { BaseCesiumMap } from "@/components/map";

interface Map2DProps {
    height?: string;
    hideToolbar?: boolean;
}

export default function Map2D({ height = "650px", hideToolbar = false }: Map2DProps) {
    return (
        <BaseCesiumMap
            mode="2d"
            layerType="street"
            height={height}
            hideToolbar={hideToolbar}
            loadingText="Đang tải bản đồ 2D Flat Map..."
        />
    );
}
