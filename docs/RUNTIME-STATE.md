# Shared runtime state

CLI, core plugin tools, standalone RPC, Dashboard and Desktop all select the
same profile-scoped Stewardship database. Native Hermes kanban remains its own
host-owned store; this does not merge kanban into Stewardship.

Selection precedence:

1. Explicit API `db_path`, core `PluginState.db_path` or CLI `--db`.
2. `STEWARD_DB_PATH`.
3. Legacy `DOCKYARD_PLUGIN_DB` (still supported by every surface).
4. `$HERMES_HOME/plugin-data/hermes-dockyard/dockyard.db`.
   Without `HERMES_HOME`, the profile root is `~/.hermes`.

Use the same selection across processes. An already-running plugin retains its
open store until its normal lifecycle ends; setting an environment variable does
not silently switch a running service's database. No restart is performed by the
resolver.

## Existing installations

Before opening the default, the resolver inspects the old
`$HERMES_HOME/stewardship.db` and current-directory `stewardship.db` with read-only
SQLite connections. A schema-only empty legacy database is not user data. A
populated, unrecognised or unreadable legacy database stops default startup.
It never copies, renames, overwrites, merges or silently adopts an old database.

If stopped:

1. Identify the intended profile and the database named by the error. Inspect
   each candidate explicitly, using `stewardctl --db /absolute/path project
   status PROJECT --json` for a known project. Preserve other candidates.
2. Back up each populated candidate using the existing `stewardctl --db ...
   export ...` operation. The exporter uses SQLite's backup API: do not copy just
   a live `.db` file while ignoring its WAL. Verify the archive manifest and
   restore a copy into a separate temporary path before cutover.
3. Select the authoritative database explicitly with `STEWARD_DB_PATH` on every
   intended surface. The legacy alias still works, but setting both variables
   selects `STEWARD_DB_PATH`. Do not configure them inconsistently.
4. If two databases contain different work, reconcile that choice with the owner;
   there is deliberately no automatic merge or last-writer-wins heuristic.
5. Changing production configuration or restarting processes is a separate
   deployment approval. The implementation and tests do not do it.

A rollback selects the preserved previous database and previous code together.
Do not downgrade a schema in place or discard sidecars from a live database.
Disabling features continues to hide/deny access, never delete their records.

## Privacy and isolation

The managed leaf directory is mode 0700 on POSIX; database and SQLite sidecar
files use the existing Store's 0600 enforcement. For an explicitly chosen path,
existing parent directory permissions are preserved. Missing directories are
created privately. Failure to open the chosen path is an error, not a fallback
to a second database. Other profile directories are not searched.

The resolver does not contain host, provider, scheduler or UI dependencies.
No migration or additional runtime package is needed for this change.
