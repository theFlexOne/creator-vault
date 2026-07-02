# Versioned transcripts plus normalized segments

Transcript persistence stores both versioned raw json3 transcript blobs and normalized segment rows. The `transcripts` table preserves each stored source version, while `transcript_segments` stores the parsed segment structure used by downstream code.

This keeps source fidelity and structured access at the same time. We retain the raw caption payload needed for checksum-based versioning and future reprocessing, while also persisting normalized segments so the rest of the application does not need to reparse raw transcript blobs for common transcript work.
