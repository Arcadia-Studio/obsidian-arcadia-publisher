import { App, PluginSettingTab, Setting } from "obsidian";
import type ArcadiaPublisherPlugin from "./main";
import { ArcadiaPublisherSettings } from "./types";

export class ArcadiaPublisherSettingTab extends PluginSettingTab {
	plugin: ArcadiaPublisherPlugin;

	constructor(app: App, plugin: ArcadiaPublisherPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl("h2", { text: "Arcadia Publisher Settings" });

		// Output Directory
		new Setting(containerEl)
			.setName("Output directory")
			.setDesc("Folder for exported files (relative to vault root)")
			.addText((text) =>
				text
					.setPlaceholder("exports")
					.setValue(this.plugin.settings.outputDir)
					.onChange(async (value) => {
						this.plugin.settings.outputDir = value.trim() || "exports";
						await this.plugin.saveSettings();
					})
			);

		// Default Format
		new Setting(containerEl)
			.setName("Default export format")
			.setDesc("Format used when exporting via ribbon icon or quick command")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("pdf", "PDF")
					.addOption("html", "HTML")
					.setValue(this.plugin.settings.defaultFormat)
					.onChange(async (value) => {
						this.plugin.settings.defaultFormat = value as "pdf" | "html";
						await this.plugin.saveSettings();
					})
			);

		// Author Name
		new Setting(containerEl)
			.setName("Author name")
			.setDesc("Used in document metadata and header")
			.addText((text) =>
				text
					.setPlaceholder("Your name")
					.setValue(this.plugin.settings.authorName)
					.onChange(async (value) => {
						this.plugin.settings.authorName = value;
						await this.plugin.saveSettings();
					})
			);

		// Include Frontmatter
		new Setting(containerEl)
			.setName("Include frontmatter header")
			.setDesc("Show title, author, and date at the top of exported documents")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeFrontmatter)
					.onChange(async (value) => {
						this.plugin.settings.includeFrontmatter = value;
						await this.plugin.saveSettings();
					})
			);

		// Include TOC
		new Setting(containerEl)
			.setName("Include table of contents")
			.setDesc("Generate a table of contents from headings")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.includeTOC)
					.onChange(async (value) => {
						this.plugin.settings.includeTOC = value;
						await this.plugin.saveSettings();
					})
			);

		// Page Size
		new Setting(containerEl)
			.setName("Page size")
			.setDesc("Paper size for PDF export")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("letter", "Letter (8.5 x 11)")
					.addOption("a4", "A4 (210 x 297 mm)")
					.setValue(this.plugin.settings.pageSize)
					.onChange(async (value) => {
						this.plugin.settings.pageSize = value as "letter" | "a4";
						await this.plugin.saveSettings();
					})
			);

		// Font Family
		new Setting(containerEl)
			.setName("Font family")
			.setDesc("Primary font for exported documents")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("serif", "Serif (Georgia)")
					.addOption("sans", "Sans-serif (System UI)")
					.addOption("mono", "Monospace (Consolas)")
					.setValue(this.plugin.settings.fontFamily)
					.onChange(async (value) => {
						this.plugin.settings.fontFamily = value as "serif" | "sans" | "mono";
						await this.plugin.saveSettings();
					})
			);

		// Pro Section
		containerEl.createEl("h3", { text: "Pro License" });

		new Setting(containerEl)
			.setName("License key")
			.setDesc("Enter your Arcadia Publisher Pro license key (optional)")
			.addText((text) =>
				text
					.setPlaceholder("XXXX-XXXX-XXXX-XXXX")
					.setValue(this.plugin.settings.licenseKey)
					.onChange(async (value) => {
						this.plugin.settings.licenseKey = value.trim();
						await this.plugin.saveSettings();
					})
			);
	}
}
