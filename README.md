# Evangelical Tracker (et) CLI Guide

The `et` CLI is a modular tool designed to fetch, clean, and store YouTube data (channels, videos, and transcripts) into a local SQLite database.

## Installation

To make the `et` command available globally on your system:

1. Build the project: `npm run build`
2. Link the package: `sudo npm link`

---

## Command Overview

### 1. Modular Fetching

These commands allow you to perform specific steps of the pipeline. They do **not** save to the database unless the `--save` (or `-s`) flag is provided.

**`et fetch-channels <urls..> [--save] [--bulk] [--json]`**

- Fetches name, handle, and YouTube ID.
- **Input Formats**: Accepts full URLs, Channel IDs, or handles.
- **Piping**: Use `--json` (or `-j`) to output raw data to stdout for tools like `jq`.
- **Example**: `et fetch-channels @handle1 --json | jq '.'`

**`et fetch-videos <channels..> [--limit <number>] [--save] [--bulk]`**

- Fetches video metadata (title, duration, view count) for channels already in the DB.

**`et fetch-transcripts <channels..> [--limit <number>] [--save] [--bulk]`**

- Identifies videos in the DB missing transcripts and fetches them using `yt-dlp`.

---

### 2. Diagnostics

**`et test-connection`**

- Verifies that the SQLite database is connected and `yt-dlp` is correctly installed and accessible.

---

## Database Management

To reset your database or apply schema changes:
`npm run db:migrate`

_Note: This will wipe all existing data and re-seed from the JSON files in the `docs/` folder._

---

## Pro-Tips

1. **Filtering**: The tool automatically skips "Premieres" because they do not have transcript files available until they air.
2. **Rate Limiting**: When fetching transcripts, the tool adds a 2-second delay between videos to prevent being blocked by YouTube.
3. **Internal IDs**: You can use either the YouTube Handle (e.g., `@alisachilders`) or the YouTube Channel ID (e.g., `UCskQ...`) as the identifier for video and transcript commands.
4. **File Input**: For large lists, create a `channels.txt` (one URL per line) and run `et fetch-channels channels.txt --save` or `et fetch-videos channels.txt --save` depending on which step of the pipeline you need.
