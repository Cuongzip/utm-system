import type * as CesiumType from "cesium";

export interface TacticalLabelOptions {
    text: string;
    isSelected?: boolean;
    accentColor?: string;
    fontSize?: number;
    pixelOffset?: CesiumType.Cartesian2;
    eyeOffset?: CesiumType.Cartesian3;
    maxDistance?: number;
    showBackground?: boolean;
}

export function createTacticalLabel(
    Cesium: typeof CesiumType,
    options: TacticalLabelOptions
): CesiumType.LabelGraphics.ConstructorOptions {
    const isSelected = !!options.isSelected;
    const fontSize = options.fontSize ?? 11;
    const font = `${isSelected ? "bold" : "600"} ${fontSize}px monospace`;
    const textColor = isSelected
        ? Cesium.Color.fromCssColorString(options.accentColor || "#00e5ff")
        : Cesium.Color.WHITE;

    const bgColor = isSelected
        ? new Cesium.Color(0.02, 0.14, 0.25, 0.94)
        : new Cesium.Color(0.04, 0.08, 0.16, 0.88);

    return {
        text: options.text,
        font,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: textColor,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 1.5,
        showBackground: options.showBackground ?? true,
        backgroundColor: bgColor,
        backgroundPadding: new Cesium.Cartesian2(7, 4),
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: options.pixelOffset ?? new Cesium.Cartesian2(0, -20),
        eyeOffset: options.eyeOffset ?? new Cesium.Cartesian3(0, 0, -25),
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        distanceDisplayCondition: new Cesium.DistanceDisplayCondition(
            0,
            options.maxDistance ?? 250000
        ),
    };
}
