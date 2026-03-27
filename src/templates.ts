import { ArcadiaPublisherSettings } from "./types";

const FONT_STACKS: Record<string, string> = {
	serif: 'Georgia, "Times New Roman", Times, serif',
	sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
	mono: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
};

export function getDocumentCSS(settings: ArcadiaPublisherSettings): string {
	const fontStack = FONT_STACKS[settings.fontFamily] || FONT_STACKS.serif;
	const pageSize = settings.pageSize === "a4" ? "A4" : "letter";

	return `
/* Arcadia Publisher Document Styles */
@page {
	size: ${pageSize};
	margin: 1in;
}

@media print {
	body {
		margin: 0;
		padding: 0;
	}
	.arcadia-doc-toc {
		page-break-after: always;
	}
	h1, h2, h3, h4, h5, h6 {
		page-break-after: avoid;
	}
	pre, table, figure, blockquote {
		page-break-inside: avoid;
	}
	img {
		max-width: 100%;
		page-break-inside: avoid;
	}
}

* {
	box-sizing: border-box;
}

html {
	font-size: 16px;
}

body {
	font-family: ${fontStack};
	line-height: 1.7;
	color: #1a1a1a;
	max-width: 42em;
	margin: 0 auto;
	padding: 2rem 1rem;
	background: #fff;
}

/* Document Header */
.arcadia-doc-header {
	text-align: center;
	margin-bottom: 2.5rem;
	padding-bottom: 1.5rem;
	border-bottom: 1px solid #ddd;
}

.arcadia-doc-header h1 {
	font-size: 2rem;
	margin: 0 0 0.5rem 0;
	border-bottom: none;
	padding-bottom: 0;
}

.arcadia-doc-header .arcadia-doc-author {
	font-size: 1.1rem;
	color: #555;
	margin: 0.25rem 0;
}

.arcadia-doc-header .arcadia-doc-date {
	font-size: 0.95rem;
	color: #777;
	margin: 0.25rem 0;
}

/* Table of Contents */
.arcadia-doc-toc {
	margin: 1.5rem 0 2.5rem 0;
	padding: 1.25rem 1.5rem;
	background: #f8f8f8;
	border: 1px solid #e0e0e0;
	border-radius: 4px;
}

.arcadia-doc-toc h2 {
	font-size: 1.2rem;
	margin: 0 0 0.75rem 0;
	border-bottom: none;
	padding-bottom: 0;
}

.arcadia-doc-toc ul {
	list-style: none;
	padding-left: 0;
	margin: 0;
}

.arcadia-doc-toc ul ul {
	padding-left: 1.25rem;
}

.arcadia-doc-toc li {
	margin: 0.3rem 0;
}

.arcadia-doc-toc a {
	color: #333;
	text-decoration: none;
}

.arcadia-doc-toc a:hover {
	text-decoration: underline;
}

/* Headings */
h1, h2, h3, h4, h5, h6 {
	margin-top: 1.5em;
	margin-bottom: 0.5em;
	font-weight: 600;
	line-height: 1.3;
}

h1 {
	font-size: 1.8rem;
	border-bottom: 1px solid #e0e0e0;
	padding-bottom: 0.3rem;
}

h2 {
	font-size: 1.5rem;
	border-bottom: 1px solid #eee;
	padding-bottom: 0.2rem;
}

h3 { font-size: 1.25rem; }
h4 { font-size: 1.1rem; }
h5 { font-size: 1rem; }
h6 { font-size: 0.95rem; color: #555; }

/* Paragraphs */
p {
	margin: 0.75em 0;
}

/* Links */
a {
	color: #2563eb;
	text-decoration: none;
}

a:hover {
	text-decoration: underline;
}

/* Lists */
ul, ol {
	padding-left: 1.5em;
	margin: 0.75em 0;
}

li {
	margin: 0.25em 0;
}

li > ul, li > ol {
	margin: 0.15em 0;
}

/* Blockquotes */
blockquote {
	margin: 1em 0;
	padding: 0.5em 1em;
	border-left: 4px solid #d0d0d0;
	background: #f9f9f9;
	color: #444;
}

blockquote p {
	margin: 0.4em 0;
}

blockquote blockquote {
	border-left-color: #bbb;
}

/* Code */
code {
	font-family: ${FONT_STACKS.mono};
	font-size: 0.9em;
	background: #f3f3f3;
	padding: 0.15em 0.35em;
	border-radius: 3px;
}

pre {
	margin: 1em 0;
	padding: 1em;
	background: #f5f5f5;
	border: 1px solid #e0e0e0;
	border-radius: 4px;
	overflow-x: auto;
	line-height: 1.5;
}

pre code {
	background: none;
	padding: 0;
	border-radius: 0;
	font-size: 0.85em;
}

/* Tables */
table {
	width: 100%;
	border-collapse: collapse;
	margin: 1em 0;
	font-size: 0.95em;
}

thead {
	background: #f5f5f5;
}

th, td {
	border: 1px solid #ddd;
	padding: 0.5em 0.75em;
	text-align: left;
}

th {
	font-weight: 600;
}

tr:nth-child(even) {
	background: #fafafa;
}

/* Horizontal Rule */
hr {
	border: none;
	border-top: 1px solid #ddd;
	margin: 2em 0;
}

/* Images */
img {
	max-width: 100%;
	height: auto;
	display: block;
	margin: 1em auto;
}

/* Footnotes */
.footnotes {
	margin-top: 2rem;
	padding-top: 1rem;
	border-top: 1px solid #ddd;
	font-size: 0.9em;
}

.footnotes ol {
	padding-left: 1.25em;
}

.footnotes li {
	margin: 0.5em 0;
}

/* Task Lists */
ul.contains-task-list {
	list-style: none;
	padding-left: 0.5em;
}

.task-list-item {
	display: flex;
	align-items: baseline;
	gap: 0.5em;
}

.task-list-item input[type="checkbox"] {
	margin: 0;
}

/* Callouts (simplified for export) */
.callout {
	margin: 1em 0;
	padding: 0.75em 1em;
	border-left: 4px solid #5090d0;
	background: #f0f5fa;
	border-radius: 0 4px 4px 0;
}

.callout-title {
	font-weight: 600;
	margin-bottom: 0.25em;
}

/* Definition Lists */
dt {
	font-weight: 600;
	margin-top: 0.75em;
}

dd {
	margin-left: 1.5em;
	margin-bottom: 0.5em;
}

/* Math (basic styling if KaTeX renders) */
.math {
	overflow-x: auto;
}

/* Emphasis */
strong { font-weight: 700; }
em { font-style: italic; }
mark {
	background: #fff3b0;
	padding: 0.1em 0.2em;
}

del {
	text-decoration: line-through;
	color: #888;
}
`.trim();
}

export function getHTMLTemplate(
	title: string,
	css: string,
	bodyContent: string
): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<meta name="generator" content="Arcadia Publisher">
	<title>${escapeHTML(title)}</title>
	<style>
${css}
	</style>
</head>
<body>
${bodyContent}
</body>
</html>`;
}

export function escapeHTML(str: string): string {
	return str
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
