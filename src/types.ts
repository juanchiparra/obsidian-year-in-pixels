// Represents a single day's entry in the visualization
export interface Entry {
	date: string;
	note?: string;
	path?: string;
	customVariables: Record<string, string>;
}

// Represents a custom variable the user wants to track
export interface CustomVariable {
	id: string;
	name: string;
	colors: Record<string, string>;
}

// Defines the layout configuration for a chart
export interface ChartLayout {
	columns?: number;
	cellW?: number;
	cellH?: number;
	padding?: number;
	margin?: { top: number; right: number; bottom: number; left: number };
	cx?: number;
	cy?: number;
	outerR?: number;
	innerR?: number;
	uniformDays?: number;
}

// Determines whether the chart colors are based on a specific custom variable
export type DrawMode = string;

export interface ThemeConfig {
	drawMode: DrawMode;
	customVariables?: CustomVariable[];
}
