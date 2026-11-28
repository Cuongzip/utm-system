import type * as CesiumType from "cesium";

export type TacticalLabelVariant = "default" | "aircraft" | "hub" | "zone" | "alert";

export interface TacticalLabelOptions {
    text: string;
    isSelected?: boolean;
    accentColor?: string;
    variant?: TacticalLabelVariant;
    fontSize?: number;
    verticalOrigin?: CesiumType.VerticalOrigin;
    pixelOffset?: CesiumType.Cartesian2;
    eyeOffset?: CesiumType.Cartesian3;
    maxDistance?: number;
}

const MONO_FONT_FAMILY = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';

export function createTacticalLabel(
    Cesium: typeof CesiumType,
    options: TacticalLabelOptions
): CesiumType.LabelGraphics.ConstructorOptions {
    const isSelected = Boolean(options.isSelected);
    const variant: TacticalLabelVariant = options.variant ?? "default";
    const isZone = variant === "zone";
    const isAlert = variant === "alert";

    const fontSize = options.fontSize ?? (isZone ? 10 : 11);
    const maxDistance = options.maxDistance ?? 250000;
    const fontWeight = isSelected || isAlert ? "700" : isZone ? "500" : "600";
    const font = `${fontWeight} ${fontSize}px ${MONO_FONT_FAMILY}`;

    const textColor = isSelected
        ? Cesium.Color.fromCssColorString(options.accentColor || "#00e5ff")
        : isAlert
          ? Cesium.Color.fromCssColorString(options.accentColor || "#fca5a5")
          : isZone
            ? Cesium.Color.fromCssColorString("#e2e8f0").withAlpha(0.92)
            : Cesium.Color.WHITE;

    const bgColor = isSelected
        ? new Cesium.Color(0.02, 0.14, 0.25, 0.94)
        : isAlert
          ? new Cesium.Color(0.18, 0.04, 0.06, 0.92)
          : isZone
            ? new Cesium.Color(0.04, 0.07, 0.13, 0.68)
            : new Cesium.Color(0.04, 0.08, 0.16, 0.88);

    const fadeStart = Math.max(2500, maxDistance * 0.62);

    return {
        text: options.text,
        font,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: textColor,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: isZone ? 1.2 : 1.6,
        showBackground: true,
        backgroundColor: bgColor,
        backgroundPadding: isZone ? new Cesium.Cartesian2(6, 3) : new Cesium.Cartesian2(7, 4),
        verticalOrigin: options.verticalOrigin ?? Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: options.pixelOffset ?? new Cesium.Cartesian2(0, -22),
        eyeOffset: options.eyeOffset ?? new Cesium.Cartesian3(0, 0, -25),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: isSelected
            ? new Cesium.NearFarScalar(1500, 1.04, maxDistance, 0.88)
            : isZone
              ? new Cesium.NearFarScalar(1500, 0.96, maxDistance, 0.72)
              : new Cesium.NearFarScalar(1500, 1.0, maxDistance, 0.78),
        translucencyByDistance: isSelected
            ? undefined
            : new Cesium.NearFarScalar(fadeStart, 1.0, maxDistance, 0.0),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, maxDistance),
    };
}
