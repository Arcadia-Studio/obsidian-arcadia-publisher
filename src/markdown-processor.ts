import { App, Component, MarkdownRenderer, TFile } from "obsidian";
import { ArcadiaPublisherSettings, DocumentMetadata, TOCEntry } from "./types";
import { escapeHTML } from "./templates";

export class MarkdownProcessor {
	private app: App;
	private settings: ArcadiaPublisherSettings;

	constructor(app: App, settings: ArcadiaPublisherSettings) {
		this.app = app;
		this.settings = settings;
	}

	async process(file: TFile): Promise<string> {
		const content = await this.app.vault.read(file);
		const { frontmatter, body } = this.splitFrontmatter(content);
		const metadata = this.extractMetadata(frontmatter, file);

		// Render markdown to HTML using Obsidian's renderer
		const renderedHTML = await this.renderMarkdown(body, file);

		// Process images to embed as base64
		const processedHTML = await this.processImages(renderedHTML, file);

		// Build the document body
		const parts: string[] = [];

		// Document header from frontmatter
		if (this.settings.includeFrontmatter) {
			parts.push(this.buildDocumentHeader(metadata));
		}

		// Table of contents
		if (this.settings.includeTOC) {
			const toc = this.extractTOC(processedHTML);
			if (toc.length > 0) {
				parts.push(this.buildTOC(toc));
			}
		}

		// Main content with heading IDs for TOC linking
		const contentWithIDs = this.addHeadingIDs(processedHTML);
		parts.push(`<div class="arcadia-doc-content">${contentWithIDs}</div>`);

		return parts.join("\n");
	}

	getMetadata(content: string, file: TFile): DocumentMetadata {
		const { frontmatter } = this.splitFrontmatter(content);
		return this.extractMetadata(frontmatter, file);
	}

	private splitFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } {
		const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
		const match = content.match(fmRegex);

		if (!match) {
			return { frontmatter: {}, body: content };
		}

		const fmRaw = match[1];
		const body = content.slice(match[0].length);
		const frontmatter = this.parseSimpleYAML(fmRaw);

		return { frontmatter, body };
	}

	private parseSimpleYAML(yaml: string): Record<string, unknown> {
		const result: Record<string, unknown> = {};
		const lines = yaml.split(/\r?\n/);
		let currentKey = "";
		let arrayValues: string[] | null = null;

		for (const line of lines) {
			// Array item
			if (line.match(/^\s+-\s+/) && currentKey) {
				const value = line.replace(/^\s+-\s+/, "").trim();
				if (arrayValues === null) {
					arrayValues = [];
				}
				arrayValues.push(value);
				result[currentKey] = arrayValues;
				continue;
			}

			// Key-value pair
			const kvMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)/);
			if (kvMatch) {
				// Save any pending array
				arrayValues = null;
				currentKey = kvMatch[1];
				const value = kvMatch[2].trim();

				if (value === "") {
					// Could be start of an array or empty value
					result[currentKey] = "";
				} else {
					// Remove surrounding quotes
					result[currentKey] = value.replace(/^["']|["']$/g, "");
				}
			}
		}

		return result;
	}

	private extractMetadata(frontmatter: Record<string, unknown>, file: TFile): DocumentMetadata {
		const title = (frontmatter.title as string) || file.basename;
		const author = (frontmatter.author as string) || this.settings.authorName || "";
		const date = (frontmatter.date as string) || this.formatDate(file.stat.mtime);
		const description = (frontmatter.description as string) || undefined;
		const tags = Array.isArray(frontmatter.tags)
			? (frontmatter.tags as string[])
			: undefined;

		return { title, author, date, description, tags };
	}

	private formatDate(timestamp: number): string {
		const d = new Date(timestamp);
		const months = [
			"January", "February", "March", "April", "May", "June",
			"July", "August", "September", "October", "November", "December",
		];
		return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
	}

	private async renderMarkdown(markdown: string, file: TFile): Promise<string> {
		const container = document.createElement("div");
		const component = new Component();
		component.load();

		try {
			await MarkdownRenderer.render(
				this.app,
				markdown,
				container,
				file.path,
				component
			);
			return container.innerHTML;
		} finally {
			component.unload();
		}
	}

	private async processImages(html: string, file: TFile): Promise<string> {
		const imgRegex = /<img[^>]+src="([^"]*)"[^>]*>/g;
		let result = html;
		const matches = [...html.matchAll(imgRegex)];

		for (const match of matches) {
			const src = match[1];
			if (src.startsWith("data:")) continue; // already base64
			if (src.startsWith("http://") || src.startsWith("https://")) continue; // external

			try {
				const base64 = await this.imageToBase64(src, file);
				if (base64) {
					result = result.replace(match[0], match[0].replace(src, base64));
				}
			} catch {
				// Leave the image as-is if conversion fails
			}
		}

		return result;
	}

	private async imageToBase64(src: string, contextFile: TFile): Promise<string | null> {
		// Decode URI-encoded path
		const decodedSrc = decodeURIComponent(src);

		// Try to resolve the file in the vault
		const imageFile = this.app.metadataCache.getFirstLinkpathDest(
			decodedSrc,
			contextFile.path
		);

		if (!imageFile) return null;

		try {
			const arrayBuffer = await this.app.vault.readBinary(imageFile);
			const uint8Array = new Uint8Array(arrayBuffer);
			let binary = "";
			for (let i = 0; i < uint8Array.length; i++) {
				binary += String.fromCharCode(uint8Array[i]);
			}
			const base64 = window.btoa(binary);
			const ext = imageFile.extension.toLowerCase();
			const mimeType = this.getMimeType(ext);
			return `data:${mimeType};base64,${base64}`;
		} catch {
			return null;
		}
	}

	private getMimeType(ext: string): string {
		const types: Record<string, string> = {
			png: "image/png",
			jpg: "image/jpeg",
			jpeg: "image/jpeg",
			gif: "image/gif",
			svg: "image/svg+xml",
			webp: "image/webp",
			bmp: "image/bmp",
		};
		return types[ext] || "image/png";
	}

	private buildDocumentHeader(metadata: DocumentMetadata): string {
		const parts: string[] = [];
		parts.push('<div class="arcadia-doc-header">');
		parts.push(`  <h1>${escapeHTML(metadata.title)}</h1>`);

		if (metadata.author) {
			parts.push(`  <p class="arcadia-doc-author">${escapeHTML(metadata.author)}</p>`);
		}

		if (metadata.date) {
			parts.push(`  <p class="arcadia-doc-date">${escapeHTML(metadata.date)}</p>`);
		}

		parts.push("</div>");
		return parts.join("\n");
	}

	extractTOC(html: string): TOCEntry[] {
		const entries: TOCEntry[] = [];
		const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h[1-6]>/gi;
		let match;
		let counter = 0;

		while ((match = headingRegex.exec(html)) !== null) {
			const level = parseInt(match[1]);
			const text = match[2].replace(/<[^>]*>/g, "").trim();
			const id = `heading-${counter++}`;
			entries.push({ level, text, id });
		}

		return entries;
	}

	private buildTOC(entries: TOCEntry[]): string {
		const parts: string[] = [];
		parts.push('<div class="arcadia-doc-toc">');
		parts.push("  <h2>Table of Contents</h2>");
		parts.push("  <ul>");

		const minLevel = Math.min(...entries.map((e) => e.level));

		for (const entry of entries) {
			const indent = entry.level - minLevel;
			const padding = "    ".repeat(indent);
			if (indent > 0) {
				parts.push(`${padding}<ul>`);
			}
			parts.push(
				`${padding}<li><a href="#${entry.id}">${escapeHTML(entry.text)}</a></li>`
			);
			if (indent > 0) {
				parts.push(`${padding}</ul>`);
			}
		}

		parts.push("  </ul>");
		parts.push("</div>");
		return parts.join("\n");
	}

	private addHeadingIDs(html: string): string {
		let counter = 0;
		return html.replace(
			/<h([1-6])([^>]*)>/gi,
			(_match, level, attrs) => {
				const id = `heading-${counter++}`;
				// Preserve existing attributes, add id
				if (attrs.includes("id=")) {
					return `<h${level}${attrs}>`;
				}
				return `<h${level} id="${id}"${attrs}>`;
			}
		);
	}
}
