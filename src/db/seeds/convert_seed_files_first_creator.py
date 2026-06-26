#!/usr/bin/env python3
"""
Convert old seed SQL files to the newer schema.

Run this script from the same directory as the seed files.

Expected input filenames:
  creators.sql
  channels.sql
  tags.sql

Optional old-schema files, intentionally ignored:
  creator_channels.sql
  social_platforms.sql
  creator_socials.sql

Output:
  converted-seeds/
    creators.sql
    creator_bios.sql
    channels.sql
    tags_internal.sql
    conversion_report.txt

Important behavior:
  - Original files are never modified.
  - The first creator in creators.sql is used as the only creator for every channel.
  - creator_channels.sql is ignored because the new schema stores creator ownership
    directly on channels.creator_id.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Iterable

OUTPUT_DIR = Path("converted-seeds")

CREATORS_IN = Path("creators.sql")
CHANNELS_IN = Path("channels.sql")
TAGS_IN = Path("tags.sql")

REPORT_LINES: list[str] = []


def read_sql(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Missing required file: {path}")

    return path.read_text(encoding="utf-8")


def write_sql(path: Path, rows: Iterable[str]) -> None:
    path.write_text("\n".join(rows).rstrip() + "\n", encoding="utf-8")


def sql_literal(value: object) -> str:
    if value is None:
        return "NULL"

    if isinstance(value, int):
        return str(value)

    text = str(value)
    return "'" + text.replace("'", "''") + "'"


def create_old_db() -> sqlite3.Connection:
    """
    Create a temporary in-memory DB matching the old seed-file shapes.

    This lets SQLite parse INSERT statements safely instead of manually parsing
    SQL value lists.
    """
    conn = sqlite3.connect(":memory:")

    conn.executescript(
        """
        CREATE TABLE creators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            occupation TEXT,
            education TEXT
        );

        CREATE TABLE channels (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            youtube_channel_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            handle TEXT UNIQUE NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            followers INTEGER NOT NULL DEFAULT 0,
            source_tags TEXT NOT NULL DEFAULT '[]',
            url TEXT UNIQUE NOT NULL
        );

        CREATE TABLE tags (
            name TEXT PRIMARY KEY
        );
        """
    )

    return conn


def load_old_seeds(conn: sqlite3.Connection) -> None:
    conn.executescript(read_sql(CREATORS_IN))
    conn.executescript(read_sql(CHANNELS_IN))

    if TAGS_IN.exists():
        conn.executescript(read_sql(TAGS_IN))
    else:
        REPORT_LINES.append("tags.sql not found; wrote an empty tags_internal.sql file.")


def get_first_creator_id(conn: sqlite3.Connection) -> int:
    row = conn.execute(
        """
        SELECT id
        FROM creators
        ORDER BY id ASC
        LIMIT 1
        """
    ).fetchone()

    if row is None:
        raise ValueError("creators.sql did not insert any creators.")

    return int(row[0])


def convert_creators(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute(
        """
        SELECT id, name, description, occupation, education
        FROM creators
        ORDER BY id
        """
    ).fetchall()

    output: list[str] = [
        "-- Converted from creators.sql",
        "-- Matches new creators table.",
        "",
    ]

    for creator_id, name, description, occupation, education in rows:
        output.append(
            "INSERT INTO creators (id, name, description, occupation, education) "
            f"VALUES ({sql_literal(creator_id)}, {sql_literal(name)}, "
            f"{sql_literal(description)}, {sql_literal(occupation)}, {sql_literal(education)});"
        )

    return output


def convert_creator_bios(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute(
        """
        SELECT id, description, occupation, education
        FROM creators
        ORDER BY id
        """
    ).fetchall()

    output: list[str] = [
        "-- Generated from creators.sql",
        "-- Uses creators.description as creator_bios.bio.",
        "",
    ]

    for creator_id, description, occupation, education in rows:
        output.append(
            "INSERT INTO creator_bios (creator_id, bio, occupation, education) "
            f"VALUES ({sql_literal(creator_id)}, {sql_literal(description or '')}, "
            f"{sql_literal(occupation or '')}, {sql_literal(education or '')});"
        )

    return output


def convert_channels(conn: sqlite3.Connection, creator_id: int) -> list[str]:
    rows = conn.execute(
        """
        SELECT
            id,
            youtube_channel_id,
            name,
            handle,
            description,
            followers,
            source_tags,
            url
        FROM channels
        ORDER BY id
        """
    ).fetchall()

    output: list[str] = [
        "-- Converted from channels.sql",
        f"-- Every channel uses the first creator from creators.sql: creator_id = {creator_id}",
        "-- creator_channels.sql is intentionally ignored.",
        "",
    ]

    for row in rows:
        (
            channel_id,
            youtube_channel_id,
            name,
            handle,
            description,
            followers,
            source_tags,
            url,
        ) = row

        output.append(
            "INSERT INTO channels ("
            "id, youtube_channel_id, name, handle, description, followers, source_tags, url, creator_id"
            ") VALUES ("
            f"{sql_literal(channel_id)}, "
            f"{sql_literal(youtube_channel_id)}, "
            f"{sql_literal(name)}, "
            f"{sql_literal(handle)}, "
            f"{sql_literal(description)}, "
            f"{sql_literal(followers)}, "
            f"{sql_literal(source_tags)}, "
            f"{sql_literal(url)}, "
            f"{sql_literal(creator_id)}"
            ");"
        )

    return output


def convert_tags(conn: sqlite3.Connection) -> list[str]:
    output: list[str] = [
        "-- Converted from tags.sql",
        "-- Old tags table became tags_internal.",
        "",
    ]

    rows = conn.execute(
        """
        SELECT name
        FROM tags
        ORDER BY name
        """
    ).fetchall()

    for (name,) in rows:
        output.append(
            "INSERT INTO tags_internal (name) "
            f"VALUES ({sql_literal(name)});"
        )

    return output


def write_report(first_creator_id: int) -> None:
    ignored_files = [
        "creator_channels.sql",
        "social_platforms.sql",
        "creator_socials.sql",
    ]

    REPORT_LINES.extend(
        [
            f"Used first creator as only creator for every channel: creator_id = {first_creator_id}",
            "",
            "Ignored old-schema files:",
            *[
                f"- {name}: ignored"
                for name in ignored_files
                if Path(name).exists()
            ],
            "",
            "Written files:",
            "- creators.sql",
            "- creator_bios.sql",
            "- channels.sql",
            "- tags_internal.sql",
        ]
    )

    (OUTPUT_DIR / "conversion_report.txt").write_text(
        "\n".join(REPORT_LINES).rstrip() + "\n",
        encoding="utf-8",
    )


def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)

    conn = create_old_db()
    load_old_seeds(conn)

    first_creator_id = get_first_creator_id(conn)

    write_sql(OUTPUT_DIR / "creators.sql", convert_creators(conn))
    write_sql(OUTPUT_DIR / "creator_bios.sql", convert_creator_bios(conn))
    write_sql(OUTPUT_DIR / "channels.sql", convert_channels(conn, first_creator_id))
    write_sql(OUTPUT_DIR / "tags_internal.sql", convert_tags(conn))
    write_report(first_creator_id)

    print(f"Converted seed files written to: {OUTPUT_DIR.resolve()}")
    print(f"Used first creator as only creator for every channel: creator_id = {first_creator_id}")


if __name__ == "__main__":
    main()
