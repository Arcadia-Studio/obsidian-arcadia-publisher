import { App, TFile } from "obsidian";
import { ArcadiaPublisherSettings, ExportResult } from "./types";
import { MarkdownProcessor } from "./markdown-processor";
import { getDocumentCSS, getHTMLTemplate } from "./templates";

export class HTMLExporter {
	private app: App;
	private settings: ArcadiaPublisherSettings;

	constructor(app: App, settings: ArcadiaPublisherSettings) {
		this.app = app;
		this.settings = settings;
	}

	async export(file: TFile): Promise<ExportResult> {
		try {
			const processor = new MarkdownProcessor(this.app, this.settings);

			// Get the processed body HTML
			const bodyContent = await processor.process(file);

			// Get the document CSS
			const css = getDocumentCSS(this.settings);

			// Build the title from frontmatter or filename
			const rawContent = await this.app.vault.read(file);
			const metadata = processor.getMetadata(rawContent, file);
			const title = metadata.title;

			// Assemble full HTML document
			const fullHTML = getHTMLTemplate(title, css, bodyContent);

			// Ensure output directory exists
			const outputDir = this.settings.outputDir;
			await this.ensureDirectory(outputDir);

			// Write the file
			const outputName = `${file.basename}.html`;
			const outputPath = `${outputDir}/${outputName}`;

			const existingFile = this.app.vault.getAbstractFileByPath(outputPath);
			if (existingFile instanceof TFile) {
				await this.app.vault.modify(existingFile, fullHTML);
			} else {
				await this.app.vault.create(outputPath, fullHTML);
			}

			return {
				success: true,
				outputPath: outputPath,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: `HTML export failed: ${message}`,
			};
		}
	}

	private async ensureDirectory(path: string): Promise<void> {
		const parts = path.split("/").filter((p) => p.length > 0);
		let current = "";

		for (const part of parts) {
			current = current ? `${current}/${part}` : part;
			const existing = this.app.vault.getAbstractFileByPath(current);
			if (!existing) {
				await this.app.vault.createFolder(current);
			}
		}
	}
}
