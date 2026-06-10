import { TFile } from "obsidian";

export interface ArcadiaPublisherSettings {
	outputDir: string;
	defaultFormat: "pdf" | "html";
	authorName: string;
	includeFrontmatter: boolean;
	includeTOC: boolean;
	pageSize: "letter" | "a4";
	fontFamily: "serif" | "sans" | "mono";
}

export const DEFAULT_SETTINGS: ArcadiaPublisherSettings = {
	outputDir: "exports",
	defaultFormat: "pdf",
	authorName: "",
	includeFrontmatter: true,
	includeTOC: false,
	pageSize: "letter",
	fontFamily: "serif",
};

export interface ExportOptions {
	format: "pdf" | "html";
	file: TFile;
	settings: ArcadiaPublisherSettings;
}

export interface ExportResult {
	success: boolean;
	outputPath?: string;
	error?: string;
}

export interface DocumentMetadata {
	title: string;
	author: string;
	date: string;
	description?: string;
	tags?: string[];
}

export interface TOCEntry {
	level: number;
	text: string;
	id: string;
}
