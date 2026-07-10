# Profile-centric taxonomy domain model

The application identity model moves from `Creator` to `Profile`. A profile is the durable cross-source identity record that can later own YouTube channels, articles, Wikipedia pages, socials, and other source-specific surfaces.

Taxonomy becomes the primary internal classification layer for profiles. Curated taxonomy terms are distinct from imported source metadata tags and must not share storage, ownership, or write paths.

The current YouTube ingest pipeline remains source-specific. Channels, videos, and transcripts stay explicit YouTube surfaces in the first pass rather than being folded into a new generic multi-source surface abstraction.

The command and UI wording must stop using `profile` to mean fetched YouTube channel metadata. User-facing references to the current `ingest-channel-profile` flow should describe `channel metadata` or `channel details`, while `Profile` remains reserved for the cross-source identity model.

The first implementation pass attaches manual taxonomy to profiles. Channel-level taxonomy remains optional and should only be retained if there is a concrete manual classification need. Imported metadata tags continue to live on source-specific records as raw evidence from the source system.

This decision keeps the cross-source identity layer durable, makes the taxonomy split explicit, and avoids prematurely introducing generic surface abstractions before non-YouTube sources exist in the runtime model.
