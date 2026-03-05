import {
	PluginSettingTab,
	Setting,
	Notice,
	ButtonComponent,
	moment,
	type App,
} from "obsidian";
import type YearInPixelsPlugin from "./main";
import type { CustomVariable } from "./types";

export interface YearInPixelsSettings {
	targetFolder: string;
	dateFormat: string;
	years?: string;
	year?: number;
	customVariables: CustomVariable[];
}

export const DEFAULT_SETTINGS: YearInPixelsSettings = {
	targetFolder: "/",
	dateFormat: "YYYY-MM-DD",
	years: String(new Date().getFullYear()),
	customVariables: [],
};

const DEFAULT_EMOTION_PRESET: CustomVariable = {
	id: "emotion",
	name: "Emotion",
	colors: {
		powerful: "#FF912C",
		joyful: "#F1BC3D",
		peaceful: "#4CBA8B",
		scared: "#AA76B8",
		sad: "#4497C3",
		mad: "#FF542C",
	},
};

const DEFAULT_RATING_PRESET: CustomVariable = {
	id: "rating",
	name: "Rating",
	colors: {
		"1": "#d8ccee",
		"2": "#bfa8e6",
		"3": "#a484e1",
		"4": "#8a6cef",
		"5": "#6d54c1",
	},
};

function clonePreset(preset: CustomVariable): CustomVariable {
	return {
		id: preset.id,
		name: preset.name,
		colors: { ...preset.colors },
	};
}

export class YearInPixelsSettingTab extends PluginSettingTab {
	plugin: YearInPixelsPlugin;

	constructor(app: App, plugin: YearInPixelsPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("year-in-pixels-settings");

		// Main plugin configuration
		new Setting(containerEl).setHeading().setName("General settings");

		new Setting(containerEl)
			.setName("Target folder")
			.setDesc(
				"The folder containing your daily notes or journal entries.",
			)
			.addText((text) =>
				text
					.setPlaceholder("Example: journal/2024")
					.setValue(this.plugin.settings.targetFolder)
					.onChange(async (value) => {
						this.plugin.settings.targetFolder = value;
						await this.plugin.saveSettings();
						this.plugin.reRenderAllViews();
					}),
			);

		new Setting(containerEl)
			.setName("Years")
			.setDesc(
				"Comma-separated years (e.g. 2025, 2026). Most recent will be shown first.",
			)
			.addText((text) =>
				text
					.setPlaceholder("E.g. 2024, 2025")
					.setValue(String(this.plugin.settings.years || ""))
					.onChange(async (value) => {
						this.plugin.settings.years = value;
						const parts = String(value || "")
							.split(",")
							.map((s) => s.trim())
							.filter(Boolean);
						const parsed = parseInt(String(parts[0] || ""), 10);
						if (parts.length === 1 && !Number.isNaN(parsed)) {
							this.plugin.settings.year = parsed;
						}
						await this.plugin.saveSettings();
						this.plugin.reRenderAllViews();
					}),
			);

		new Setting(containerEl)
			.setName("Date format")
			.setDesc(
				"Specify the date format used in your note names (or frontmatter 'date'). Use tokens like YYYY-MM-DD or DD-MM-YYYY. Note: Obsidian note titles cannot contain '/'.",
			)
			.addText((text) =>
				text
					.setPlaceholder("YYYY-MM-DD")
					.setValue(this.plugin.settings.dateFormat || "YYYY-MM-DD")
					.onChange(async (value) => {
						let sanitized = value.trim() || "YYYY-MM-DD";
						if (sanitized.includes("/")) {
							sanitized = sanitized.replace(/\//g, "-");
						}
						this.plugin.settings.dateFormat = sanitized;
						await this.plugin.saveSettings();
						this.plugin.reRenderAllViews();
					}),
			);

		containerEl.createEl("br");
		// Helper actions to quickly bootstrap example data
		new Setting(containerEl).setHeading().setName("Data & examples");

		new Setting(containerEl)
			.setName("Generate sample notes")
			.setDesc(
				"Create an 'Example' folder in the vault root with 15 notes (Jan 1-15 of current year) to serve as a guide. This will auto-configure emotion and rating presets if missing.",
			)
			.addButton((button) =>
				button.setButtonText("Generate").onClick(async () => {
					// Use the current year to ensure generated notes are easily found
					const year = new Date().getFullYear();
					const folder = "Example";

					if (this.app.vault.getAbstractFileByPath(folder)) {
						new Notice(
							`The folder '${folder}' already exists. Operation cancelled to avoid duplicating notes.`,
						);
						return;
					}

					this.plugin.settings.targetFolder = folder;

					try {
						await this.app.vault.createFolder(folder);
					} catch (e) {
						console.error("Error creating folder", e);
					}

					const emotions = [
						"powerful",
						"joyful",
						"peaceful",
						"scared",
						"sad",
						"mad",
					];
					const ratings = ["1", "2", "3", "4", "5"];

					let createdCount = 0;
					let format =
						this.plugin.settings.dateFormat || "YYYY-MM-DD";

					for (let i = 0; i < 15; i++) {
						// Create consecutive sample notes from Jan 1st to 15th
						const dateObj = moment({
							year: year,
							month: 0,
							day: i + 1,
						});
						const dateStr = dateObj.format(format);

						const path = `${folder}/${dateStr}.md`;

						if (!this.app.vault.getAbstractFileByPath(path)) {
							const emotion =
								emotions[
									Math.floor(Math.random() * emotions.length)
								];
							const rating =
								ratings[
									Math.floor(Math.random() * ratings.length)
								];

							const content = `---\nemotion: ${emotion}\nrating: ${rating}\n---\n# ${dateStr}\nThis is an automatically generated example note.\n`;
							try {
								await this.app.vault.create(path, content);
								createdCount++;
							} catch (error) {
								console.error(
									"Error creating sample note",
									error,
								);
							}
						}
					}

					const hasEmotion =
						this.plugin.settings.customVariables.find(
							(v) => v.id === "emotion",
						);
					// Ensure default presets exist after generating samples
					if (!hasEmotion) {
						this.plugin.settings.customVariables.push(
							clonePreset(DEFAULT_EMOTION_PRESET),
						);
					}
					const hasRating = this.plugin.settings.customVariables.find(
						(v) => v.id === "rating",
					);
					if (!hasRating) {
						this.plugin.settings.customVariables.push(
							clonePreset(DEFAULT_RATING_PRESET),
						);
					}

					await this.plugin.saveSettings();

					new Notice(
						`Created ${createdCount} sample notes in the 'Example' folder!`,
					);

					setTimeout(() => {
						this.plugin.reRenderAllViews();
						this.display();
					}, 1000);
				}),
			);

		containerEl.createEl("br");
		new Setting(containerEl).setHeading().setName("Custom variables");
		new Setting(containerEl).setDesc(
			"Track any variables from your frontmatter. Choose the property name, display name, and map values to colors. Click on a variable to expand and configure it.",
		);

		this.plugin.settings.customVariables =
			this.plugin.settings.customVariables || [];

		this.plugin.settings.customVariables.forEach((cv, idx) => {
			const detailsEl = containerEl.createEl("details", {
				cls: "year-in-pixels-custom-var-details year-in-pixels-settings-details",
			});

			const summaryEl = detailsEl.createEl("summary");
			summaryEl.addClass("year-in-pixels-settings-summary");
			summaryEl.textContent = cv.name
				? `${cv.name} (ID: ${cv.id})`
				: `Variable ${idx + 1}`;

			const contentDiv = detailsEl.createDiv({
				cls: "year-in-pixels-settings-details-content",
			});

			new Setting(contentDiv)
				.setName("Variable identification")
				.setDesc("Set the frontmatter key and display name.")
				.addText((text) =>
					text
						.setPlaceholder("Frontmatter key")
						.setValue(cv.id)
						.onChange(async (val) => {
							cv.id = val;
							await this.plugin.saveSettings();
						}),
				)
				.addText((text) =>
					text
						.setPlaceholder("Display name")
						.setValue(cv.name)
						.onChange(async (val) => {
							cv.name = val;
							await this.plugin.saveSettings();
						}),
				);

			new Setting(contentDiv)
				.setName("Delete variable")
				.setDesc("Remove this variable entirely.")
				.addButton((btn) =>
					btn
						.setButtonText("Delete")
						.setWarning()
						.setIcon("trash")
						.onClick(async () => {
							this.plugin.settings.customVariables.splice(idx, 1);
							await this.plugin.saveSettings();
							this.plugin.reRenderAllViews();
							this.display();
						}),
				);

			new Setting(contentDiv)
				.setHeading()
				.setName("Value to color mapping");
			const colorsDiv = contentDiv.createDiv();

			Object.entries(cv.colors || {})
				.sort((a, b) => {
					const numA = Number(a[0]);
					const numB = Number(b[0]);
					if (!Number.isNaN(numA) && !Number.isNaN(numB))
						return numB - numA;
					return 0;
				})
				.forEach(([val, color]) => {
					new Setting(colorsDiv)
						.setName(String(val))
						.addColorPicker((c) =>
							c.setValue(color).onChange(async (newColor) => {
								cv.colors[val] = newColor;
								await this.plugin.saveSettings();
								this.plugin.reRenderAllViews();
							}),
						)
						.addButton((btn) =>
							btn.setIcon("trash").onClick(async () => {
								delete cv.colors[val];
								await this.plugin.saveSettings();
								this.plugin.reRenderAllViews();
								this.display();
							}),
						);
				});

			new Setting(colorsDiv)
				.setName("Add new value")
				.addText((text) => {
					text.setPlaceholder("New value (e.g. 8)");
					let tempVal = "";
					text.onChange((v) => {
						tempVal = v;
					});

					text.inputEl.addEventListener("keypress", (e) => {
						void (async () => {
							if (e.key === "Enter" && tempVal) {
								if (!cv.colors) cv.colors = {};
								cv.colors[tempVal] = "#cccccc";
								await this.plugin.saveSettings();
								this.plugin.reRenderAllViews();
								this.display();
							}
						})();
					});
				})
				.setDesc("Press enter to add");
		});

		const addBtnContainer = containerEl.createDiv();
		addBtnContainer.addClass(
			"year-in-pixels-settings-add-button-container",
		);

		new ButtonComponent(addBtnContainer)
			.setButtonText("Add custom variable")
			.setCta()
			.onClick(async () => {
				this.plugin.settings.customVariables.push({
					id: `custom_${Date.now()}`,
					name: "New Variable",
					colors: {},
				});
				await this.plugin.saveSettings();
				this.display();
			});
	}
}
