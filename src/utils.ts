import type { Entry, DrawMode } from "./types";

// Return array of 12 maps
export function buildMonthMaps(entries: Entry[]): Map<number, Entry>[] {
	const maps = Array.from({ length: 12 }, () => new Map<number, Entry>());
	for (const entry of entries) {
		if (!entry.date) continue;

		const parts = entry.date.split("-");
		if (parts.length === 3 && parts[1] && parts[2]) {
			const month = parseInt(parts[1], 10) - 1;
			const day = parseInt(parts[2], 10) - 1;

			if (month >= 0 && month < 12 && maps[month]) {
				maps[month].set(day, entry);
			}
		}
	}
	return maps;
}

// Return fill color hex for an entry
export function getFill(
	entry: Entry,
	config: {
		drawMode: DrawMode;
		customVariables?: import("./types").CustomVariable[];
	},
): string {
	const { drawMode, customVariables } = config;
	const noneColor = "#2d2d2d";

	const customVar = customVariables?.find((v) => v.id === drawMode);
	if (!customVar) return noneColor;

	const value = entry.customVariables
		? entry.customVariables[drawMode]
		: undefined;
	if (!value) return noneColor;

	return customVar.colors[value] || noneColor;
}

// Converts polar coordinates (radius and angle) to cartesian coordinates (x, y) for SVG paths
export function polar(r: number, angle: number, cx = 0, cy = 0) {
	return { x: Math.cos(angle) * r + cx, y: Math.sin(angle) * r + cy };
}

// Generates an SVG path string for a donut-shaped arc segment
export function arcPath(
	innerR: number,
	outerR: number,
	startAngle: number,
	endAngle: number,
	cx = 0,
	cy = 0,
) {
	const startInner = polar(innerR, startAngle, cx, cy);
	const endInner = polar(innerR, endAngle, cx, cy);
	const endOuter = polar(outerR, endAngle, cx, cy);
	const startOuter = polar(outerR, startAngle, cx, cy);

	const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

	return `M ${startInner.x} ${startInner.y} A ${innerR} ${innerR} 0 ${largeArc} 1 ${endInner.x} ${endInner.y} L ${endOuter.x} ${endOuter.y} A ${outerR} ${outerR} 0 ${largeArc} 0 ${startOuter.x} ${startOuter.y} Z`;
}
