// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// Design round d (05/10): the global project switcher (Sahil chose the
// breadcrumb, direction A), the "Showing one project" note and the project
// chooser. Colours come only from the shared tokens, so every theme applies.
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
.dockyard-root .dy-sw-check svg { width: 14px; height: 14px; }
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
/* "New project" then "Onboard existing project", one per line. */
.dockyard-root .dy-sw-foot { display: grid; gap: 2px; padding: 6px; border-top: 1px solid var(--dy-border); }
.dockyard-root .dy-sw-foot-action {
  display: flex; align-items: center; gap: 8px; width: 100%; min-height: 36px; padding: 6px 10px;
  border: 0; border-radius: 8px; background: transparent; color: var(--dy-text-2); cursor: pointer; font-size: 13px; font-weight: 600;
}
.dockyard-root .dy-sw-foot-action:hover { background: var(--dy-surface-subtle); color: var(--dy-text); }
.dockyard-root .dy-sw-foot-action svg { width: 15px; height: 15px; }

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
