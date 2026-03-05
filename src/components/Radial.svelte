<script lang="ts">
	import type { Entry, ChartLayout, ThemeConfig } from "../types";
	import { buildMonthMaps, getFill, arcPath } from "../utils";

	// Props
	export let entries: Entry[] = [];
	export let layout: ChartLayout = {
		cx: 300,
		cy: 300,
		outerR: 250,
		innerR: 40,
		uniformDays: 31,
	};
	export let theme: ThemeConfig = {
		drawMode: "none",
		customVariables: [],
	};

	// Triggered when the mouse moves over the chart
	export let onHover: (
		entry: Entry | null | undefined,
		event?: MouseEvent,
	) => void = () => {};

	// Triggered when a specific day arc is clicked
	export let onClick: (entry: Entry) => void = () => {};

	const months = Array.from({ length: 12 }, (_, i) => i);
	let days: number[] = [];
	const gap = 0.01;
	const monthAngle = (Math.PI * 2) / 12;

	$: days = Array.from({ length: layout.uniformDays ?? 31 }, (_, i) => i);

	// Calculate the thickness of each day's ring based on available radius
	$: ringSize =
		((layout.outerR ?? 250) - (layout.innerR ?? 40) - 8) /
		(layout.uniformDays ?? 31);
	$: effinnerR = layout.innerR ?? 40;

	$: monthMaps = buildMonthMaps(entries);

	function getEntry(
		maps: Map<number, Entry>[],
		monthIndex: number,
		dayIndex: number,
	): Entry | null {
		return maps[monthIndex]?.get(dayIndex) ?? null;
	}

	// Builds an accessible label for each arc segment, useful for screen readers
	function entryAriaLabel(
		entry: Entry | null,
		month: number,
		day: number,
	): string {
		if (!entry) {
			return `Month ${month + 1}, day ${day + 1}, empty`;
		}

		const date = entry.date ?? entry.note ?? "unknown date";
		const data = Object.entries(entry.customVariables || {})
			.map(([k, v]) => `${k}: ${v}`)
			.join(", ");
		return `Month ${month + 1}, day ${day + 1}. Date ${date}. ${data}`;
	}
</script>

<svg
	width="100%"
	height="100%"
	viewBox="0 0 {(layout.cx ?? 300) * 2} {(layout.cy ?? 300) * 2}"
>
	<g on:mouseleave={() => onHover(null)} role="group">
		<!-- Background circle to capture mouse events in gaps -->
		<circle
			cx={layout.cx ?? 300}
			cy={layout.cy ?? 300}
			r={layout.outerR ?? 250}
			fill="transparent"
			role="presentation"
			on:mousemove={(e) => onHover(undefined, e)}
		/>

		{#each months as month (month)}
			{@const start = -Math.PI / 2 + month * monthAngle + gap / 2}
			{@const end = start + monthAngle - gap}
			{#each days as day (day)}
				{@const entry = getEntry(monthMaps, month, day)}
				{@const ratingFactor = 1}
				{@const inner = effinnerR + day * ringSize + 1}
				{@const outer = Math.max(inner + 1, inner + (ringSize - 2))}
				{@const arcStart = start}
				{@const arcEnd =
					start + Math.max(0.002, (end - start) * ratingFactor)}
				<path
					role="button"
					tabindex="0"
					class="arc"
					d={arcPath(
						inner,
						outer,
						arcStart,
						arcEnd,
						layout.cx ?? 300,
						layout.cy ?? 300,
					)}
					fill={entry
						? getFill(entry, theme)
						: "var(--background-modifier-border)"}
					aria-label={entryAriaLabel(entry, month, day)}
					on:mouseenter={(e) => onHover(entry, e)}
					on:mousemove={(e) => onHover(entry, e)}
					on:click={() => entry && onClick(entry)}
					on:keydown={(e) =>
						(e.key === "Enter" || e.key === " ") &&
						entry &&
						onClick(entry)}
				/>
			{/each}
		{/each}
	</g>
</svg>

<style>
	.arc {
		transition: opacity 0.15s ease;
		cursor: pointer;
	}
	.arc:hover {
		stroke: var(--text-normal);
		stroke-width: 2px;
	}
</style>
