// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// Design round d (05/10): the global project switcher (A breadcrumb, B palette,
// C project row), the "Showing one project" note and the project chooser.
// Colours come only from the shared tokens, so every theme applies.
export const SWITCHER_CSS = `
/* The top bar sits above the page, so its menus are never covered by cards. */
.dockyard-root .dockyard-consolebar { position: relative; z-index: 30; }
.dockyard-root .dockyard-brand-zone { display: flex; align-items: center; gap: 4px; min-width: 0; }

.dockyard-root .dy-sw { position: relative; display: flex; align-items: center; gap: 4px; min-width: 0; }
.dockyard-root .dy-sw-slash { color: var(--dy-control-border); font-size: 22px; font-weight: 300; line-height: 1; margin: 0 2px; user-select: none; }
.dockyard-root .dy-sw-trigger {
  display: inline-flex; align-items: center; gap: 8px; min-width: 0; max-width: 250px; min-height: 38px;
  padding: 5px 8px 5px 5px; border: 1px solid transparent; border-radius: 10px;
  background: transparent; color: var(--dy-text); cursor: pointer; font-size: 14px; font-weight: 650;
  transition: background 120ms ease, border-color 120ms ease;
}
.dockyard-root .dy-sw-trigger:hover,
.dockyard-root .dy-sw-trigger[aria-expanded="true"] { background: var(--dy-surface-subtle); border-color: var(--dy-border); }
.dockyard-root .dy-sw-trigger-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dy-sw-caret { display: inline-grid; color: var(--dy-text-3); }
.dockyard-root .dy-sw-caret svg,
.dockyard-root .dy-sw-check svg,
.dockyard-root .dy-sw-chip svg { width: 14px; height: 14px; }
.dockyard-root .dy-sw-avatar {
  flex: none; display: inline-grid; place-items: center; width: 26px; height: 26px;
  border: 1px solid var(--dy-accent-border); border-radius: 7px;
  background: var(--dy-accent-soft); color: var(--dy-accent-text);
  font-size: 10.5px; font-weight: 750; letter-spacing: 0.02em; line-height: 1;
}
.dockyard-root .dy-sw-avatar[data-initials]::before { content: attr(data-initials); }
.dockyard-root .dy-sw-avatar[data-all] { border-color: var(--dy-border); background: var(--dy-surface-strong); color: var(--dy-text-2); }
.dockyard-root .dy-sw-avatar svg { width: 14px; height: 14px; }
.dockyard-root .dy-sw-avatar.lg { width: 34px; height: 34px; border-radius: 9px; font-size: 12px; }
.dockyard-root .dy-sw-avatar.lg svg { width: 17px; height: 17px; }

.dockyard-root .dy-sw-popover {
  position: absolute; z-index: 60; top: calc(100% + 8px); left: 10px; width: min(360px, 88vw);
  display: grid; overflow: hidden; border: 1px solid var(--dy-border); border-radius: 12px;
  background: var(--dy-surface); box-shadow: 0 18px 48px rgba(0, 0, 0, 0.2), var(--dy-shadow);
}
.dockyard-root .dy-sw-search { display: flex; align-items: center; gap: 9px; padding: 11px 13px; border-bottom: 1px solid var(--dy-border); color: var(--dy-text-3); }
.dockyard-root .dy-sw-search svg { flex: none; width: 15px; height: 15px; }
.dockyard-root .dy-sw-search input { flex: 1; min-width: 0; padding: 0; border: 0; outline: 0; background: transparent; color: var(--dy-text); font: inherit; font-size: 13.5px; }
.dockyard-root .dy-sw-search input::placeholder { color: var(--dy-text-3); opacity: 1; }
.dockyard-root .dy-sw-options { display: grid; gap: 1px; max-height: 320px; overflow-y: auto; padding: 6px; }
.dockyard-root .dy-sw-option { display: flex; align-items: center; gap: 10px; min-height: 46px; padding: 6px 8px; border-radius: 8px; cursor: pointer; }
.dockyard-root .dy-sw-option[data-active] { background: var(--dy-surface-strong); box-shadow: inset 2px 0 0 var(--dy-action); }
.dockyard-root .dy-sw-option[aria-selected="true"] .dy-sw-option-copy strong { color: var(--dy-accent-text); }
.dockyard-root .dy-sw-option-copy { display: grid; flex: 1; gap: 1px; min-width: 0; }
.dockyard-root .dy-sw-option-copy strong { overflow: hidden; color: var(--dy-text); font-size: 13px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dy-sw-option-copy span { overflow: hidden; color: var(--dy-text-3); font-size: 11.5px; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dy-sw-check { flex: none; display: inline-grid; width: 16px; color: var(--dy-accent-text); }
.dockyard-root .dy-sw-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--dy-neutral); }
.dockyard-root .dy-sw-dot.success, .dockyard-root .dy-sw-health.success .dy-sw-dot { background: var(--dy-success); }
.dockyard-root .dy-sw-dot.warning, .dockyard-root .dy-sw-health.warning .dy-sw-dot { background: var(--dy-warning); }
.dockyard-root .dy-sw-dot.danger, .dockyard-root .dy-sw-health.danger .dy-sw-dot { background: var(--dy-danger); }
.dockyard-root .dy-sw-health { display: inline-flex; flex: none; align-items: center; gap: 6px; color: var(--dy-text-2); font-size: 11.5px; white-space: nowrap; }
.dockyard-root .dy-sw-empty { margin: 0; padding: 14px 16px; color: var(--dy-text-3); font-size: 12.5px; }
.dockyard-root .dy-sw-foot { padding: 6px; border-top: 1px solid var(--dy-border); }
.dockyard-root .dy-sw-foot-action {
  display: flex; align-items: center; gap: 8px; width: 100%; min-height: 36px; padding: 6px 10px;
  border: 0; border-radius: 8px; background: transparent; color: var(--dy-text-2); cursor: pointer; font-size: 13px; font-weight: 600;
}
.dockyard-root .dy-sw-palette-foot .dy-sw-foot-action { width: auto; }
.dockyard-root .dy-sw-foot-action:hover { background: var(--dy-surface-subtle); color: var(--dy-text); }
.dockyard-root .dy-sw-foot-action svg { width: 15px; height: 15px; }

/* B: palette */
.dockyard-root .dy-sw-b { margin-left: 6px; }
.dockyard-root .dy-sw-b .dy-sw-trigger { border-color: var(--dy-border); background: var(--dy-surface-subtle); padding-right: 6px; }
.dockyard-root .dy-sw-b .dy-sw-trigger:hover { border-color: var(--dy-control-border); }
.dockyard-root .dy-sw-kbd,
.dockyard-root .dy-sw-palette-foot kbd {
  padding: 1px 6px; border: 1px solid var(--dy-border); border-bottom-width: 2px; border-radius: 5px;
  background: var(--dy-surface); color: var(--dy-text-2); font: inherit; font-size: 10.5px; font-weight: 650; white-space: nowrap;
}
.dockyard-root .dy-sw-palette-foot kbd { margin: 0 2px; }
.dockyard-root .dy-sw-palette-layer {
  position: fixed; inset: 0; z-index: 200; display: grid; align-items: start; justify-items: center;
  padding: 11vh 16px 16px; background: rgba(8, 11, 18, 0.5);
}
.dockyard-root .dy-sw-palette {
  display: grid; width: min(600px, 100%); overflow: hidden; border: 1px solid var(--dy-border); border-radius: 14px;
  background: var(--dy-surface); box-shadow: 0 30px 90px rgba(0, 0, 0, 0.36);
}
.dockyard-root .dy-sw-palette .dy-sw-search { padding: 15px 18px; }
.dockyard-root .dy-sw-palette .dy-sw-search svg { width: 18px; height: 18px; }
.dockyard-root .dy-sw-palette .dy-sw-search input { font-size: 16px; }
.dockyard-root .dy-sw-palette .dy-sw-options { max-height: min(430px, 58vh); padding: 8px; }
.dockyard-root .dy-sw-palette .dy-sw-option { min-height: 56px; padding: 8px 10px; gap: 12px; }
.dockyard-root .dy-sw-palette .dy-sw-option-copy strong { font-size: 14px; }
.dockyard-root .dy-sw-palette-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 44px; padding: 6px 8px 6px 14px;
  border-top: 1px solid var(--dy-border); color: var(--dy-text-3); font-size: 11.5px;
}

/* C: project row under the top bar */
.dockyard-root .dy-sw-strip { display: flex; align-items: center; gap: 6px; margin: -18px 0 24px; padding: 0 4px; }
.dockyard-root .dy-sw-strip-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; min-width: 0; }
.dockyard-root .dy-sw-chip {
  display: inline-flex; align-items: center; gap: 7px; min-height: 34px; padding: 4px 12px 4px 4px;
  border: 1px solid var(--dy-border); border-radius: 999px; background: var(--dy-surface); color: var(--dy-text-2);
  cursor: pointer; font-size: 12.5px; font-weight: 650; white-space: nowrap; transition: border-color 120ms ease, background 120ms ease;
}
.dockyard-root .dy-sw-chip:hover { border-color: var(--dy-control-border); color: var(--dy-text); }
.dockyard-root .dy-sw-chip[aria-checked="true"] { border-color: var(--dy-accent-border); background: var(--dy-accent-soft); color: var(--dy-accent-text); }
.dockyard-root .dy-sw-chip .dy-sw-avatar { width: 24px; height: 24px; border-radius: 999px; font-size: 9.5px; }
.dockyard-root .dy-sw-chip.more { padding: 4px 10px 4px 12px; }
.dockyard-root .dy-sw-strip .dy-sw-popover { left: 0; }

/* "Showing one project" note, on screens that follow the switcher */
.dockyard-root .dy-scope-note {
  display: flex; align-items: center; gap: 10px; margin: 0 0 16px; padding: 7px 8px 7px 12px;
  border: 1px solid var(--dy-accent-border); border-radius: 10px; background: var(--dy-accent-soft); color: var(--dy-text); font-size: 12.5px;
}
.dockyard-root .dy-scope-note > svg { flex: none; width: 15px; height: 15px; color: var(--dy-accent-text); }
.dockyard-root .dy-scope-note > span { flex: 1; min-width: 0; }

/* Project chooser, on screens that need one project while All is on */
.dockyard-root .dy-chooser { display: grid; gap: 18px; max-width: 760px; }
.dockyard-root .dy-chooser h1 { margin: 0 0 6px; font-size: 22px; letter-spacing: -0.01em; }
.dockyard-root .dy-chooser header p { margin: 0; color: var(--dy-text-2); }
.dockyard-root .dy-chooser-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.dockyard-root .dy-chooser-item {
  display: flex; align-items: center; gap: 12px; width: 100%; min-height: 62px; padding: 10px 14px 10px 10px;
  border: 1px solid var(--dy-border); border-radius: 12px; background: var(--dy-surface); color: var(--dy-text);
  cursor: pointer; text-align: left; box-shadow: var(--dy-shadow);
}
.dockyard-root .dy-chooser-item:hover { border-color: var(--dy-accent-border); }
.dockyard-root .dy-chooser-go { display: inline-grid; color: var(--dy-text-3); }
.dockyard-root .dy-chooser-go svg { width: 16px; height: 16px; }
.dockyard-root .dy-chooser-empty { display: flex; align-items: center; gap: 12px; color: var(--dy-text-2); }

/* Design review bar (prototype only); the page keeps room so nothing hides under it. */
.dockyard-root:has(.dy-review-bar) .dockyard-shell { padding-bottom: 110px; }
.dockyard-root .dy-review-bar {
  position: fixed; left: 16px; bottom: 16px; z-index: 150; display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  max-width: calc(100vw - 32px); padding: 8px 10px; border: 1px dashed var(--dy-control-border); border-radius: 12px;
  background: var(--dy-surface); color: var(--dy-text); box-shadow: 0 12px 34px rgba(0, 0, 0, 0.22); font-size: 12px;
}
.dockyard-root .dy-review-bar strong { color: var(--dy-text-2); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.dockyard-root .dy-review-bar label { display: inline-flex; align-items: center; gap: 6px; color: var(--dy-text-2); }
.dockyard-root .dy-review-bar select {
  min-height: 30px; padding: 3px 8px; border: 1px solid var(--dy-control-border); border-radius: 7px;
  background: var(--dy-surface); color: var(--dy-text); font: inherit;
}
.dockyard-root .dy-review-seg { display: inline-flex; padding: 2px; border: 1px solid var(--dy-border); border-radius: 8px; background: var(--dy-surface-subtle); }
.dockyard-root .dy-review-seg button { min-width: 30px; min-height: 26px; padding: 2px 8px; border: 0; border-radius: 6px; background: transparent; color: var(--dy-text-2); cursor: pointer; font-weight: 700; }
.dockyard-root .dy-review-seg button[aria-pressed="true"] { background: var(--dy-action); color: var(--dy-on-action); }
.dockyard-root .dy-review-bar[data-collapsed] > :not(.dy-review-toggle) { display: none; }
.dockyard-root .dy-review-toggle { border: 0; background: transparent; color: var(--dy-text-2); cursor: pointer; font-weight: 700; }

/* App settings: theme gallery and typeface */
.dockyard-root .dy-theme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(168px, 1fr)); gap: 12px; }
.dockyard-root .dy-theme-card {
  display: grid; gap: 8px; padding: 8px 8px 10px; border: 1px solid var(--dy-border); border-radius: 12px;
  background: var(--dy-surface); color: var(--dy-text); cursor: pointer; text-align: left;
}
.dockyard-root .dy-theme-card:hover { border-color: var(--dy-control-border); }
.dockyard-root .dy-theme-card[aria-checked="true"] { border-color: var(--dy-action); box-shadow: 0 0 0 2px var(--dy-action); }
.dockyard-root .dy-theme-preview { position: relative; height: 84px; overflow: hidden; border-radius: 8px; border: 1px solid rgba(127, 127, 127, 0.25); background-size: cover; background-position: center; }
.dockyard-root .dy-theme-preview .bar { position: absolute; left: 8px; right: 8px; top: 8px; height: 12px; border-radius: 4px; }
.dockyard-root .dy-theme-preview .card { position: absolute; left: 8px; right: 34px; top: 28px; bottom: 8px; display: grid; align-content: start; gap: 5px; padding: 7px; border-radius: 6px; }
.dockyard-root .dy-theme-preview .card i { display: block; height: 5px; border-radius: 3px; }
.dockyard-root .dy-theme-preview .accent { position: absolute; right: 8px; bottom: 8px; width: 20px; height: 20px; border-radius: 6px; }
.dockyard-root .dy-theme-preview.split { display: grid; grid-template-columns: 1fr 1fr; }
/* Name and kind on two fixed lines, so a long name never makes one card taller. */
.dockyard-root .dy-theme-name { display: grid; gap: 1px; min-width: 0; padding: 0 2px; }
.dockyard-root .dy-theme-name strong { overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.dockyard-root .dy-theme-name span { color: var(--dy-text-3); font-size: 11px; text-transform: capitalize; white-space: nowrap; }
.dockyard-root .dy-font-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.dockyard-root .dy-font-card {
  display: grid; gap: 4px; padding: 10px 12px; border: 1px solid var(--dy-border); border-radius: 10px;
  background: var(--dy-surface); color: var(--dy-text); cursor: pointer; text-align: left;
}
.dockyard-root .dy-font-card[aria-checked="true"] { border-color: var(--dy-action); box-shadow: 0 0 0 2px var(--dy-action); }
.dockyard-root .dy-font-card .sample { font-size: 22px; line-height: 1.1; }
.dockyard-root .dy-font-card span { color: var(--dy-text-2); font-size: 12px; }
.dockyard-root .dy-appearance-note { margin: 0; color: var(--dy-text-2); font-size: 12.5px; }
.dockyard-root .dockyard-app-settings-sub { margin: 14px 0 8px; color: var(--dy-text-3); font-size: 11.5px; font-weight: 750; letter-spacing: 0.06em; text-transform: uppercase; }
.dockyard-root .dockyard-app-settings-sub:first-of-type { margin-top: 2px; }
`
