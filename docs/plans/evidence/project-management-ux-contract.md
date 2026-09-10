# Project Management UX Contract — Phase 2

**Branch:** `feat/project-management-stewardship`
**Phase 1 base:** `1155d2da1fa615f6beff8868a591875db3091577`
**Prototype:** `design/project-ux/prototype/`
**Status:** **APPROVED — Phase 2 complete; no Phase 3 work started**

## Approval record

Sahil reviewed the live prototype at `http://127.0.0.1:5174/` and explicitly approved the visual and interaction model on 2026-09-11 BST:

> “it looks awesome im happy to sign it off.”

The reviewed server was the standalone Vite app in `design/project-ux/prototype/`, launched with an explicit port override. Automated gates were rerun after the final visual repairs. This approval does not authorise this artifact to touch a Hermes home, install a plugin, or represent production mutation APIs as implemented.

## Review boundary

This is an isolated React/Vite prototype with deterministic synthetic fixtures. It:

- does not import the Hermes SDK;
- does not read a daemon, profile home, database, plugin, project, board, repository, or credentials;
- stores changes only in React state for the current browser session;
- models contract consequences without claiming production routes exist;
- does not install, deploy, or modify the Desktop plugin.

## Desktop visual-language audit — PM-0201

Authority: `hermes_dockyard_plugin/desktop/plugin.js`:

- `LIGHT_TOKENS`: lines 9–38
- `DARK_TOKENS`: lines 40–69
- canonical `--dy-*` mapping: lines 133–206
- typography/focus/button/section conventions: lines 169–174 and 218–389

The prototype maps the canonical colour properties exactly. It reimplements layouts and controls for this standalone review app; it claims no component-code reuse.

| Canonical CSS property | Light | Dark |
|---|---:|---:|
| `--dy-bg` | `#f6f7f9` | `#0f1217` |
| `--dy-surface` | `#ffffff` | `#171b22` |
| `--dy-surface-subtle` | `#f0f2f5` | `#1d222b` |
| `--dy-surface-strong` | `#e8ebf0` | `#252b36` |
| `--dy-text` | `#15171c` | `#f3f5f7` |
| `--dy-text-2` | `#515968` | `#b6beca` |
| `--dy-text-3` | `#626c7b` | `#949eac` |
| `--dy-border` | `#d7dce4` | `#2e3541` |
| `--dy-control-border` | `#87909d` | `#5f6977` |
| `--dy-action` | `#3654c7` | `#3654c7` |
| `--dy-action-hover` | `#2945b4` | `#4662d4` |
| `--dy-accent-text` | `#293f9e` | `#c2cbff` |
| `--dy-accent-soft` | `#eef1ff` | `#232c4f` |
| `--dy-accent-border` | `#b8c4f0` | `#46558f` |
| `--dy-shadow` | `0 10px 28px rgba(31, 42, 68, 0.08)` | `0 12px 30px rgba(0, 0, 0, 0.24)` |
| `--dy-success` | `#136c4a` | `#72cda2` |
| `--dy-success-bg` | `#e7f6ef` | `#16372a` |
| `--dy-warning` | `#805200` | `#f0bd64` |
| `--dy-warning-bg` | `#fff3d4` | `#3a2c14` |
| `--dy-danger` | `#a72a2a` | `#ff9188` |
| `--dy-danger-bg` | `#ffeded` | `#40201f` |
| `--dy-info` | `#315ca8` | `#9ab9ff` |
| `--dy-info-bg` | `#eaf2ff` | `#1c2d4a` |
| `--dy-neutral` | `#596273` | `#bac2ce` |
| `--dy-neutral-bg` | `#edf0f4` | `#2a303a` |
| `--dy-focus` | `#3654c7` | `#8fa2ff` |
| `--dy-disabled-text` | `#515968` | `#b6beca` |
| `--dy-disabled-bg` | `#e8ebf0` | `#252b36` |

`src/styles.css` is the mechanical mapping. Prototype-specific spacing, radii, responsive composition, and component class names are local implementation details rather than claimed Desktop tokens.

## Shared profile picker contract — PM-0201

One `ProfilePicker` component is used by onboarding lead/member selection, add member, lead transfer, and exit replacement.

- Search matches profile name, slug, or specialty.
- Focus enters the search field when the modal opens.
- `ArrowDown` and `ArrowUp` move the active option and skip unavailable options.
- `Enter` selects the active available option, including immediately after search results change.
- `Escape` closes without changing the parent field.
- `Tab` and `Shift+Tab` remain trapped in the dialog.
- Closing restores focus to the exact trigger.
- Availability is displayed as discovered state. Historical unavailable profile `orbit` remains visible, has `aria-disabled="true"`, is natively disabled, and cannot be selected.
- The explanation says profile creation occurs outside Project Stewardship through Hermes profile management. The prototype does not invent a profile-creation API or unsupported Desktop deep link.

## Journey contracts

### PM-0202 — Onboarding and separate assessment

Interactive order:

1. **Project:** required name and validated stable key.
2. **Purpose:** required outcome/boundary/evidence statement.
3. **Team + policy:** exactly one available lead, optional members, autonomy and verification policy.
4. **Review/preflight:** exact project, purpose, team, policy, availability checks, and synthetic preflight fingerprint.

Nothing is created before Review. “Create synthetic project” completes onboarding without starting an assessment. “Run first assessment” appears only on the post-onboarding receipt and produces a distinct synthetic receipt after a separate click.

### PM-0203 — Team management

- **Add member:** choose an available profile not already active, review the candidate, then confirm. The roster and membership revision update.
- **Transfer lead:** choose an existing active member; current lead is excluded. Promotion and demotion are represented as one change and the roster continues to show exactly one lead.
- **Remove with no work:** direct removal is offered only after an exact `0 of 0` workload check and a confirmation dialog.
- **Only-lead guard:** the active lead removal control is visibly disabled. Copy explains that another active lead must be established before removal, unavailability, or departure.
- Members with work use “Exit with transfer” rather than direct removal.

### PM-0204 — Exact member exit

The ready preview displays every synthetic affected task with ID, title, kind, canonical status, item revision, and outcome. The authority rail binds:

- member leaving;
- replacement profile;
- membership revision;
- complete enumeration count and all-pages state;
- preview fingerprint;
- one explicit confirmation over the exact scope.

There are no per-item checkboxes or subset controls. The only checkbox confirms the entire exact set and fingerprint. Membership remains `departure_pending` until canonical readback is represented as complete.

### PM-0205 — Fail-closed and resumable states

| State | UI contract | Supported action |
|---|---|---|
| Stale preview | Shows expected/current membership revision; starts no transfer | Refresh and recompute exact list/fingerprint |
| Incomplete pagination | Shows items read so far but no fingerprint/confirmation | Load every page; only then expose exact confirmation |
| Claimed/running blocker | Lists exact task, status, revision, and claim-lock reason | Resolve canonical state, then refresh |
| Scheduled blocker | Lists exact task, status, revision, and owner-bound scheduled reason | Resolve canonical state, then refresh |
| Unreadable canonical state | Keeps item/member blocked; never shows success | Retry canonical read |
| Offline | Preserves local choices and sends no mutation | Retry connection |
| Permission denied | Names required capability and confirms no write was attempted | Retry access check after administrator action |
| Partial transfer | Shows operation/idempotency key, `departure_pending`, 2/4 progress, all four journal outcomes | Resume remaining journal items idempotently |

A partial transfer exposes no cancel, rollback, or reversal button because host writes may already be committed. The UI labels `4 of 4 journalled` separately from `2 of 4` transferred, avoiding false completion.

### PM-0206 — Outcomes and lifecycle

- One goal visibly links multiple objectives.
- Unlinked objectives remain visible and valid.
- Goals and objectives each support create, edit, archive, and restore in browser state; goal/objective links survive archive/restore.
- Milestones support archive and restore with attribution/history retained.
- Projects support archive and restore only; permanent deletion is not offered.
- Project archive copy states that canonical project, board, tasks, and repository remain untouched.
- Archive copy explicitly says workflow execution is **not represented as paused**.
- Archive confirmation uses warning treatment, not permanent-delete red.

### PM-0207 — Operational states

The State lab renders and labels loading, empty, unavailable profile, offline, validation, conflict, recovery, permission denied, unreadable, and incomplete-enumeration states. Each state distinguishes what is known, what remains blocked, whether a mutation was sent, and the next supported action.

## Automated validation — PM-0208

Runner: Playwright Chromium, one worker, deterministic local fixtures. Test files:

- `prototype/tests/prototype.spec.js`
- `prototype/tests/captures.spec.js`
- `prototype/playwright.config.js`

Fresh final result: **37 passed, 0 failed** in 19.8 seconds. Capture-only run: **9 passed, 0 failed**.

Covered assertions:

- exact light/dark `--dy-*` token values;
- 1440×900, 1280×800, 768×1024, and 390×844 baseline layouts in both themes;
- route-level pairwise narrow/desktop layout checks and zero document-level horizontal overflow;
- active mobile navigation visibility;
- keyboard-only picker search, `ArrowDown`, `ArrowUp`, `Enter`, disabled option, and `Escape`;
- modal focus trap and focus restoration;
- onboarding validation and assessment separation;
- add/remove/lead-transfer/only-lead guard;
- exact-scope transfer confirmation;
- stale refresh, complete pagination, blockers, unreadable, offline, permission, partial resume;
- goal/objective and milestone/project lifecycle mutations;
- dialog accessible name, listbox/combobox semantics, unavailable option state, and alert language;
- reduced-motion computed animation/transition durations;
- selected, disabled, warning, and error contrast in both themes;
- archive action order and warning/destructive separation.

### Contrast evidence

Ratios are computed from the exact rendered token pairs:

| State | Light | Dark | Threshold |
|---|---:|---:|---:|
| Selected | 8.12:1 | 8.60:1 | 4.5:1 |
| Disabled | 5.90:1 | 7.59:1 | 4.5:1 |
| Warning | 6.09:1 | 7.85:1 | 4.5:1 |
| Error | 6.18:1 | 6.69:1 | 4.5:1 |

This is automated contrast and semantic coverage, not a claim of full accessibility certification. No manual screen-reader product run was performed.

## Viewport/theme matrix

Full baseline combinations:

| Viewport | Light | Dark |
|---|---:|---:|
| 1440×900 | Pass | Pass |
| 1280×800 | Pass | Pass |
| 768×1024 | Pass | Pass |
| 390×844 | Pass | Pass |

Pairwise route checks:

| Route | Viewport | Theme | Result |
|---|---:|---|---|
| Onboarding | 1280×800 | Dark | Pass |
| Team | 768×1024 | Light | Pass |
| Member exit | 390×844 | Dark | Pass |
| Goals & objectives | 1440×900 | Light | Pass |
| Archive & restore | 390×844 | Dark | Pass |
| State lab | 768×1024 | Light | Pass |

## Rendered capture evidence

All paths are under `design/project-ux/captures/`:

- `onboarding-review-light-1440x900.png`
- `profile-picker-dark-1280x800.png`
- `team-transfer-light-768x1024.png`
- `member-exit-ready-light-1440x900.png`
- `member-exit-stale-dark-390x844.png`
- `member-exit-partial-dark-1280x800.png`
- `goals-objectives-light-768x1024.png`
- `project-archive-dark-390x844.png`
- `state-lab-light-1440x900.png`

Full-page captures retain the named test viewport width while extending image height where content requires scrolling.

## Visual inspection and repairs

Every capture was rendered by Playwright and inspected with image vision tooling. Repairs made before the final rerun:

1. prevented a picker render crash when parent exclusions update during selection;
2. removed transient low contrast on disabled controls during dark-theme application;
3. made the unavailable profile row visibly non-interactive;
4. replaced clipped narrow navigation with a compact seven-item grid;
5. changed reversible archive confirmation from danger red to warning treatment;
6. separated “4 of 4 journalled” from “2 of 4 transferred” and captured every journal row;
7. changed long State lab and recovery captures to full-page evidence.

Final reinspection found no Critical or High visual findings in the repaired stale-preview, partial-transfer, project-archive, ready-exit, or full State lab captures. Earlier medium observations about small secondary metadata remain non-blocking; the exact text pairs pass automated AA contrast.

## Exact local opening command

```bash
cd /home/kensei/repos/hermes-project-stewardship/design/project-ux/prototype
npm ci
npm run dev -- --host 127.0.0.1
```

Open: `http://127.0.0.1:4173/`

The reviewed port override is also valid:

```bash
npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Reviewed URL: `http://127.0.0.1:5174/`

## Reproduction commands

```bash
cd /home/kensei/repos/hermes-project-stewardship/design/project-ux/prototype
npm ci
npm run build
npm test
npm run capture
npm audit --audit-level=high
```

Final outcomes: build exit 0; Playwright 37/37 pass; capture 9/9 pass; npm audit reports 0 vulnerabilities.

## Unresolved implementation decisions

These do not reopen Phase 2 approval; they remain later-phase production decisions:

1. Which real Desktop/backend routes expose preview, operation journal, capability, and retry state in Phases 3–4.
2. Whether a future supported Hermes host contract provides profile-manager navigation; until proven, production should keep external creation guidance and refresh discovery.
3. Exact production assessment scheduling/receipt semantics after onboarding.
4. Manual assistive-technology product testing beyond the deterministic keyboard, semantics, focus, motion, layout, and contrast gates here.
5. Runtime wording/localisation review against real host errors and long production names/data volumes.

## Phase boundary

**PHASE 2 APPROVED.** No commit, push, merge, live plugin installation, live Hermes state change, or Phase 3 implementation was performed in this work session.
