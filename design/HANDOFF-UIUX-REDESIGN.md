# HANDOFF: Hermes Dockyard — Full UI/UX Redesign Ownership

You are taking **complete, sole ownership** of designing, implementing, merging, and testing
the Hermes Dockyard desktop plugin UI/UX. You will not delegate any part of this work — every
research decision, design decision, line of code, and test is yours.

## 1. Context — what exists and why you are here

Hermes Dockyard is a fleet-oversight panel for the official Hermes Desktop app (Electron,
Nous Research). It shows project health, pending approvals, and notifications for a
human owner supervising bot teams. Backend API and data layer are DONE and tested — your
work is exclusively the UI/UX layer.

The current state is **unacceptable and is an initial design only, not a direction**:
it renders as buttons with stacked text, weak hierarchy, and flat visual structure.
The owner has rejected it. Do not preserve it out of respect — evaluate it critically,
keep only what survives scrutiny (some data mappings and API wiring are sound), and redesign
the rest from evidence.

## 2. Key locations

| Thing | Path |
|---|---|
| Repo | `/home/kensei/repos/hermes-project-stewardship` |
| Live plugin (what the app loads) | `~/.hermes/desktop-plugins/hermes-dockyard/plugin.js` |
| Plugin backend (FastAPI router) | `hermes_dockyard_plugin/dashboard/plugin_api.py` in repo |
| Prior mockups (reference, not gospel) | `design/dockyard-mockups*.html`, `design/HANDOVER.md` |
| PRD | `docs/dockyard-prd-v0.3.md` |
| Demo database | `/tmp/hermes-dockyard/dockyard.db` |
| Desktop app source | `~/repos/hermes-agent-vanilla/apps/desktop/` |
| Render harness (use it) | `/tmp/repro-live.mjs` |

Backend serves on `127.0.0.1:9119`; the plugin talks to it through `ctx.rest`
(paths: `/dashboard`, `/inbox`, `/notifications`, plus approve/ack POSTs).
Read `plugin_api.py` first to learn exact response shapes.

## 3. Your responsibilities (all of them, no delegation)

1. **Research before deciding.** Study 5+ high-quality reference products for dense
   operational dashboards/oversight consoles (e.g. Linear, Vercel dashboard, Grafana,
   Height, GitHub Actions views). Extract concrete patterns: hierarchy, density rhythm,
   empty states, status colour systems, typography scales, spacing systems. Write findings
   down in `design/redesign-notes.md` with named takeaways per product.
2. **Audit the current implementation** honestly. List what fails (visual hierarchy,
   component quality, layout) and what is worth keeping (API bindings, data mapping,
   render guards). Put this audit at the top of `design/redesign-notes.md`.
3. **Redesign the UI/UX properly.** New information architecture, layout, visual language,
   interaction states (loading/empty/error/populated), and micro-interactions where they
   earn their place. This may discard the previous look entirely.
4. **Implement it yourself** in the desktop runtime plugin
   (`~/.hermes/desktop-plugins/hermes-dockyard/plugin.js`, plain ESM + `jsx()` calls;
   imports allowed: `@hermes/plugin-sdk`, `react/jsx-runtime`, `react`). Mirror the final
   file into the repo at `hermes_dockyard_plugin/desktop/plugin.js`.
5. **Merge**: commit to the repo (`master`), push to origin, keep the live door copy in sync.
6. **Test thoroughly** (section 6).

## 4. Hard constraints

- **No new npm dependencies.** The loader supports only bare specifiers `@hermes/plugin-sdk`,
  `react/jsx-runtime`, `react`. Everything else is hand-rolled (CSS-in-a-string is fine).
- All styles must be scoped under `.dockyard-root`. Never target `html`/`body`/`:root` —
  scoped descendants of those cannot match inside a div; that bug class already cost a day.
- Set text colour AND background explicitly on `.dockyard-root` (host theme must not bleed in).
- Every dynamic list child needs a React `key` as the third argument of `jsx()/jsxs()`.
  Every `jsx(Type, props)` call needs a props object, even `{}` — missing props crashes
  production React with "cannot read properties of undefined".
- Palette changes are permitted; do not regress WCAG AA contrast (verify numerically).
- British English copy. No em-dashes. No emoji in UI chrome.
- The backend/API and database are NOT yours to change except by agreement in writing
  in the notes file (if genuinely blocked, document precisely why).

## 5. Research expectations (evidence, not vibes)

Your notes file must show, per major decision:
- which reference product(s) informed it,
- what specific pattern was borrowed (name it concretely),
- why it fits Dockyard's data and owner workflow (a supervisor glancing at fleet state,
  triaging decisions, acknowledging alerts),
- what alternative you rejected and why.

## 6. Testing criteria — all must pass before you claim done

1. **Functional:** Dashboard shows both projects with correct counts; Inbox shows 2
   approvals; Approve flips a card to approved state and removes it on refresh;
   Notifications shows unread + acked rows; Acknowledge dims and marks "Cleared".
2. **Render harness:** `node /tmp/repro-live.mjs` (run from a Node with PATH including
   `~/.hermes/node/bin`) renders without TypeError/warnings; project rows present.
   Extend the harness if your design adds new states.
3. **States coverage:** loading, error-with-retry, empty (each tab), populated — all four
   states reachable and styled. Test empties by pointing at a fresh DB path via
   `DOCKYARD_PLUGIN_DB=/tmp/fresh.db ~/repos/KenseiAgent/.venv/bin/python -m uvicorn --port ...`
   or by temporarily filtering data client-side (document how).
4. **Contrast:** numeric WCAG check of every foreground/background pair in BOTH light and
   dark (system-preference driven). Include badges and buttons. Print the table in the notes.
5. **Responsiveness:** panel usable from ~700px to 1600px wide (grid collapses gracefully).
   Verify in the harness at two widths if possible, else reason explicitly in notes.
6. **Regression:** full Python suite green:
   `cd /home/kensei/repos/hermes-project-stewardship && uv run pytest` (307 passed baseline).
7. **Live smoke:** restart the app
   (`pkill -f "electron/dist/electron"; cd ~/repos/hermes-agent-vanilla/apps/desktop &&
   DISPLAY=:0 ./node_modules/.bin/electron . --no-sandbox --disable-gpu &`)
   and confirm no white screen, no console errors in `/tmp/dockyard-electron*.log`,
   Dockyard nav present, three tabs populated.

## 7. Deliverables

1. `design/redesign-notes.md` — audit, research findings, decisions log, contrast table.
2. Rebuilt `plugin.js` (live door + repo copy, identical bytes).
3. Updated render harness covering your new states (keep at `/tmp/repro-live.mjs` and copy
   into repo as `hermes_dockyard_plugin/desktop/repro-live.test.mjs`).
4. Git history: small, honest commits (`design:`, `feat:`, `fix:`, `test:`), pushed to origin.
5. A final summary to the owner: what changed and why, what you kept, what you rejected,
   test results table, known limitations.

## 8. Definition of done

The owner opens the app, clicks Dockyard, and sees a considered, professional oversight
console that reads correctly in light and dark, handles every state gracefully, passes all
tests above — and you can defend every design decision with a named reference and a reason.
