import { App, Component, FileSystemAdapter, MarkdownRenderer, TFile, normalizePath } from "obsidian";
import { ArcadiaPublisherSettings, DocumentMetadata, TOCEntry } from "./types";
import { escapeHTML } from "./templates";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "avif"];

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

		// Render markdown to a detached container using Obsidian's renderer.
		// The component stays loaded until the HTML has been serialized so
		// renderer children are not torn down early.
		const container = document.createElement("div");
		const component = new Component();
		component.load();

		try {
			await MarkdownRenderer.render(
				this.app,
				body,
				container,
				file.path,
				component
			);

			// Embed local images as base64 so the export is self-contained
			await this.embedImages(container, file);

			// Assign heading IDs and collect TOC entries from the same pass
			// so anchors always match their targets
			const tocEntries = this.assignHeadingIDs(container);

			const parts: string[] = [];

			// Document header from frontmatter
			if (this.settings.includeFrontmatter) {
				parts.push(this.buildDocumentHeader(metadata));
			}

			// Table of contents
			if (this.settings.includeTOC && tocEntries.length > 0) {
				parts.push(this.buildTOC(tocEntries));
			}

			parts.push(`<div class="arcadia-doc-content">${container.innerHTML}</div>`);

			return parts.join("\n");
		} finally {
			component.unload();
		}
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

	/**
	 * Embed local images as base64 data URIs. Handles both markdown-style
	 * images (rendered as <img>) and wiki-style embeds (![[image.png]]),
	 * which the renderer leaves as internal-embed spans when the container
	 * is not attached to the live DOM.
	 */
	private async embedImages(container: HTMLElement, contextFile: TFile): Promise<void> {
		const images = Array.from(container.querySelectorAll("img"));
		for (const img of images) {
			const src = img.getAttribute("src");
			if (!src || src.startsWith("data:")) continue;
			if (src.startsWith("http://") || src.startsWith("https://")) continue;

			const dataUri = await this.imageToBase64(src, contextFile);
			if (dataUri) {
				img.setAttribute("src", dataUri);
			}
		}

		const embeds = Array.from(
			container.querySelectorAll("span.internal-embed")
		);
		for (const embed of embeds) {
			if (embed.querySelector("img")) continue; // already processed above
			const src = embed.getAttribute("src");
			if (!src) continue;

			const dataUri = await this.imageToBase64(src, contextFile);
			if (!dataUri) continue; // not an image embed, leave as-is

			const img = document.createElement("img");
			img.setAttribute("src", dataUri);
			img.setAttribute("alt", embed.getAttribute("alt") || src);
			embed.replaceWith(img);
		}
	}

	private async imageToBase64(src: string, contextFile: TFile): Promise<string | null> {
		const imageFile = this.resolveImageFile(src, contextFile);
		if (!imageFile) return null;

		const ext = imageFile.extension.toLowerCase();
		if (!IMAGE_EXTENSIONS.includes(ext)) return null;

		try {
			const arrayBuffer = await this.app.vault.readBinary(imageFile);
			const bytes = new Uint8Array(arrayBuffer);
			let binary = "";
			const chunkSize = 0x8000;
			for (let i = 0; i < bytes.length; i += chunkSize) {
				const chunk = bytes.subarray(i, i + chunkSize);
				binary += String.fromCharCode(...Array.from(chunk));
			}
			const base64 = window.btoa(binary);
			const mimeType = this.getMimeType(ext);
			return `data:${mimeType};base64,${base64}`;
		} catch {
			return null;
		}
	}

	private resolveImageFile(src: string, contextFile: TFile): TFile | null {
		// Resource URLs (app://...) point at absolute paths on disk;
		// map them back to vault-relative paths
		if (src.startsWith("app://")) {
			const rel = this.vaultPathFromResourceUrl(src);
			if (!rel) return null;
			const file = this.app.vault.getAbstractFileByPath(rel);
			return file instanceof TFile ? file : null;
		}

		let decoded = src;
		try {
			decoded = decodeURIComponent(src);
		} catch {
			// Keep the raw value if it is not valid percent-encoding
		}

		const dest = this.app.metadataCache.getFirstLinkpathDest(
			decoded,
			contextFile.path
		);
		if (dest) return dest;

		const byPath = this.app.vault.getAbstractFileByPath(normalizePath(decoded));
		return byPath instanceof TFile ? byPath : null;
	}

	private vaultPathFromResourceUrl(src: string): string | null {
		try {
			const url = new URL(src);
			let full = decodeURIComponent(url.pathname).replace(/\\/g, "/");
			if (full.startsWith("/")) full = full.slice(1);

			const adapter = this.app.vault.adapter;
			if (adapter instanceof FileSystemAdapter) {
				const base = adapter.getBasePath().replace(/\\/g, "/").replace(/\/$/, "");
				if (full.toLowerCase().startsWith(`${base.toLowerCase()}/`)) {
					return normalizePath(full.slice(base.length + 1));
				}
			}
			return null;
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
			avif: "image/avif",
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

	/**
	 * Assign an id to every heading that lacks one and collect TOC entries.
	 * Entries always reference the actual id on the heading, so TOC links
	 * cannot drift out of sync with their targets.
	 */
	private assignHeadingIDs(container: HTMLElement): TOCEntry[] {
		const entries: TOCEntry[] = [];
		const headings = Array.from(
			container.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6")
		);
		let counter = 0;

		for (const heading of headings) {
			const level = parseInt(heading.tagName.slice(1), 10);
			const text = (heading.textContent || "").trim();
			let id = heading.getAttribute("id");
			if (!id) {
				id = `heading-${counter++}`;
				heading.setAttribute("id", id);
			}
			entries.push({ level, text, id });
		}

		return entries;
	}

	private buildTOC(entries: TOCEntry[]): string {
		const minLevel = Math.min(...entries.map((e) => e.level));
		const parts: string[] = [];
		parts.push('<div class="arcadia-doc-toc">');
		parts.push("  <h2>Table of contents</h2>");

		// Build a properly nested list. Level jumps are clamped to one step
		// at a time so the markup stays valid.
		let html = "";
		let prev = 0;
		for (const entry of entries) {
			const level = Math.min(entry.level - minLevel + 1, prev + 1);
			if (prev === 0) {
				html += "<ul>";
			} else if (level > prev) {
				html += "<ul>";
			} else {
				html += "</li>";
				for (let i = level; i < prev; i++) {
					html += "</ul></li>";
				}
			}
			html += `<li><a href="#${entry.id}">${escapeHTML(entry.text)}</a>`;
			prev = level;
		}
		html += "</li>";
		for (let i = 1; i < prev; i++) {
			html += "</ul></li>";
		}
		html += "</ul>";

		parts.push(`  ${html}`);
		parts.push("</div>");
		return parts.join("\n");
	}
}
