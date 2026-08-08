-- Fix: showcase curation failed with a unique-constraint violation.
--
-- `assets.storage_path` was globally unique. The intent was to stop the same
-- uploaded file being registered twice — but that is a per-invitation concern,
-- and a showcase clone legitimately points at the *same* stored object as its
-- source: the photograph belongs to the host, is not re-uploaded, and must not
-- be duplicated in storage just to satisfy a constraint.
--
-- So `generate_showcase_clone` could never copy a photo, and every attempt to
-- curate an invitation with photographs failed. Scoping the constraint to the
-- event keeps the original protection and allows the clone.

alter table assets drop constraint if exists assets_storage_path_key;

create unique index if not exists assets_event_storage_path_idx
  on assets (event_id, storage_path);

comment on index assets_event_storage_path_idx is
  'One row per file per invitation. Deliberately not globally unique: a showcase clone references the same object as its source.';
