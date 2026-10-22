"use client";

import { createContext, useContext } from "react";
import type { CesiumContextValue } from "./types";

export const CesiumContext = createContext<CesiumContextValue>({
    viewer: null,
    isLoaded: false,
});

export function useCesium(): CesiumContextValue {
    const context = useContext(CesiumContext);
    if (!context) {
        throw new Error("useCesium must be used within a BaseCesiumMap");
    }
    return context;
}
