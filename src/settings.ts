import { App, PluginSettingTab, Setting } from "obsidian";
import type ArcadiaPublisherPlugin from "./main";
import { validateLicense } from "./license";

export class ArcadiaPublisherSettingTab extends PluginSettingTab {
	plugin: ArcadiaPublisherPlugin;

	constructor(app: App, plugin: ArcadiaPublisherPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

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
					.addOption("letter", "Letter (8.5 x 11 in)")
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
					.addOption("sans", "Sans-serif (system UI)")
					.addOption("mono", "Monospace (Consolas)")
					.setValue(this.plugin.settings.fontFamily)
					.onChange(async (value) => {
						this.plugin.settings.fontFamily = value as "serif" | "sans" | "mono";
						await this.plugin.saveSettings();
					})
			);

		// Pro Section
		new Setting(containerEl).setName("Pro license").setHeading();

		const licenseStatus = this.plugin.settings.licenseStatus;
		const isPro = this.plugin.settings.isPro && licenseStatus?.valid;
		const statusDesc = isPro
			? `Active${licenseStatus?.customerEmail ? ` (${licenseStatus.customerEmail})` : ""}${licenseStatus?.expiresAt ? ` - expires ${licenseStatus.expiresAt}` : ""}`
			: "No active license. Enter your license key and click Validate.";

		const licenseStatusEl = containerEl.createEl("p", {
			text: `License status: ${statusDesc}`,
			cls: isPro ? "mod-success" : "mod-warning",
		});

		new Setting(containerEl)
			.setName("License key")
			.setDesc("Enter your premium license key from Lemon Squeezy")
			.addText((text) =>
				text
					.setPlaceholder("xxxx-xxxx-xxxx-xxxx")
					.setValue(this.plugin.settings.licenseKey)
					.onChange(async (value) => {
						this.plugin.settings.licenseKey = value.trim();
						await this.plugin.saveSettings();
					})
			)
			.addButton((btn) =>
				btn
					.setButtonText("Validate")
					.setCta()
					.onClick(async () => {
						const key = this.plugin.settings.licenseKey.trim();
						if (!key) return;
						btn.setButtonText("Checking...").setDisabled(true);
						const status = await validateLicense(key);
						this.plugin.settings.licenseStatus = status;
						this.plugin.settings.isPro = status.valid;
						await this.plugin.saveSettings();
						btn.setButtonText("Validate").setDisabled(false);
						if (status.valid) {
							licenseStatusEl.textContent = `License status: Active${status.customerEmail ? ` (${status.customerEmail})` : ""}`;
							licenseStatusEl.className = "mod-success";
						} else {
							licenseStatusEl.textContent = "License status: invalid or expired. Check your key and try again.";
							licenseStatusEl.className = "mod-warning";
						}
					})
			);

		new Setting(containerEl)
			.addButton((btn) =>
				btn
					.setButtonText("Get premium")
					.onClick(() => {
						window.open("https://arcadia-studio.lemonsqueezy.com", "_blank");
					})
			);
	}
}
