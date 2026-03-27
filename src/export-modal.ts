import { App, Modal, Notice, Setting, TFile } from "obsidian";
import { ArcadiaPublisherSettings } from "./types";
import { HTMLExporter } from "./html-exporter";
import { PDFExporter } from "./pdf-exporter";

export class ExportModal extends Modal {
	private file: TFile;
	private settings: ArcadiaPublisherSettings;
	private selectedFormat: "pdf" | "html";
	private exporting = false;

	constructor(app: App, file: TFile, settings: ArcadiaPublisherSettings) {
		super(app);
		this.file = file;
		this.settings = settings;
		this.selectedFormat = settings.defaultFormat;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.addClass("arcadia-publisher-modal");

		contentEl.createEl("h2", { text: "Export Note" });

		// Note name display
		contentEl.createEl("p", {
			text: this.file.basename,
			cls: "arcadia-publisher-modal-filename",
		});

		// Format selector
		new Setting(contentEl)
			.setName("Export format")
			.addDropdown((dropdown) =>
				dropdown
					.addOption("pdf", "PDF")
					.addOption("html", "HTML")
					.setValue(this.selectedFormat)
					.onChange((value) => {
						this.selectedFormat = value as "pdf" | "html";
					})
			);

		// Settings summary
		const summaryEl = contentEl.createDiv({
			cls: "arcadia-publisher-modal-summary",
		});
		summaryEl.createEl("p", {
			text: `Output: ${this.settings.outputDir}/`,
		});
		summaryEl.createEl("p", {
			text: `Page size: ${this.settings.pageSize === "a4" ? "A4" : "Letter"}`,
		});
		summaryEl.createEl("p", {
			text: `Font: ${this.settings.fontFamily}`,
		});
		summaryEl.createEl("p", {
			text: `TOC: ${this.settings.includeTOC ? "Yes" : "No"}`,
		});

		// Progress area (hidden by default)
		const progressEl = contentEl.createDiv({
			cls: "arcadia-publisher-modal-progress",
		});
		progressEl.style.display = "none";

		// Export button
		const buttonContainer = contentEl.createDiv({
			cls: "arcadia-publisher-modal-buttons",
		});

		const exportBtn = buttonContainer.createEl("button", {
			text: "Export",
			cls: "mod-cta",
		});

		const cancelBtn = buttonContainer.createEl("button", {
			text: "Cancel",
		});

		exportBtn.addEventListener("click", async () => {
			if (this.exporting) return;
			this.exporting = true;
			exportBtn.disabled = true;
			exportBtn.textContent = "Exporting...";
			progressEl.style.display = "block";
			progressEl.textContent = `Exporting to ${this.selectedFormat.toUpperCase()}...`;

			try {
				const result = await this.runExport();
				if (result.success) {
					new Notice(
						`Exported to ${result.outputPath}`,
						5000
					);
				} else {
					new Notice(
						`Export failed: ${result.error}`,
						8000
					);
				}
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				new Notice(`Export error: ${msg}`, 8000);
			}

			this.close();
		});

		cancelBtn.addEventListener("click", () => {
			this.close();
		});
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}

	private async runExport() {
		if (this.selectedFormat === "html") {
			const exporter = new HTMLExporter(this.app, this.settings);
			return exporter.export(this.file);
		} else {
			const exporter = new PDFExporter(this.app, this.settings);
			return exporter.export(this.file);
		}
	}
}
