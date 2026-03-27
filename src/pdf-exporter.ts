import { App, TFile } from "obsidian";
import { ArcadiaPublisherSettings, ExportResult } from "./types";
import { MarkdownProcessor } from "./markdown-processor";
import { getDocumentCSS, getHTMLTemplate } from "./templates";

export class PDFExporter {
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

			// Build the title
			const rawContent = await this.app.vault.read(file);
			const metadata = processor.getMetadata(rawContent, file);
			const title = metadata.title;

			// Assemble full HTML document
			const fullHTML = getHTMLTemplate(title, css, bodyContent);

			// Determine page size for printToPDF
			const pageWidth = this.settings.pageSize === "a4" ? 8.27 : 8.5;
			const pageHeight = this.settings.pageSize === "a4" ? 11.69 : 11.0;

			// Use Electron's BrowserWindow to render and print to PDF
			const pdfBuffer = await this.renderToPDF(fullHTML, pageWidth, pageHeight);

			// Ensure output directory exists
			const outputDir = this.settings.outputDir;
			await this.ensureDirectory(outputDir);

			// Write the PDF file
			const outputName = `${file.basename}.pdf`;
			const outputPath = `${outputDir}/${outputName}`;

			const existingFile = this.app.vault.getAbstractFileByPath(outputPath);
			if (existingFile instanceof TFile) {
				await this.app.vault.modifyBinary(existingFile, pdfBuffer);
			} else {
				await this.app.vault.createBinary(outputPath, pdfBuffer);
			}

			return {
				success: true,
				outputPath: outputPath,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: `PDF export failed: ${message}`,
			};
		}
	}

	private async renderToPDF(
		html: string,
		pageWidthInches: number,
		pageHeightInches: number
	): Promise<ArrayBuffer> {
		// Access Electron's BrowserWindow through the remote module
		// eslint-disable-next-line @typescript-eslint/no-var-requires
		const { remote } = require("electron");
		const { BrowserWindow } = remote;

		return new Promise<ArrayBuffer>((resolve, reject) => {
			const win = new BrowserWindow({
				show: false,
				width: 800,
				height: 600,
				webPreferences: {
					offscreen: true,
					nodeIntegration: false,
				},
			});

			// Load the HTML content
			win.loadURL(
				`data:text/html;charset=utf-8,${encodeURIComponent(html)}`
			);

			win.webContents.on("did-finish-load", () => {
				// Small delay to let CSS fully render
				setTimeout(() => {
					win.webContents
						.printToPDF({
							marginsType: 0,
							pageSize: {
								width: pageWidthInches * 25400, // convert inches to microns
								height: pageHeightInches * 25400,
							},
							printBackground: true,
							printSelectionOnly: false,
						})
						.then((data: Buffer) => {
							win.close();
							// Convert Buffer to ArrayBuffer
							const arrayBuffer = data.buffer.slice(
								data.byteOffset,
								data.byteOffset + data.byteLength
							);
							resolve(arrayBuffer);
						})
						.catch((err: Error) => {
							win.close();
							reject(err);
						});
				}, 500);
			});

			win.webContents.on(
				"did-fail-load",
				(_event: unknown, errorCode: number, errorDescription: string) => {
					win.close();
					reject(
						new Error(
							`Failed to load content for PDF rendering: ${errorDescription} (${errorCode})`
						)
					);
				}
			);
		});
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
