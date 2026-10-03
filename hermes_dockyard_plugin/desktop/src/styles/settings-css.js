// GENERATED-STRUCTURE: hand-edited Desktop module. C8-owned Settings styles only.
// Appended where DOCKYARD_CSS is used (runtime/context.js). Do not grow
// dockyard-css.js — shared-file rule (one contiguous block per owner).
// Colours come only from the shell's --dy-* tokens (dockyard-css.js), which
// carry both the light and the dark theme, so no theme branch is needed here.
// No fallback colours: a misspelt token must fail settings-colours.test.mjs, not
// quietly paint a light-theme colour into the dark theme.
export const SETTINGS_CSS = `
/* C8 Settings option A (signed 16/09): three uppercase category labels over the
   existing Project configuration grid. The labels are decorative group headings
   for the existing fields; the fields themselves are unchanged. */
.dockyard-root .dockyard-settings-category { display: grid; gap: 14px; grid-column: 1 / -1; }
.dockyard-root .dockyard-settings-category-label {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 6px 0 0;
  padding-bottom: 7px;
  border-bottom: 1px solid var(--dy-border);
  color: var(--dy-text-3);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.dockyard-root .dockyard-settings-category-label::after {
  content: "";
  flex: 1;
  height: 1px;
  background: var(--dy-border);
}
`
