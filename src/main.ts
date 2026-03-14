import {
	Plugin,
	ItemView,
	TFile,
	normalizePath,
	moment,
	type App,
	type WorkspaceLeaf,
} from "obsidian";
import { mount, unmount } from "svelte";
import { writable, type Writable } from "svelte/store";
import PixelViewComponent from "./components/PixelView.svelte";
import type { Entry } from "./types";
import {
	DEFAULT_SETTINGS,
	YearInPixelsSettingTab,
	type YearInPixelsSettings,
} from "./settings";

const VIEW_TYPE_PIXELS = "year-in-pixels-view";
const VIEW_TYPE_PIXELS_SIDEBAR = "year-in-pixels-sidebar-view";

// Main plugin class. Handles initialization, registering views, commands, and settings
export default class YearInPixelsPlugin extends Plugin {
	settings: YearInPixelsSettings;

	async onload() {
		await this.loadSettings();

		// Register the main center view
		this.registerView(
			VIEW_TYPE_PIXELS,
			(leaf) => new YearInPixelsView(leaf, this.app, this),
		);

		// Register the sidebar mini view
		this.registerView(
			VIEW_TYPE_PIXELS_SIDEBAR,
			(leaf) => new YearInPixelsSidebarView(leaf, this.app, this),
		);

		this.addSettingTab(new YearInPixelsSettingTab(this.app, this));

		// Add icon to the left ribbon
		this.addRibbonIcon("layout-grid", "Open year in pixels", () => {
			void this.activateView();
		});

		// Add command palette options
		this.addCommand({
			id: "open-view",
			name: "Open view",
			callback: () => {
				void this.activateView();
			},
		});

		this.addCommand({
			id: "open-sidebar-view",
			name: "Open sidebar view",
			callback: () => {
				void this.activateSidebarView();
			},
		});
	}

	async loadSettings() {
		const loaded =
			(await this.loadData()) as Partial<YearInPixelsSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded ?? {});
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_PIXELS);

		if (leaves.length > 0) {
			leaf = leaves[0] || null;
		} else {
			const leaf = workspace.getLeaf("tab");
			await leaf.setViewState({ type: VIEW_TYPE_PIXELS, active: true });
			void workspace.revealLeaf(leaf);
		}

		if (leaf) {
			void workspace.revealLeaf(leaf);
		}
	}

	async activateSidebarView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_PIXELS_SIDEBAR);

		if (leaves.length > 0) {
			leaf = leaves[0] || null;
		} else {
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				await rightLeaf.setViewState({
					type: VIEW_TYPE_PIXELS_SIDEBAR,
					active: true,
				});
				void workspace.revealLeaf(rightLeaf);
			}
		}

		if (leaf) {
			void workspace.revealLeaf(leaf);
		}
	}

	// Triggers a refresh on all open views
	reRenderAllViews() {
		const { workspace } = this.app;
		const leaves = [
			...workspace.getLeavesOfType(VIEW_TYPE_PIXELS),
			...workspace.getLeavesOfType(VIEW_TYPE_PIXELS_SIDEBAR),
		];

		for (const leaf of leaves) {
			if (
				leaf.view instanceof YearInPixelsView ||
				leaf.view instanceof YearInPixelsSidebarView
			) {
				void leaf.view.render();
			}
		}
	}

	// Triggers a refresh on all open views
	requestRefreshAllViews() {
		const { workspace } = this.app;
		const leaves = [
			...workspace.getLeavesOfType(VIEW_TYPE_PIXELS),
			...workspace.getLeavesOfType(VIEW_TYPE_PIXELS_SIDEBAR),
		];

		for (const leaf of leaves) {
			if (
				leaf.view instanceof YearInPixelsView ||
				leaf.view instanceof YearInPixelsSidebarView
			) {
				void leaf.view.requestRefresh();
			}
		}
	}

	// Centralized logic to open a note corresponding to a clicked entry
	openEntryNote(entry: Entry) {
		if (entry.path) {
			const file = this.app.vault.getAbstractFileByPath(entry.path);
			if (file && file instanceof TFile) {
				void this.app.workspace.getLeaf(false).openFile(file);
			}
		} else if (entry.date) {
			const folder = this.settings.targetFolder;
			const path = normalizePath(
				folder && folder !== "/"
					? `${folder}/${entry.date}.md`
					: `${entry.date}.md`,
			);
			const file = this.app.vault.getAbstractFileByPath(path);
			if (file && file instanceof TFile) {
				void this.app.workspace.getLeaf(false).openFile(file);
			}
		}
	}

	onunload() {}
}

// The main view for the chart. Renders the Svelte component and handles data fetching
class YearInPixelsView extends ItemView {
	component: ReturnType<typeof mount> | null = null;
	app: App;
	plugin: YearInPixelsPlugin;
	entriesStore: Writable<Entry[]>;
	refreshTimeout: ReturnType<typeof setTimeout> | null = null;
	currentYearIndex: number = 0;

	constructor(leaf: WorkspaceLeaf, app: App, plugin: YearInPixelsPlugin) {
		super(leaf);
		this.app = app;
		this.plugin = plugin;
		this.entriesStore = writable([]);
	}

	getViewType() {
		return VIEW_TYPE_PIXELS;
	}

	getDisplayText() {
		return "Year in pixels";
	}

	getIcon() {
		return "calendar";
	}

	async onOpen() {
		const container = this.contentEl;
		container.empty();
		container.addClass("year-in-pixels-view-container");

		void this.render();

		// Watch for file changes to automatically update the chart
		this.registerEvent(
			this.app.metadataCache.on("changed", (file) =>
				this.onFileChange(file),
			),
		);
		this.registerEvent(
			this.app.vault.on("create", (file) => {
				if (file instanceof TFile) this.onFileChange(file);
			}),
		);
		this.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (file instanceof TFile) this.onFileChange(file);
			}),
		);
	}

	// Filters vault events to only trigger a refresh when a note in the target folder is modified
	onFileChange(file: TFile) {
		const targetFolder = this.plugin.settings.targetFolder;
		if (targetFolder && targetFolder !== "/") {
			// Ensure it ends with / so we don't match 'Journal-Backup' with target 'Journal'
			const folderPrefix = targetFolder.endsWith("/")
				? targetFolder
				: `${targetFolder}/`;
			if (!file.path.startsWith(folderPrefix)) {
				return;
			}
		}

		this.requestRefresh();
	}

	// Debounces the refresh operation to prevent multiple rapid re-renders when many files change at once or when typing
	requestRefresh() {
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}
		this.refreshTimeout = setTimeout(() => {
			void this.refresh();
		}, 500);
	}

	// Unmounts and remounts the Svelte component with fresh data
	async refresh() {
		const entries = await this.getEntriesFromNotes(this.currentYear());
		this.entriesStore.set(entries);
	}

	async render() {
		if (this.component) {
			await unmount(this.component);
			this.component = null;
		}
		const entries = await this.getEntriesFromNotes(this.currentYear());
		this.entriesStore.set(entries);
		const container = this.contentEl;
		container.empty();

		this.component = mount(PixelViewComponent, {
			target: container,
			props: {
				entriesStore: this.entriesStore,
				customVariables: this.plugin.settings.customVariables || [],
				years: this.getYears(),
				currentYearIndex: this.currentYearIndex,
				formatDate: (dateStr: string) => {
					return moment(dateStr, "YYYY-MM-DD").format(
						this.plugin.settings.dateFormat || "YYYY-MM-DD",
					);
				},
				onChangeYear: (idx: number) => {
					this.currentYearIndex = idx;
					void this.requestRefresh();
				},
				onEntryClick: (entry: Entry) => {
					this.plugin.openEntryNote(entry);
				},
			},
		});
	}

	async onClose() {
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout);
		}
		if (this.component) {
			await unmount(this.component);
		}
	}

	// Scans the vault for notes in the target folder, extracts emotion/rating data from the frontmatter, and fills in missing days for the selected year
	async getEntriesFromNotes(targetYear?: number): Promise<Entry[]> {
		const rawEntries = new Map<string, Entry>();
		const files = this.app.vault.getMarkdownFiles();
		const targetFolder = this.plugin.settings.targetFolder?.trim();
		const targetYearNum = targetYear ?? this.currentYear();
		const targetYearStr = String(targetYearNum);

		if (!targetFolder) {
			return [];
		}

		// Collect all valid entries from the vault
		for (const file of files) {
			if (targetFolder !== "/" && targetFolder !== ".") {
				const folderPrefix = targetFolder.endsWith("/")
					? targetFolder
					: `${targetFolder}/`;
				if (!file.path.startsWith(folderPrefix)) {
					continue;
				}
			}

			const metadata = this.app.metadataCache.getFileCache(file);
			const frontmatter = metadata?.frontmatter;

			if (frontmatter) {
				const hasCustomVar = this.plugin.settings.customVariables?.some(
					(cv) => frontmatter[cv.id] !== undefined,
				);
				if (hasCustomVar) {
					let parsedMoment: moment.Moment | null = null;
					const format =
						this.plugin.settings.dateFormat || "YYYY-MM-DD";

					if (frontmatter.date) {
						if (frontmatter.date instanceof Date) {
							parsedMoment = moment(frontmatter.date);
						} else {
							parsedMoment = moment(
								String(frontmatter.date),
								[format, "YYYY-MM-DD", "YYYY-MM-DDTHH:mm:ss"],
								true,
							);
							if (!parsedMoment.isValid()) {
								parsedMoment = moment(String(frontmatter.date));
							}
						}
					}

					if (!parsedMoment || !parsedMoment.isValid()) {
						const strictMoment = moment(
							file.basename,
							format,
							true,
						);
						if (strictMoment.isValid()) {
							parsedMoment = strictMoment;
						} else {
							const looseMoment = moment(file.basename, format);
							if (looseMoment.isValid()) {
								parsedMoment = looseMoment;
							}
						}
					}

					if (!parsedMoment || !parsedMoment.isValid()) {
						continue;
					}

					const dateStr = parsedMoment.format("YYYY-MM-DD");
					if (!dateStr.startsWith(targetYearStr)) {
						continue;
					}

					const customVarsData: Record<string, string> = {};
					if (this.plugin.settings.customVariables) {
						for (const cv of this.plugin.settings.customVariables) {
							if (frontmatter[cv.id] !== undefined) {
								customVarsData[cv.id] = String(
									frontmatter[cv.id],
								);
							}
						}
					}

					rawEntries.set(dateStr, {
						date: dateStr,
						note: file.basename,
						path: file.path,
						customVariables: customVarsData,
					});
				}
			}
		}

		// Fill in missing days for the selected year
		const filledEntries: Entry[] = [];

		const daysInYear =
			(targetYearNum % 4 === 0 && targetYearNum % 100 > 0) ||
			targetYearNum % 400 === 0
				? 366
				: 365;

		// Start from Jan 1st of target year
		for (let i = 0; i < daysInYear; i++) {
			const date = new Date(targetYearNum, 0, 1 + i);
			const offset = date.getTimezoneOffset();
			const dateStr =
				new Date(date.getTime() - offset * 60 * 1000)
					.toISOString()
					.split("T")[0] || "";

			const existing = rawEntries.get(dateStr);

			if (existing) {
				filledEntries.push(existing);
			} else {
				filledEntries.push({
					date: dateStr,
					note: "No entry",
					customVariables: {},
				});
			}
		}

		return filledEntries;
	}

	// Parse configured years and return them sorted most recent first
	getYears(): number[] {
		const raw = String(
			this.plugin.settings.years ??
				this.plugin.settings.year ??
				new Date().getFullYear(),
		);
		const parts = raw
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean)
			.map((s) => parseInt(s, 10))
			.filter((n) => !Number.isNaN(n));
		parts.sort((a, b) => b - a);
		return parts.length ? parts : [new Date().getFullYear()];
	}

	currentYear(): number {
		const ys = this.getYears();
		if (this.currentYearIndex < 0) this.currentYearIndex = 0;
		if (this.currentYearIndex >= ys.length) this.currentYearIndex = 0;
		return ys[this.currentYearIndex] || new Date().getFullYear();
	}
}

// A smaller version of the view designed to fit in Obsidian's sidebars
class YearInPixelsSidebarView extends YearInPixelsView {
	getViewType() {
		return VIEW_TYPE_PIXELS_SIDEBAR;
	}

	getDisplayText() {
		return "Year in pixels (mini)";
	}

	async render() {
		if (this.component) {
			await unmount(this.component);
			this.component = null;
		}
		const entries = await this.getEntriesFromNotes();
		this.entriesStore.set(entries);
		const container = this.contentEl;
		container.empty();

		this.component = mount(PixelViewComponent, {
			target: container,
			props: {
				entriesStore: this.entriesStore,
				customVariables: this.plugin.settings.customVariables || [],
				isSidebar: true,
				years: this.getYears(),
				currentYearIndex: this.currentYearIndex,
				formatDate: (dateStr: string) => {
					return moment(dateStr, "YYYY-MM-DD").format(
						this.plugin.settings.dateFormat || "YYYY-MM-DD",
					);
				},
				onChangeYear: (idx: number) => {
					this.currentYearIndex = idx;
					void this.requestRefresh();
				},
				onEntryClick: (entry: Entry) => {
					this.plugin.openEntryNote(entry);
				},
			},
		});
	}
}
