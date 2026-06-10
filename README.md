# Arcadia Publisher

![Arcadia Publisher](docs/screenshot.png)

Arcadia Publisher turns any note into a polished, shareable document. Export the active note to PDF or HTML with print-ready typography, embedded images, an optional table of contents, and a frontmatter title block, all from the ribbon or the command palette. Exports are self-contained: images are embedded directly in the output, so the file you send is the file people see.

![Version](https://img.shields.io/badge/version-1.0.6-blue)
![Obsidian](https://img.shields.io/badge/Obsidian-1.3.6+-purple)
![License](https://img.shields.io/badge/license-MIT-green)

> Desktop only. PDF rendering uses the desktop app's built-in print engine.

## Features

- PDF export of the active note
- HTML export (single self-contained file)
- Embedded images (markdown and wiki-style embeds)
- Frontmatter title block (title, author, date)
- Table of contents with working anchor links
- Page size (Letter or A4) and font options
- Export modal, ribbon icon, and commands

The plugin is free, with no account, no license key, and no time limit.

## Installation

The Community Plugins listing is pending review. Until it is approved, install with one of these methods:

### Manual install (GitHub releases)

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release on [GitHub Releases](https://github.com/Arcadia-Studio/obsidian-arcadia-publisher/releases)
2. Create the folder `.obsidian/plugins/arcadia-publisher/` inside your vault and copy the three files into it
3. Reload Obsidian, then enable Arcadia Publisher under Settings > Community plugins

### BRAT

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin from Community Plugins
2. In BRAT, choose "Add a beta plugin" and enter `Arcadia-Studio/obsidian-arcadia-publisher`
3. Enable Arcadia Publisher under Settings > Community plugins

## Quick start

1. Open the note you want to publish
2. Click the export ribbon icon (file-output), or run "Export current note..." from the command palette
3. Pick PDF or HTML and click Export
4. The finished file lands in your output folder (default: `exports/` in your vault)

Direct commands skip the modal and use your current settings:

- **Export current note to PDF**
- **Export current note to HTML**

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| Output directory | `exports` | Vault-relative folder for exported files. Created automatically if missing. |
| Default export format | PDF | Format used by the ribbon icon and quick commands. |
| Author name | (empty) | Shown in the document header when the note has no `author` frontmatter field. |
| Include frontmatter header | On | Adds a title block with title, author, and date to the top of the document. |
| Include table of contents | Off | Generates a linked table of contents from the note's headings. |
| Page size | Letter | Letter (8.5 x 11 in) or A4 (210 x 297 mm), used for PDF export. |
| Font family | Serif | Serif (Georgia), sans-serif (system UI), or monospace (Consolas). |

Frontmatter fields `title`, `author`, and `date` override the filename, the author setting, and the file's modified date in the exported header.

The plugin makes no network requests and collects no telemetry.

## Support

Questions, bug reports, and feature requests: [arcadiastudio77@gmail.com](mailto:arcadiastudio77@gmail.com), or open an issue on [GitHub](https://github.com/Arcadia-Studio/obsidian-arcadia-publisher/issues).

## License

The plugin code is MIT licensed. See [LICENSE](LICENSE).

## About Arcadia Studio

Arcadia Studio builds productivity tools for Obsidian users.
