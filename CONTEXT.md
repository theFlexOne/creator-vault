# Creator Vault

Creator Vault tracks profiles and the content surfaces the project monitors across platforms. The domain is profile-centric, with platform-specific terms used for each source rather than one generic cross-platform account model.

## Language

**Profile**:
A profile is the cross-platform identity the project tracks. A profile can have multiple platform-specific publishing surfaces.
_Avoid_: Channel, account, creator

**YouTube Channel**:
A YouTube channel is the entry point for all YouTube data associated with a profile. It is a platform-specific surface owned by exactly one profile.
_Avoid_: Profile, source account

**Video**:
A video is the primary YouTube content unit tracked under a YouTube channel. A video owns its transcript, comments, and other YouTube-specific metadata.
_Avoid_: Content item, asset

**Transcript**:
A transcript is the textual record attached to a specific video. It does not exist independently of the video it belongs to.
_Avoid_: Content, document

**Comment**:
A comment is discussion data attached to a specific video. It is part of the video's tracked YouTube data.
_Avoid_: Transcript, note

**Platform Surface**:
A platform surface is a platform-specific publishing presence through which a profile produces content. Examples include a YouTube channel and future non-YouTube surfaces defined in their own concrete terms.
_Avoid_: Source account, generic account, profile
