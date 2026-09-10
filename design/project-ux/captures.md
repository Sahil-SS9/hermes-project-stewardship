# Phase 2 Rendered Capture Index

All PNGs below were produced by `npm run capture` from the standalone app in `design/project-ux/prototype/`. They contain deterministic synthetic data only.

| Capture | Test viewport | Theme | Rendered image | State |
|---|---:|---|---:|---|
| `captures/onboarding-review-light-1440x900.png` | 1440×900 | Light | 1440×900 | Onboarding Review/preflight; assessment excluded |
| `captures/profile-picker-dark-1280x800.png` | 1280×800 | Dark | 1280×800 | Shared picker; active and unavailable profiles |
| `captures/team-transfer-light-768x1024.png` | 768×1024 | Light | 768×1024 | Lead-transfer candidate and only-lead guard |
| `captures/member-exit-ready-light-1440x900.png` | 1440×900 | Light | 1440×900 | Exact complete 4-item exit preview |
| `captures/member-exit-stale-dark-390x844.png` | 390×844 | Dark | 390×844 | Stale conflict and refresh on narrow layout |
| `captures/member-exit-partial-dark-1280x800.png` | 1280×800 | Dark | 1280×984 full page | Partial 2/4 transfer, all journal rows, resume-only recovery |
| `captures/goals-objectives-light-768x1024.png` | 768×1024 | Light | 768×1371 full page | One-to-many links, unlinked objective, archive shelf |
| `captures/project-archive-dark-390x844.png` | 390×844 | Dark | 390×844 | Reversible project archive confirmation |
| `captures/state-lab-light-1440x900.png` | 1440×900 | Light | 1440×1304 full page | Ten loading/failure/recovery states |

## Reproduce

```bash
cd /home/kensei/repos/hermes-project-stewardship/design/project-ux/prototype
npm ci
npm run capture
```

The Playwright capture spec fixes viewport, theme, route, interaction state, and reduced-motion preference before each screenshot.

## Visual inspection record

Vision inspection covered all nine captures. The repair loop addressed:

- picker selection crash and unavailable-row affordance;
- dark-theme disabled-state transition contrast;
- clipped narrow navigation;
- archive confirmation severity;
- ambiguous partial-operation completion label;
- missing below-fold evidence in long galleries.

Final targeted inspection of the repaired ready exit, stale narrow state, partial operation, archive dialog, and complete State lab reported no Critical or High findings. Automated contrast checks remain authoritative for measured ratios; vision comments are qualitative evidence, not an accessibility certificate.
