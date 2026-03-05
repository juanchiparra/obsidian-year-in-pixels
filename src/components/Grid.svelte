<script lang="ts">
	import type { Entry, ChartLayout, ThemeConfig } from "../types";
	import { getFill } from "../utils";
	export let entries: Entry[] = [];
	export let layout: ChartLayout = {
		columns: 21,
		cellW: 36,
		cellH: 36,
		padding: 8,
		margin: { top: 20, right: 20, bottom: 20, left: 20 },
	};
	export let theme: ThemeConfig = {
		drawMode: "none",
	};

	// Triggered when the mouse moves over the grid
	export let onHover: (
		entry: Entry | null | undefined,
		event?: MouseEvent,
	) => void = () => {};

	// Triggered when a specific day cell is clicked
	export let onClick: (entry: Entry) => void = () => {};

	// Builds an accessible label for each cell, useful for screen readers
	function entryAriaLabel(entry: Entry): string {
		const date = entry.date ?? entry.note ?? "unknown date";
		const data = Object.entries(entry.customVariables || {})
			.map(([k, v]) => `${k}: ${v}`)
			.join(", ");
		return `Day ${date}. ${data}`;
	}
</script>

<svg
	width="100%"
	height="100%"
	viewBox="0 0 {(layout.columns ?? 20) *
		((layout.cellW ?? 36) + (layout.padding ?? 8)) +
		(layout.margin?.left ?? 20) +
		(layout.margin?.right ?? 20)} {Math.ceil(
		entries.length / (layout.columns ?? 20),
	) *
		((layout.cellH ?? 36) + (layout.padding ?? 8)) +
		(layout.margin?.top ?? 20) +
		(layout.margin?.bottom ?? 20)}"
>
	<g
		transform={`translate(${layout.margin?.left ?? 20},${layout.margin?.top ?? 20})`}
		on:mouseleave={() => onHover(null)}
		role="group"
	>
		<rect
			x="0"
			y="0"
			width={(layout.columns ?? 20) *
				((layout.cellW ?? 36) + (layout.padding ?? 8))}
			height={Math.ceil(entries.length / (layout.columns ?? 21)) *
				((layout.cellH ?? 36) + (layout.padding ?? 8))}
			fill="transparent"
			on:mousemove={(e) => onHover(undefined, e)}
			role="presentation"
			aria-hidden="true"
		/>

		{#each entries as entry, index (entry.date ?? entry.note ?? index)}
			{@const row = Math.floor(index / (layout.columns ?? 21))}
			{@const col = index % (layout.columns ?? 21)}
			{@const w = Math.round((layout.cellW ?? 36) * 0.85)}
			{@const h = Math.round((layout.cellH ?? 36) * 0.85)}
			{@const x =
				col * ((layout.cellW ?? 36) + (layout.padding ?? 8)) +
				Math.round(((layout.cellW ?? 36) - w) / 2)}
			{@const y =
				row * ((layout.cellH ?? 36) + (layout.padding ?? 8)) +
				Math.round(((layout.cellH ?? 36) - h) / 2)}
			<rect
				class="rect"
				{x}
				{y}
				width={w}
				height={h}
				rx={2}
				ry={2}
				fill={getFill(entry, theme)}
				role="button"
				aria-label={entryAriaLabel(entry)}
				tabindex="0"
				on:mouseenter={(e) => onHover(entry, e)}
				on:mousemove={(e) => onHover(entry, e)}
				on:click={() => onClick(entry)}
				on:keydown={(e) =>
					(e.key === "Enter" || e.key === " ") && onClick(entry)}
			/>
		{/each}
	</g>
</svg>

<style>
	.rect {
		transition: opacity 0.15s ease;
		cursor: pointer;
	}
	.rect:hover {
		stroke: var(--text-normal);
		stroke-width: 2px;
	}
</style>
