import type * as CesiumType from "cesium";

export interface TacticalLabelOptions {
    text: string;
    isSelected?: boolean;
    accentColor?: string;
    fontSize?: number;
    pixelOffset?: CesiumType.Cartesian2;
    eyeOffset?: CesiumType.Cartesian3;
    maxDistance?: number;
}

export function createTacticalLabel(
    Cesium: typeof CesiumType,
    options: TacticalLabelOptions
): CesiumType.LabelGraphics.ConstructorOptions {
    const isSelected = Boolean(options.isSelected);
    const fontSize = options.fontSize ?? 11;
    const maxDistance = options.maxDistance ?? 250000;
    const font = `${isSelected ? "bold" : "600"} ${fontSize}px monospace`;
    const textColor = isSelected
        ? Cesium.Color.fromCssColorString(options.accentColor || "#00e5ff")
        : Cesium.Color.WHITE;

    const bgColor = isSelected
        ? new Cesium.Color(0.02, 0.14, 0.25, 0.94)
        : new Cesium.Color(0.04, 0.08, 0.16, 0.88);

    const fadeStart = Math.max(2500, maxDistance * 0.62);

    return {
        text: options.text,
        font,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: textColor,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1.5,
        showBackground: true,
        backgroundColor: bgColor,
        backgroundPadding: new Cesium.Cartesian2(7, 4),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: options.pixelOffset ?? new Cesium.Cartesian2(0, -20),
        eyeOffset: options.eyeOffset ?? new Cesium.Cartesian3(0, 0, -25),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        scaleByDistance: isSelected
            ? new Cesium.NearFarScalar(1500, 1.04, maxDistance, 0.88)
            : new Cesium.NearFarScalar(1500, 1.0, maxDistance, 0.78),
        translucencyByDistance: isSelected
            ? undefined
            : new Cesium.NearFarScalar(fadeStart, 1.0, maxDistance, 0.0),
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, maxDistance),
    };
}
