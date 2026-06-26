#!/usr/bin/env python3
"""
Convert old seed SQL files to the new schema.

Run from the same directory as:

  creators.sql
  channels.sql
  creator_channels.sql
  tags.sql

The script writes converted copies to:

  converted-seeds/
    creators.sql
    creator_bios.sql
    channels.sql
    tags_internal.sql
    conversion_report.txt

Original files are never modified.

Important behavior:
  - channels.creator_id is populated from creator_channels.sql.
  - If a channel has multiple creators, the first creator listed for that channel
    in creator_channels.sql is used.
  - If a channel has no creator_channels row, the first creator in creators.sql
    is used as a fallback and the channel is listed in the report.
  - social_platforms.sql and creator_socials.sql are ignored because the current
    schema does not include those tables.
"""

from __future__ import annotations

import sqlite3
from collections import defaultdict
from pathlib import Path
from typing import Iterable

OUTPUT_DIR = Path("converted-seeds")

CREATORS_IN = Path("creators.sql")
CHANNELS_IN = Path("channels.sql")
CREATOR_CHANNELS_IN = Path("creator_channels.sql")
TAGS_IN = Path("tags.sql")

REPORT_LINES: list[str] = []


def read_required_sql(path: Path) -> str:
    if not path.exists():
        raise FileNotFoundError(f"Missing required file: {path}")
    return path.read_text(encoding="utf-8")


def read_optional_sql(path: Path) -> str | None:
    if not path.exists():
        return None
    return path.read_text(encoding="utf-8")


def write_sql(path: Path, lines: Iterable[str]) -> None:
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def sql_literal(value: object) -> str:
    if value is None:
        return "NULL"

    if isinstance(value, int):
        return str(value)

    text = str(value)
    return "'" + text.replace("'", "''") + "'"


def create_old_seed_db() -> sqlite3.Connection:
    """
    Build an in-memory database shaped like the old seed files.

    This lets SQLite parse your existing INSERT statements, including escaped
    quotes and calls like replace(...), instead of doing fragile manual parsing.
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

        CREATE TABLE creator_channels (
            creator_id INTEGER NOT NULL,
            channel_id INTEGER NOT NULL
        );

        CREATE TABLE tags (
            name TEXT PRIMARY KEY
        );
        """
    )

    return conn


def load_old_seed_files(conn: sqlite3.Connection) -> None:
    conn.executescript(read_required_sql(CREATORS_IN))
    conn.executescript(read_required_sql(CHANNELS_IN))
    conn.executescript(read_required_sql(CREATOR_CHANNELS_IN))

    tags_sql = read_optional_sql(TAGS_IN)
    if tags_sql is not None:
        conn.executescript(tags_sql)
    else:
        REPORT_LINES.append("tags.sql not found; wrote an empty tags_internal.sql.")


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


def get_channel_creator_map(conn: sqlite3.Connection) -> dict[int, int]:
    """
    Returns {channel_id: first_creator_id_for_that_channel}.

    First means insertion order in creator_channels.sql, represented by rowid.
    """
    rows = conn.execute(
        """
        SELECT rowid, creator_id, channel_id
        FROM creator_channels
        ORDER BY rowid ASC
        """
    ).fetchall()

    creator_ids_by_channel: dict[int, list[int]] = defaultdict(list)

    for _, creator_id, channel_id in rows:
        creator_ids_by_channel[int(channel_id)].append(int(creator_id))

    channel_creator_map: dict[int, int] = {}

    for channel_id, creator_ids in creator_ids_by_channel.items():
        channel_creator_map[channel_id] = creator_ids[0]

        if len(creator_ids) > 1:
            REPORT_LINES.append(
                f"Channel {channel_id} had multiple creators {creator_ids}; "
                f"used first creator_id {creator_ids[0]}."
            )

    return channel_creator_map


def warn_about_bad_creator_refs(conn: sqlite3.Connection) -> None:
    bad_refs = conn.execute(
        """
        SELECT DISTINCT cc.creator_id
        FROM creator_channels cc
        LEFT JOIN creators c ON c.id = cc.creator_id
        WHERE c.id IS NULL
        ORDER BY cc.creator_id
        """
    ).fetchall()

    for (creator_id,) in bad_refs:
        REPORT_LINES.append(
            f"creator_channels.sql references missing creator_id {creator_id}."
        )


def convert_creators(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute(
        """
        SELECT id, name, description, occupation, education
        FROM creators
        ORDER BY id
        """
    ).fetchall()

    output = [
        "-- Converted from creators.sql",
        "-- Matches the new creators table.",
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

    output = [
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


def convert_channels(
    conn: sqlite3.Connection,
    channel_creator_map: dict[int, int],
    fallback_creator_id: int,
) -> list[str]:
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

    output = [
        "-- Converted from channels.sql",
        "-- channels.creator_id comes from creator_channels.sql.",
        "-- If a channel had multiple creators, the first listed creator was used.",
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

        creator_id = channel_creator_map.get(int(channel_id))

        if creator_id is None:
            creator_id = fallback_creator_id
            REPORT_LINES.append(
                f"Channel {channel_id} had no creator_channels row; "
                f"used fallback first creator_id {fallback_creator_id}."
            )

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
    output = [
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


def write_report() -> None:
    ignored_files = [
        "social_platforms.sql",
        "creator_socials.sql",
    ]

    report = [
        "Seed conversion report",
        "======================",
        "",
        *REPORT_LINES,
        "",
        "Ignored old-schema files:",
        *[
            f"- {name}: ignored because the current schema does not include that table"
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

    (OUTPUT_DIR / "conversion_report.txt").write_text(
        "\n".join(report).rstrip() + "\n",
        encoding="utf-8",
    )


def main() -> None:
    OUTPUT_DIR.mkdir(exist_ok=True)

    conn = create_old_seed_db()
    load_old_seed_files(conn)

    fallback_creator_id = get_first_creator_id(conn)
    channel_creator_map = get_channel_creator_map(conn)
    warn_about_bad_creator_refs(conn)

    write_sql(OUTPUT_DIR / "creators.sql", convert_creators(conn))
    write_sql(OUTPUT_DIR / "creator_bios.sql", convert_creator_bios(conn))
    write_sql(
        OUTPUT_DIR / "channels.sql",
        convert_channels(conn, channel_creator_map, fallback_creator_id),
    )
    write_sql(OUTPUT_DIR / "tags_internal.sql", convert_tags(conn))
    write_report()

    print(f"Converted seed files written to: {OUTPUT_DIR.resolve()}")
    print("Used creator_channels.sql to populate channels.creator_id.")
    print("For channels with multiple creators, used the first creator listed for that channel.")
    print(f"Fallback creator_id for unmapped channels: {fallback_creator_id}")


if __name__ == "__main__":
    main()
