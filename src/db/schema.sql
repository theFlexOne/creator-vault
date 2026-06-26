DROP TABLE IF EXISTS channel_tags_internal;
DROP TABLE IF EXISTS creator_tags_internal;
DROP TABLE IF EXISTS transcripts;
DROP TABLE IF EXISTS videos;
DROP TABLE IF EXISTS creator_bios;
DROP TABLE IF EXISTS channels;
DROP TABLE IF EXISTS creators;
DROP TABLE IF EXISTS tags_internal;
CREATE TABLE tags_internal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);
CREATE TABLE creators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    occupation TEXT,
    education TEXT
);
CREATE TABLE creator_bios (
    creator_id INTEGER PRIMARY KEY,
    bio TEXT NOT NULL DEFAULT '',
    occupation TEXT NOT NULL DEFAULT '',
    education TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (creator_id) REFERENCES creators (id) ON DELETE CASCADE
);
CREATE TABLE channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    youtube_channel_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    handle TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    followers INTEGER NOT NULL DEFAULT 0,
    source_tags TEXT NOT NULL DEFAULT '[]',
    url TEXT UNIQUE NOT NULL,
    creator_id INTEGER NOT NULL,
    FOREIGN KEY (creator_id) REFERENCES creators (id) ON DELETE CASCADE,
    CHECK (
        json_valid(source_tags)
        AND json_type(source_tags) = 'array'
    )
);
CREATE TABLE videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    youtube_video_id TEXT UNIQUE NOT NULL,
    channel_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    duration INTEGER NOT NULL DEFAULT 0,
    upload_date TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    categories TEXT NOT NULL DEFAULT '[]',
    source_tags TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE,
    CHECK (
        json_valid(categories)
        AND json_type(categories) = 'array'
    ),
    CHECK (
        json_valid(source_tags)
        AND json_type(source_tags) = 'array'
    )
);
CREATE TABLE transcripts (
    video_id INTEGER PRIMARY KEY,
    text TEXT NOT NULL,
    FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
);
CREATE TABLE creator_tags_internal (
    creator_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (creator_id, tag_id),
    FOREIGN KEY (creator_id) REFERENCES creators (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags_internal (id) ON DELETE CASCADE
);
CREATE TABLE channel_tags_internal (
    channel_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (channel_id, tag_id),
    FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags_internal (id) ON DELETE CASCADE
);