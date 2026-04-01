import { Notice, Plugin, TFile } from "obsidian";
import { ArcadiaPublisherSettings, DEFAULT_SETTINGS } from "./types";
import { ArcadiaPublisherSettingTab } from "./settings";
import { ExportModal } from "./export-modal";
import { HTMLExporter } from "./html-exporter";
import { PDFExporter } from "./pdf-exporter";

export default class ArcadiaPublisherPlugin extends Plugin {
	settings: ArcadiaPublisherSettings = DEFAULT_SETTINGS;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Register settings tab
		this.addSettingTab(new ArcadiaPublisherSettingTab(this.app, this));

		// Command: Export current note to PDF
		this.addCommand({
			id: "export-to-pdf",
			name: "Export current note to PDF",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== "md") return false;
				if (!checking) {
					void this.exportFile(file, "pdf");
				}
				return true;
			},
		});

		// Command: Export current note to HTML
		this.addCommand({
			id: "export-to-html",
			name: "Export current note to HTML",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== "md") return false;
				if (!checking) {
					void this.exportFile(file, "html");
				}
				return true;
			},
		});

		// Command: Export current note (opens modal)
		this.addCommand({
			id: "export-current-note",
			name: "Export current note...",
			checkCallback: (checking: boolean) => {
				const file = this.app.workspace.getActiveFile();
				if (!file || file.extension !== "md") return false;
				if (!checking) {
					new ExportModal(this.app, file, this.settings).open();
				}
				return true;
			},
		});

		// Ribbon icon
		this.addRibbonIcon("file-output", "Export note", () => {
			const file = this.app.workspace.getActiveFile();
			if (!file || file.extension !== "md") {
				new Notice("No Markdown file is active.");
				return;
			}
			new ExportModal(this.app, file, this.settings).open();
		});
	}

	onunload(): void {
		// Cleanup if needed
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private async exportFile(file: TFile, format: "pdf" | "html"): Promise<void> {
		new Notice(`Exporting ${file.basename} to ${format.toUpperCase()}...`);

		try {
			let result;
			if (format === "html") {
				const exporter = new HTMLExporter(this.app, this.settings);
				result = await exporter.export(file);
			} else {
				const exporter = new PDFExporter(this.app, this.settings);
				result = await exporter.export(file);
			}

			if (result.success) {
				new Notice(`Exported: ${result.outputPath}`, 5000);
			} else {
				new Notice(`Export failed: ${result.error}`, 8000);
			}
		} catch (err) {
			const msg = err instanceof Error ? err.message : String(err);
			new Notice(`Export error: ${msg}`, 8000);
		}
	}
}
