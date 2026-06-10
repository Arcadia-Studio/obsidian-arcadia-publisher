import { App, FileSystemAdapter, TFile, normalizePath } from "obsidian";
import { pathToFileURL } from "url";
import { ArcadiaPublisherSettings, ExportResult } from "./types";
import { MarkdownProcessor } from "./markdown-processor";
import { getDocumentCSS, getHTMLTemplate } from "./templates";
import { ensureDirectory, resolveOutputDir } from "./html-exporter";

/** Minimal type for Electron BrowserWindow used in PDF rendering */
interface ElectronBrowserWindowConstructor {
	new (options: Record<string, unknown>): ElectronBrowserWindowInstance;
}

interface ElectronBrowserWindowInstance {
	loadURL(url: string): void;
	destroy(): void;
	webContents: {
		on(event: string, listener: (...args: never[]) => void): void;
		printToPDF(options: Record<string, unknown>): Promise<Buffer>;
	};
}

const PDF_RENDER_TIMEOUT_MS = 45000;

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

			// Render and print through a hidden Electron window
			const pageSizeName = this.settings.pageSize === "a4" ? "A4" : "Letter";
			const pdfBuffer = await this.renderToPDF(fullHTML, pageSizeName);

			// Ensure output directory exists
			const outputDir = resolveOutputDir(this.settings.outputDir);
			await ensureDirectory(this.app, outputDir);

			// Write the PDF file
			const outputName = `${file.basename}.pdf`;
			const outputPath = outputDir ? `${outputDir}/${outputName}` : outputName;

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

	private async renderToPDF(html: string, pageSizeName: "A4" | "Letter"): Promise<ArrayBuffer> {
		// Access Electron's BrowserWindow through the remote module.
		// Electron remote is only available at runtime in Obsidian's desktop environment.
		// eslint-disable-next-line @typescript-eslint/no-require-imports -- Electron modules must be loaded via require() at runtime in Obsidian
		const electron = require("electron") as {
			remote?: { BrowserWindow?: ElectronBrowserWindowConstructor };
		};
		const BrowserWindow = electron.remote?.BrowserWindow;
		if (!BrowserWindow) {
			throw new Error("PDF rendering is only available in the Obsidian desktop app.");
		}

		const adapter = this.app.vault.adapter;
		if (!(adapter instanceof FileSystemAdapter)) {
			throw new Error("PDF export requires a vault stored on the local file system.");
		}

		// Load the document from a temporary file. Chromium caps data: URLs
		// at about 2 MB, which notes with embedded images exceed quickly.
		const tmpPath = normalizePath(
			`${this.app.vault.configDir}/arcadia-publisher-print.tmp.html`
		);
		await adapter.write(tmpPath, html);
		const fileUrl = pathToFileURL(adapter.getFullPath(tmpPath)).toString();

		try {
			return await new Promise<ArrayBuffer>((resolve, reject) => {
				const win = new BrowserWindow({
					show: false,
					width: 800,
					height: 600,
					webPreferences: {
						nodeIntegration: false,
						contextIsolation: true,
						sandbox: true,
					},
				});

				let settled = false;
				const finish = (complete: () => void) => {
					if (settled) return;
					settled = true;
					window.clearTimeout(timeoutId);
					try {
						win.destroy();
					} catch {
						// Window already gone
					}
					complete();
				};

				const timeoutId = window.setTimeout(() => {
					finish(() =>
						reject(
							new Error(
								`PDF rendering timed out after ${PDF_RENDER_TIMEOUT_MS / 1000} seconds.`
							)
						)
					);
				}, PDF_RENDER_TIMEOUT_MS);

				win.webContents.on("did-finish-load", () => {
					// Small delay to let CSS fully render
					window.setTimeout(() => {
						win.webContents
							.printToPDF({
								pageSize: pageSizeName,
								printBackground: true,
								margins: { marginType: "none" },
								preferCSSPageSize: true,
							})
							.then((data: Buffer) => {
								// Copy the Buffer into a standalone ArrayBuffer
								const arrayBuffer = new ArrayBuffer(data.byteLength);
								new Uint8Array(arrayBuffer).set(data);
								finish(() => resolve(arrayBuffer));
							})
							.catch((err: Error) => {
								finish(() => reject(err));
							});
					}, 250);
				});

				win.webContents.on(
					"did-fail-load",
					(_event: unknown, errorCode: number, errorDescription: string) => {
						finish(() =>
							reject(
								new Error(
									`Failed to load content for PDF rendering: ${errorDescription} (${errorCode})`
								)
							)
						);
					}
				);

				win.loadURL(fileUrl);
			});
		} finally {
			try {
				await adapter.remove(tmpPath);
			} catch {
				// Best-effort cleanup of the temporary file
			}
		}
	}
}
