# Desktop plugin source

`plugin.js` is generated. Do not edit it by hand.

Edit the hand-maintained ES modules under `src/`, then regenerate:

```bash
node hermes_dockyard_plugin/desktop/build.mjs
```

The build uses the repository's existing esbuild installation and leaves only
`@hermes/plugin-sdk`, `react`, and `react/jsx-runtime` as external imports.
The loader contract also permits `react/jsx-dev-runtime`; this source graph does
not emit it.

The build intentionally bundles the maintained source modules. The sibling
runtime modules used by the source tree remain build inputs; the committed
`plugin.js` is the only shipped Desktop artifact. `views/backlog.js` remains
larger than the general size target because its table row and dialog trees
are one stateful view; the model, bulk-import, wizard, and reason-modal seams are
split into the documented siblings.
The output is deterministic and is committed so the Desktop runtime can load
it as a single blob.


## Module map

- `src/index.js` — plugin object, `register`, route entry point, and test seam.
- `src/shell/` — application shell, navigation, project picker, and page frame.
- `src/views/` — dashboard, backlog (with `backlog-model.js`, `bulk-import.js`,
  `backlog-import-wizard.js`, and `backlog-reason-modal.js`), teams, inbox,
  notifications, onboarding, and initiative views.
- `src/project/` — project dashboard, objectives, panels, reporting, and
  workflow/planning surfaces.
- `src/work-item/` — work-item detail and approval components.
- `src/lib/` — shared UI, formatting, and runtime helpers.
- `src/styles/` — generated/shared design tokens and the Desktop stylesheet.
- `src/runtime/` — API context, downloads, icons, canvas mounting, geometry, and
  the single React/JSX import seam.

Generated inputs from the dashboard build remain owned by
`hermes_dockyard_plugin/dashboard/build.mjs`; the Desktop build consumes those
files and never re-types their contents.

Run the loader contract and drift checks after regeneration:

```bash
node --test hermes_dockyard_plugin/desktop/loader-contract.test.mjs \
  hermes_dockyard_plugin/desktop/drift.test.mjs
```
