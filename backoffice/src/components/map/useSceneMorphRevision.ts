"use client";

import { useEffect, useState } from "react";
import type { Viewer } from "cesium";

export function useSceneMorphRevision(viewer: Viewer | null, isLoaded: boolean): number {
    const [sceneRevision, setSceneRevision] = useState(0);

    useEffect(() => {
        if (!viewer || !isLoaded || viewer.isDestroyed()) return;
        const removeListener = viewer.scene.morphComplete.addEventListener(() => {
            setSceneRevision((rev) => rev + 1);
        });
        return () => {
            removeListener();
        };
    }, [viewer, isLoaded]);

    return sceneRevision;
}
