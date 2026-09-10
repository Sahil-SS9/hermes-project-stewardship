# Project Stewardship Phase 2 Prototype

Standalone Vite/React interaction prototype. All data is deterministic and synthetic; the app has no Hermes daemon, profile, database, plugin, or network API dependency.

## Open locally

```bash
cd /home/kensei/repos/hermes-project-stewardship/design/project-ux/prototype
npm ci
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:4173/`.

## Verify

```bash
npm run build
npm test
npm run capture
npm audit --audit-level=high
```

- `tests/prototype.spec.js` exercises journeys, state recovery, keyboard/focus semantics, token values, responsive layouts, reduced motion, overflow, and contrast.
- `tests/captures.spec.js` writes real PNG evidence to `../captures/`.
- `package-lock.json` locks the dependency graph used by `npm ci`.

## Routes

Hash routes are review conveniences, not production URLs:

- `#overview`
- `#onboarding`
- `#team`
- `#exit`
- `#outcomes`
- `#lifecycle`
- `#states`

Add `?theme=dark` before the hash for a deterministic dark-theme opening, for example `http://127.0.0.1:4173/?theme=dark#exit`.
