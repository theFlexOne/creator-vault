# Evangelical Tracker (et) CLI Guide

The `et` CLI is a modular tool designed to ingest, clean, and store YouTube data (channels, videos, and transcripts) into a local SQLite database.

## Installation

To make the `et` command available globally on your system:

1. Build the project: `npm run build`
2. Link the package: `sudo npm link`

---

## Command Overview

### 1. Ingest Commands

The project is moving toward `ingest` as the public workflow language. These commands currently preserve the existing behavior while the deeper ingest architecture is introduced.

**`et ingest-channel-profile <inputs..> [--save]`**

- Ingests YouTube channel profile data.
- **Input Formats**: Accepts full URLs, Channel IDs, handles, or file input.

**`et ingest-channel-videos <channels..> [--limit <number>] [--save] [--batch <number>]`**

- Ingests video metadata for channels already in the DB.
- TODO: A later implementation will make this command ingest channel profile data, video metadata, and transcripts together.

**`et ingest-transcripts <channels..> [--limit <number>] [--save]`**

- Ingests transcripts for videos already stored in the DB.
- TODO: A later implementation will replace the current transcript storage path with json3 transcript versions and segments.

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
2. **Rate Limiting**: Transcript ingestion should be paced to reduce the chance of being blocked by YouTube.
3. **Internal IDs**: You can use either the YouTube Handle (e.g., `@alisachilders`) or the YouTube Channel ID (e.g., `UCskQ...`) as the identifier for video and transcript commands.
4. **File Input**: For large lists, create a `channels.txt` (one URL per line) and run `et ingest-channel-profile channels.txt --save` or `et ingest-channel-videos channels.txt --save` depending on which step of the pipeline you need.
