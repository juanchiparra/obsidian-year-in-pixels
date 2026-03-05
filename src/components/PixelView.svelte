<script lang="ts">
	import type { Entry, ChartLayout, ThemeConfig } from "../types";
	import Grid from "./Grid.svelte";
	import Radial from "./Radial.svelte";
	import Rings from "./Rings.svelte";

	//Props
	import type { Writable } from "svelte/store";
	export let entriesStore: Writable<Entry[]> | null = null;
	export let entries: Entry[] = [];
	export let customVariables: import("../types").CustomVariable[] = [];
	export let isSidebar: boolean = false;
	export let onEntryClick: (entry: Entry) => void = () => {};

	// Years navigation
	export let years: number[] = [new Date().getFullYear()];
	export let currentYearIndex: number = 0;
	export let onChangeYear: (idx: number) => void = () => {};
	$: activeEntries = (entriesStore ? $entriesStore : entries) || [];

	export let formatDate: (dateStr: string) => string = (d) => d;

	// State
	let chartType: "grid" | "circular-months" | "circular-rings" = "grid";

	// Base layout configuration. Adjusts sizes if rendered in the sidebar
	let layout: ChartLayout = {
		columns: isSidebar ? 7 : 20,
		cellW: isSidebar ? 12 : 20,
		cellH: isSidebar ? 12 : 20,
		padding: isSidebar ? 2 : 4,
		margin: { top: 10, right: 10, bottom: 10, left: 10 },
		cx: isSidebar ? 150 : 300,
		cy: isSidebar ? 150 : 300,
		outerR: isSidebar ? 140 : 280,
		innerR: isSidebar ? 20 : 40,
		uniformDays: 31,
	};

	// Reactive statement to update layout if isSidebar changes dynamically
	$: {
		layout.columns = isSidebar ? 7 : 20;
		layout.cellW = isSidebar ? 12 : 20;
		layout.cellH = isSidebar ? 12 : 20;
		layout.padding = isSidebar ? 2 : 4;
		layout.cx = isSidebar ? 150 : 300;
		layout.cy = isSidebar ? 150 : 300;
		layout.outerR = isSidebar ? 140 : 280;
		layout.innerR = isSidebar ? 20 : 40;
	}

	// Theme configuration
	let theme: ThemeConfig = {
		drawMode: customVariables[0]?.id || "none",
		customVariables: customVariables,
	};

	// Keep theme colors in sync with props
	$: theme.customVariables = customVariables;
	$: if (
		theme.drawMode === "none" &&
		customVariables &&
		customVariables.length > 0
	) {
		theme.drawMode = customVariables[0]?.id || "none";
	}

	// Tooltip state
	let tooltipEntry: Entry | null = null;
	let tooltipX = 0;
	let tooltipY = 0;
	let container: HTMLElement;

	// Handlers
	function toggleDrawMode() {
		const modes = customVariables.map((v) => v.id);
		if (modes.length === 0) return;
		const currentIndex = modes.indexOf(theme.drawMode);
		const nextIndex = (currentIndex + 1) % modes.length;
		theme.drawMode = modes[nextIndex] || modes[0] || "none";
	}

	function prevYear() {
		if ((years || []).length <= 1) return;
		currentYearIndex = (currentYearIndex - 1 + years.length) % years.length;
		onChangeYear(currentYearIndex);
	}

	function nextYear() {
		if ((years || []).length <= 1) return;
		currentYearIndex = (currentYearIndex + 1) % years.length;
		onChangeYear(currentYearIndex);
	}

	function toggleChartType() {
		if (chartType === "grid") chartType = "circular-months";
		else if (chartType === "circular-months") chartType = "circular-rings";
		else chartType = "grid";
	}

	// Handles mouse movements over the chart to position and populate the tooltip
	function handleHover(entry: Entry | null | undefined, event?: MouseEvent) {
		if (entry) {
			tooltipEntry = entry;
		}

		// Always update position if event is provided, even if entry didn't change
		if (event) {
			if (container) {
				const rect = container.getBoundingClientRect();
				const x = event.clientX - rect.left + container.scrollLeft;
				const y = event.clientY - rect.top + container.scrollTop;

				const isNearRight =
					event.clientX - rect.left > rect.width - 160;
				const isNearBottom =
					event.clientY - rect.top > rect.height - 100;

				tooltipX = isNearRight ? x - 80 : x;

				tooltipY = isNearBottom ? y - 90 : y + 25;
			} else {
				tooltipX = event.clientX;
				tooltipY = event.clientY + 25;
			}
		}

		if (entry === null) {
			tooltipEntry = null;
		}
	}
</script>

<div
	class="pixels-container"
	bind:this={container}
	class:is-sidebar={isSidebar}
>
	<div class="content-wrapper">
		<div class="controls">
			<div class="year-controls">
				<button
					class="toggle-mode-btn clickable-icon"
					on:click={prevYear}
					disabled={(years || []).length <= 1}
					aria-label="Previous year"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m15 18-6-6 6-6" /></svg
					>
				</button>
				<div class="year-display">
					{years[currentYearIndex]}
				</div>
				<button
					class="toggle-mode-btn clickable-icon"
					on:click={nextYear}
					disabled={(years || []).length <= 1}
					aria-label="Next year"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg
					>
				</button>
			</div>

			<button
				class="toggle-mode-btn clickable-icon"
				on:click={toggleChartType}
				aria-label="Toggle chart type"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path
						d="M22 12A10 10 0 0 0 12 2v10z"
					/></svg
				>
			</button>
			<button
				class="toggle-mode-btn clickable-icon"
				on:click={toggleDrawMode}
				aria-label="Toggle between Emotion and Rating colors"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path
						d="m16 21 4-4-4-4"
					/><path d="M20 17H4" /></svg
				>
			</button>
		</div>

		{#if !isSidebar}
			<div class="legend-wrapper">
				<div class="legend-title">
					{customVariables.find((v) => v.id === theme.drawMode)
						?.name ?? theme.drawMode}
				</div>
				<div class="legend">
					{#if customVariables.find((v) => v.id === theme.drawMode)}
						{#each Object.entries(customVariables.find((v) => v.id === theme.drawMode)?.colors ?? {}).sort( (a, b) => {
								const numA = Number(a[0]);
								const numB = Number(b[0]);
								if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
								return 0;
							}, ) as [val, color]}
							<div class="legend-item">
								<div
									class="legend-color"
									style="background-color: {color}"
								></div>
								<span>{val}</span>
							</div>
						{/each}
					{/if}
				</div>
			</div>
		{/if}

		<div class="chart-wrapper">
			{#if chartType === "grid"}
				<Grid
					entries={activeEntries}
					{layout}
					{theme}
					onHover={handleHover}
					onClick={onEntryClick}
				/>
			{:else if chartType === "circular-months"}
				<Radial
					entries={activeEntries}
					{layout}
					{theme}
					onHover={handleHover}
					onClick={onEntryClick}
				/>
			{:else if chartType === "circular-rings"}
				<Rings
					entries={activeEntries}
					{layout}
					{theme}
					onHover={handleHover}
					onClick={onEntryClick}
				/>
			{/if}
		</div>
	</div>

	{#if tooltipEntry}
		<div class="tooltip" style="left: {tooltipX}px; top: {tooltipY}px;">
			<div class="tooltip-date">{formatDate(tooltipEntry.date)}</div>
			{#if Object.keys(tooltipEntry.customVariables || {}).length === 0}
				<div class="tooltip-row">No data</div>
			{/if}
			{#each customVariables || [] as cv}
				{#if tooltipEntry.customVariables && tooltipEntry.customVariables[cv.id]}
					<div class="tooltip-row">
						{cv.name}: {tooltipEntry.customVariables[cv.id]}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>

<style>
	.pixels-container {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: auto;
		background-color: var(--background-primary);
		color: var(--text-normal);
		position: relative;
	}
	.pixels-container.is-sidebar .content-wrapper {
		padding: 0.5rem;
		overflow: visible;
	}
	.pixels-container.is-sidebar .controls {
		justify-content: center;
		margin-bottom: 0.5rem;
	}
	.pixels-container.is-sidebar .chart-wrapper {
		overflow: visible;
		align-items: flex-start;
	}
	.content-wrapper {
		padding: 1rem;
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		min-height: 0;
	}
	.controls {
		margin-bottom: 1rem;
		display: flex;
		gap: 1rem;
		align-items: center;
		flex-shrink: 0;
		justify-content: flex-end;
	}
	.toggle-mode-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		background: transparent;
		border: none;
		color: var(--text-muted);
		padding: 6px;
		border-radius: var(--radius-s);
		cursor: pointer;
		transition:
			color 0.15s ease,
			background-color 0.15s ease;
	}
	.toggle-mode-btn:hover {
		color: var(--text-normal);
		background-color: var(--background-modifier-hover);
	}

	.year-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin-right: auto;
	}

	.year-display {
		font-weight: 600;
		display: flex;
		align-items: baseline;
		gap: 0.35rem;
	}

	.chart-wrapper {
		flex: 1;
		position: relative;
		overflow: hidden;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 0;
		width: 100%;
	}
	.tooltip {
		position: absolute;
		background: var(--background-secondary);
		border: 1px solid var(--background-modifier-border);
		padding: 8px;
		border-radius: 4px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		font-size: 0.8rem;
		pointer-events: none;
		z-index: 1000;
		white-space: nowrap;
		transform: translateX(-50%);
	}
	.legend-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9rem;
		color: var(--text-muted);
	}
	.legend-color {
		width: 16px;
		height: 16px;
		border-radius: 4px;
		border: 1px solid var(--background-modifier-border);
	}
	.tooltip-date {
		font-weight: bold;
		margin-bottom: 4px;
	}
	.legend-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-bottom: 1rem;
		flex-shrink: 0;
	}
	.legend-title {
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.25rem;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		justify-content: center;
		padding: 0.5rem;
		background: transparent;
	}
</style>
