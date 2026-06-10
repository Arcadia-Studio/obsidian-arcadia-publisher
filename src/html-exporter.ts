import { App, TFile, normalizePath } from "obsidian";
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
			const outputDir = resolveOutputDir(this.settings.outputDir);
			await ensureDirectory(this.app, outputDir);

			// Write the file
			const outputName = `${file.basename}.html`;
			const outputPath = outputDir ? `${outputDir}/${outputName}` : outputName;

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
}

/**
 * Normalize the configured output directory to a vault-relative path.
 * Returns an empty string for the vault root.
 */
export function resolveOutputDir(outputDir: string): string {
	const cleaned = (outputDir || "").trim().replace(/\\/g, "/");
	if (!cleaned || cleaned === "/" || cleaned === ".") return "exports";
	const normalized = normalizePath(cleaned);
	return normalized === "/" ? "" : normalized;
}

/** Create the directory chain if it does not exist yet. */
export async function ensureDirectory(app: App, path: string): Promise<void> {
	if (!path) return; // vault root always exists

	const parts = path.split("/").filter((p) => p.length > 0);
	let current = "";

	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		const existing = app.vault.getAbstractFileByPath(current);
		if (!existing) {
			try {
				await app.vault.createFolder(current);
			} catch (err) {
				// The folder may already exist with different casing on
				// case-insensitive file systems (Windows, macOS). Only
				// rethrow genuine failures.
				const msg = err instanceof Error ? err.message : String(err);
				if (!msg.toLowerCase().includes("exist")) {
					throw err;
				}
			}
		}
	}
}
