DROP TABLE IF EXISTS transcripts;
DROP TABLE IF EXISTS videos;
DROP TABLE IF EXISTS channel_tags;
DROP TABLE IF EXISTS creator_tags;
DROP TABLE IF EXISTS creator_socials;
DROP TABLE IF EXISTS creator_channels;
DROP TABLE IF EXISTS channels;
DROP TABLE IF EXISTS creators;
DROP TABLE IF EXISTS social_platforms;
DROP TABLE IF EXISTS tags;
-- "tags" are interal tags and not associated with the youtube video tags
CREATE TABLE tags (name TEXT PRIMARY KEY);
CREATE TABLE social_platforms (name TEXT PRIMARY KEY);
CREATE TABLE creators (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    occupation TEXT,
    education TEXT
);
CREATE TABLE channels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    youtube_channel_id TEXT UNIQUE,
    name TEXT NOT NULL,
    handle TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    followers INTEGER NOT NULL DEFAULT 0,
    tags TEXT NOT NULL DEFAULT '[]',
    url TEXT UNIQUE NOT NULL
);
CREATE TABLE videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    youtube_video_id TEXT UNIQUE NOT NULL,
    channel_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    duration INTEGER NOT NULL DEFAULT 0,
    upload_date TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    categories TEXT NOT NULL DEFAULT '[]',
    tags TEXT NOT NULL DEFAULT '[]',
    transcript TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE
);
-- don't auto-increment transcripts.video_id since it should match videos.id. Instead, set it explicitly when inserting/updating transcripts. 
CREATE TABLE transcripts (
    video_id INTEGER PRIMARY KEY,
    text TEXT NOT NULL,
    FOREIGN KEY (video_id) REFERENCES videos (id) ON DELETE CASCADE
);
CREATE TABLE creator_socials (
    creator_id INTEGER NOT NULL,
    platform TEXT NOT NULL,
    url TEXT,
    handle TEXT,
    PRIMARY KEY (creator_id, platform),
    FOREIGN KEY (creator_id) REFERENCES creators (id) ON DELETE CASCADE,
    FOREIGN KEY (platform) REFERENCES social_platforms (name) ON DELETE CASCADE
);
CREATE TABLE creator_channels (
    creator_id INTEGER NOT NULL,
    channel_id INTEGER NOT NULL,
    PRIMARY KEY (creator_id, channel_id),
    FOREIGN KEY (creator_id) REFERENCES creators (id) ON DELETE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE
);
CREATE TABLE creator_tags (
    creator_id INTEGER NOT NULL,
    tag_name TEXT NOT NULL,
    PRIMARY KEY (creator_id, tag_name),
    FOREIGN KEY (creator_id) REFERENCES creators (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_name) REFERENCES tags (name) ON DELETE CASCADE
);
CREATE TABLE channel_tags (
    channel_id INTEGER NOT NULL,
    tag_name TEXT NOT NULL,
    PRIMARY KEY (channel_id, tag_name),
    FOREIGN KEY (channel_id) REFERENCES channels (id) ON DELETE CASCADE,
    FOREIGN KEY (tag_name) REFERENCES tags (name) ON DELETE CASCADE
);