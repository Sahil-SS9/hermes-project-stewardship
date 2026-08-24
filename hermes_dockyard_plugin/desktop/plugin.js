/**
 * Hermes Dockyard — desktop runtime plugin (v4-approved design port).
 * Visuals: design/dockyard-mockups-v4-approved.html (locked baseline), CSS scoped
 * under .dockyard-root; palette/shader-only deviations permitted by contract.
 */
import { jsx, jsxs, Fragment } from 'react/jsx-runtime'
import { useEffect, useState } from 'react'
import { host } from '@hermes/plugin-sdk'

const V4_CSS = ".dockyard-root :root {\n  color-scheme: light;\n  --bg: #f5f7fb;\n  --surface: #ffffff;\n  --surface-raised: #ffffff;\n  --surface-soft: #f8f9fc;\n  --surface-accent: #eef2ff;\n  --text: #171a23;\n  --text-2: #525b6b;\n  --text-3: #667085;\n  --line: #dfe3eb;\n  --line-strong: #c9cfdb;\n  --accent: #4057c8;\n  --accent-hover: #3247b1;\n  --accent-ink: #26378f;\n  --success: #176b45;\n  --success-bg: #e9f7ef;\n  --warning: #8a5400;\n  --warning-bg: #fff4da;\n  --danger: #aa2d25;\n  --danger-bg: #fff0ee;\n  --neutral: #5d6676;\n  --neutral-bg: #edf0f4;\n  --human: #8b3f70;\n  --bot: #27657a;\n  --radius-sm: 8px;\n  --radius-md: 12px;\n  --radius-lg: 16px;\n  --shadow: 0 10px 28px rgba(31, 42, 68, 0.08);\n  --max: 1480px;\n  --bar-height: 72px;\n  --ease: 160ms cubic-bezier(.2,.8,.2,1);}\n.dockyard-root html[data-theme=\"dark\"] {\n  color-scheme: dark;\n  --bg: #11141b;\n  --surface: #191d26;\n  --surface-raised: #202530;\n  --surface-soft: #151922;\n  --surface-accent: #20284a;\n  --text: #f1f3f7;\n  --text-2: #b7bfcc;\n  --text-3: #939cab;\n  --line: #303642;\n  --line-strong: #424958;\n  --accent: #8da0ff;\n  --accent-hover: #a7b5ff;\n  --accent-ink: #d5dcff;\n  --success: #63c697;\n  --success-bg: #18362a;\n  --warning: #f2bd66;\n  --warning-bg: #3b2d16;\n  --danger: #ff9188;\n  --danger-bg: #40201f;\n  --neutral: #b1bac8;\n  --neutral-bg: #292f3a;\n  --human: #e195c5;\n  --bot: #79c5dc;\n  --shadow: 0 12px 30px rgba(0, 0, 0, 0.24);}\n.dockyard-root * { box-sizing: border-box;}\n.dockyard-root html { min-height: 100%; background: var(--bg);}\n.dockyard-root body {\n  margin: 0;\n  min-width: 320px;\n  min-height: 100vh;\n  background: var(--bg);\n  color: var(--text);\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif;\n  font-size: 15px;\n  line-height: 1.5;\n  -webkit-font-smoothing: antialiased;}\n.dockyard-root button , .dockyard-root input , .dockyard-root select , .dockyard-root textarea { font: inherit;}\n.dockyard-root button { color: inherit;}\n.dockyard-root button , .dockyard-root [role=\"button\"] { -webkit-tap-highlight-color: transparent;}\n.dockyard-root button:focus-visible , .dockyard-root input:focus-visible , .dockyard-root select:focus-visible , .dockyard-root textarea:focus-visible , .dockyard-root [tabindex]:focus-visible {\n  outline: 3px solid color-mix(in srgb, var(--accent) 34%, transparent);\n  outline-offset: 2px;}\n.dockyard-root a { color: var(--accent-ink);}\n.dockyard-root svg { display: block;}\n.dockyard-root .icon { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; flex: 0 0 auto;}\n.dockyard-root .icon-sm { width: 15px; height: 15px;}\n.dockyard-root .icon-lg { width: 22px; height: 22px;}\n.dockyard-root .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;}\n.dockyard-root [hidden] { display: none !important;}\n.dockyard-root .project-row > .hide-sm { display: grid; gap: 2px;}\n.dockyard-root .backlog-item > span:nth-child(2) , .dockyard-root .handoff > span:nth-child(2) , .dockyard-root .saved-workflow > span , .dockyard-root .audit-row > span:nth-child(2) { min-width: 0;}\n.dockyard-root .backlog-item > span:nth-child(2) > strong , .dockyard-root .backlog-item > span:nth-child(2) > .small-text , .dockyard-root .handoff > span:nth-child(2) > strong , .dockyard-root .handoff > span:nth-child(2) > .small-text , .dockyard-root .saved-workflow > span > strong , .dockyard-root .saved-workflow > span > .small-text , .dockyard-root .audit-row > span:nth-child(2) > strong , .dockyard-root .audit-row > span:nth-child(2) > .small-text { display: block;}\n.dockyard-root .backlog-item > span:nth-child(2) > .small-text , .dockyard-root .handoff > span:nth-child(2) > .small-text , .dockyard-root .saved-workflow > span > .small-text , .dockyard-root .audit-row > span:nth-child(2) > .small-text { margin-top: 2px;}\n.dockyard-root .appbar {\n  position: sticky;\n  top: 0;\n  z-index: 50;\n  min-height: var(--bar-height);\n  border-bottom: 1px solid var(--line);\n  background: color-mix(in srgb, var(--surface) 94%, transparent);\n  backdrop-filter: blur(14px);}\n.dockyard-root .appbar-inner {\n  max-width: var(--max);\n  min-height: var(--bar-height);\n  margin: 0 auto;\n  padding: 10px 24px;\n  display: flex;\n  align-items: center;\n  gap: 18px;}\n.dockyard-root .brand {\n  display: inline-flex;\n  align-items: center;\n  gap: 10px;\n  min-width: max-content;\n  font-weight: 760;\n  letter-spacing: -0.02em;\n  font-size: 17px;}\n.dockyard-root .brand-mark {\n  width: 30px;\n  height: 30px;\n  display: grid;\n  place-items: center;\n  border-radius: 9px;\n  color: #ffffff;\n  background: var(--accent);}\n.dockyard-root .nav-pills {\n  display: flex;\n  align-items: center;\n  gap: 4px;\n  overflow-x: auto;\n  scrollbar-width: none;\n  flex: 1 1 auto;\n  padding: 3px;}\n.dockyard-root .nav-pills::-webkit-scrollbar { display: none;}\n.dockyard-root .nav-pill {\n  border: 0;\n  background: transparent;\n  color: var(--text-2);\n  min-width: max-content;\n  min-height: 38px;\n  padding: 8px 11px;\n  border-radius: 10px;\n  display: inline-flex;\n  align-items: center;\n  gap: 7px;\n  cursor: pointer;\n  font-size: 13px;\n  font-weight: 650;\n  transition: background var(--ease), color var(--ease), transform var(--ease);}\n.dockyard-root .nav-pill:hover { background: var(--surface-soft); color: var(--text);}\n.dockyard-root .nav-pill:active { transform: translateY(1px);}\n.dockyard-root .nav-pill.active { background: var(--surface-accent); color: var(--accent-ink);}\n.dockyard-root .nav-badge {\n  min-width: 20px;\n  height: 20px;\n  padding: 0 6px;\n  border-radius: 999px;\n  display: inline-grid;\n  place-items: center;\n  background: var(--warning-bg);\n  color: var(--warning);\n  font-size: 11px;\n  font-weight: 780;}\n.dockyard-root .app-actions { display: flex; align-items: center; gap: 8px; min-width: max-content;}\n.dockyard-root .icon-button {\n  width: 38px;\n  height: 38px;\n  border: 1px solid var(--line);\n  border-radius: 10px;\n  background: var(--surface);\n  display: inline-grid;\n  place-items: center;\n  cursor: pointer;\n  color: var(--text-2);\n  transition: border var(--ease), color var(--ease), background var(--ease), transform var(--ease);}\n.dockyard-root .icon-button:hover { border-color: var(--line-strong); color: var(--text); background: var(--surface-soft);}\n.dockyard-root .icon-button:active { transform: translateY(1px);}\n.dockyard-root .button {\n  min-height: 40px;\n  padding: 9px 14px;\n  border-radius: 10px;\n  border: 1px solid var(--line);\n  background: var(--surface);\n  color: var(--text);\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n  font-weight: 680;\n  font-size: 14px;\n  cursor: pointer;\n  transition: background var(--ease), border var(--ease), color var(--ease), transform var(--ease);}\n.dockyard-root .button:hover { background: var(--surface-soft); border-color: var(--line-strong);}\n.dockyard-root .button:active { transform: translateY(1px);}\n.dockyard-root .button.primary { border-color: var(--accent); background: var(--accent); color: #ffffff;}\n.dockyard-root .button.primary:hover { border-color: var(--accent-hover); background: var(--accent-hover);}\n.dockyard-root .button.danger { color: var(--danger); border-color: color-mix(in srgb, var(--danger) 45%, var(--line)); background: var(--surface);}\n.dockyard-root .button.danger:hover { background: var(--danger-bg);}\n.dockyard-root .button.quiet { border-color: transparent; background: transparent; color: var(--text-2);}\n.dockyard-root .button.quiet:hover { background: var(--surface-soft); color: var(--text);}\n.dockyard-root .button.small { min-height: 34px; padding: 7px 10px; font-size: 13px; border-radius: 8px;}\n.dockyard-root .button:disabled { opacity: .48; cursor: not-allowed; transform: none;}\n.dockyard-root .shell { max-width: var(--max); margin: 0 auto; padding: 34px 24px 64px;}\n.dockyard-root .screen { display: none; animation: screen-in 220ms var(--ease);}\n.dockyard-root .screen.active { display: block;}\n.dockyard-root @keyframes screen-in { from { opacity: 0; transform: translateY(4px);}\n.dockyard-root to { opacity: 1; transform: none;}\n.dockyard-root .page-head {\n  display: flex;\n  align-items: flex-start;\n  justify-content: space-between;\n  gap: 24px;\n  margin-bottom: 26px;}\n.dockyard-root .page-head h1 { margin: 0; font-size: clamp(27px, 3vw, 34px); line-height: 1.15; letter-spacing: -0.035em;}\n.dockyard-root .page-head p { margin: 8px 0 0; color: var(--text-2); max-width: 740px;}\n.dockyard-root .page-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end;}\n.dockyard-root .owed {\n  display: inline-flex;\n  align-items: center;\n  gap: 8px;\n  min-height: 34px;\n  padding: 6px 10px;\n  border-radius: 999px;\n  color: var(--warning);\n  background: var(--warning-bg);\n  font-weight: 720;\n  font-size: 13px;\n  white-space: nowrap;}\n.dockyard-root .owed.clear { color: var(--success); background: var(--success-bg);}\n.dockyard-root .status-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; flex: 0 0 auto;}\n.dockyard-root .card {\n  background: var(--surface);\n  border: 1px solid var(--line);\n  border-radius: var(--radius-lg);}\n.dockyard-root .card.elevated { box-shadow: var(--shadow); border-color: transparent;}\n.dockyard-root .card-pad { padding: 22px;}\n.dockyard-root .section-title { margin: 0; font-size: 19px; line-height: 1.25; letter-spacing: -0.02em;}\n.dockyard-root .section-sub { margin: 6px 0 0; color: var(--text-2); font-size: 14px;}\n.dockyard-root .spread { display: flex; align-items: center; justify-content: space-between; gap: 16px;}\n.dockyard-root .stack { display: grid; gap: 16px;}\n.dockyard-root .grid { display: grid; gap: 18px;}\n.dockyard-root .grid-2 { grid-template-columns: minmax(0, 1.55fr) minmax(300px, .8fr);}\n.dockyard-root .grid-even { grid-template-columns: repeat(2, minmax(0,1fr));}\n.dockyard-root .muted { color: var(--text-2);}\n.dockyard-root .small-text { font-size: 13px; color: var(--text-2);}\n.dockyard-root .mini-label { color: var(--text-3); font-size: 12px; font-weight: 700; letter-spacing: .02em;}\n.dockyard-root .badge {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  min-height: 25px;\n  padding: 4px 8px;\n  border-radius: 999px;\n  font-size: 12px;\n  font-weight: 720;\n  white-space: nowrap;}\n.dockyard-root .badge.success { color: var(--success); background: var(--success-bg);}\n.dockyard-root .badge.warning { color: var(--warning); background: var(--warning-bg);}\n.dockyard-root .badge.danger { color: var(--danger); background: var(--danger-bg);}\n.dockyard-root .badge.neutral { color: var(--neutral); background: var(--neutral-bg);}\n.dockyard-root .badge.accent { color: var(--accent-ink); background: var(--surface-accent);}\n.dockyard-root .avatar {\n  width: 30px;\n  height: 30px;\n  border-radius: 9px;\n  display: inline-grid;\n  place-items: center;\n  color: #ffffff;\n  background: var(--bot);\n  font-size: 11px;\n  font-weight: 800;\n  letter-spacing: .02em;}\n.dockyard-root .avatar.human { background: var(--human);}\n.dockyard-root .avatar-stack { display: flex; align-items: center;}\n.dockyard-root .avatar-stack .avatar { margin-left: -7px; border: 2px solid var(--surface);}\n.dockyard-root .avatar-stack .avatar:first-child { margin-left: 0;}\n.dockyard-root .metric-strip {\n  display: grid;\n  grid-template-columns: repeat(4, minmax(0,1fr));\n  gap: 1px;\n  margin-bottom: 18px;\n  overflow: hidden;\n  border: 1px solid var(--line);\n  border-radius: var(--radius-lg);\n  background: var(--line);}\n.dockyard-root .metric { padding: 18px 20px; background: var(--surface); min-height: 112px;}\n.dockyard-root .metric strong { display: block; margin-top: 8px; font-size: 27px; line-height: 1; letter-spacing: -0.03em;}\n.dockyard-root .metric .delta { display: block; margin-top: 10px; font-size: 12px; color: var(--text-2);}\n.dockyard-root .attention-card {\n  padding: 24px;\n  background: linear-gradient(145deg, var(--surface-accent), var(--surface));\n  border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--line));\n  border-radius: var(--radius-lg);\n  display: grid;\n  grid-template-columns: minmax(210px,.7fr) minmax(0,1.3fr);\n  gap: 26px;\n  margin-bottom: 18px;}\n.dockyard-root .attention-number { font-size: 50px; line-height: .95; letter-spacing: -0.05em; font-weight: 780; color: var(--accent-ink);}\n.dockyard-root .attention-copy h2 { margin: 8px 0 8px; font-size: 22px; letter-spacing: -0.02em;}\n.dockyard-root .attention-list { display: grid; gap: 8px;}\n.dockyard-root .decision-row {\n  border: 1px solid var(--line);\n  border-radius: 11px;\n  background: var(--surface);\n  padding: 13px 14px;\n  display: grid;\n  grid-template-columns: auto minmax(0,1fr) auto;\n  align-items: center;\n  gap: 12px;}\n.dockyard-root .decision-row strong { display: block; font-size: 14px;}\n.dockyard-root .project-list { overflow: hidden;}\n.dockyard-root .project-row {\n  width: 100%;\n  border: 0;\n  border-bottom: 1px solid var(--line);\n  background: transparent;\n  display: grid;\n  grid-template-columns: minmax(230px,1.4fr) minmax(110px,.65fr) minmax(120px,.7fr) minmax(120px,.7fr) auto;\n  gap: 18px;\n  align-items: center;\n  padding: 16px 20px;\n  text-align: left;\n  cursor: pointer;\n  transition: background var(--ease);}\n.dockyard-root .project-row:last-child { border-bottom: 0;}\n.dockyard-root .project-row:hover { background: var(--surface-soft);}\n.dockyard-root .project-name { display: flex; gap: 12px; align-items: center; min-width: 0;}\n.dockyard-root .project-icon { width: 36px; height: 36px; border-radius: 10px; background: var(--surface-accent); color: var(--accent-ink); display: grid; place-items: center;}\n.dockyard-root .project-name strong { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}\n.dockyard-root .project-name span { display: block; margin-top: 2px; color: var(--text-2); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}\n.dockyard-root .activity-list { padding: 6px 22px 14px;}\n.dockyard-root .activity-item { position: relative; display: grid; grid-template-columns: 34px minmax(0,1fr); gap: 12px; padding: 14px 0;}\n.dockyard-root .activity-item:not(:last-child)::after { content: \"\"; position: absolute; left: 16px; top: 48px; bottom: -5px; width: 1px; background: var(--line);}\n.dockyard-root .activity-icon { width: 34px; height: 34px; border-radius: 10px; background: var(--surface-soft); color: var(--text-2); display: grid; place-items: center; z-index: 1;}\n.dockyard-root .activity-item p { margin: 0; font-size: 14px;}\n.dockyard-root .activity-item time { display: block; margin-top: 3px; color: var(--text-3); font-size: 12px;}\n.dockyard-root .goal-card {\n  display: grid;\n  grid-template-columns: minmax(260px,1.15fr) minmax(0,1.85fr);\n  gap: 28px;\n  padding: 25px;\n  margin-bottom: 18px;}\n.dockyard-root .goal-copy h2 { margin: 8px 0 10px; font-size: 25px; line-height: 1.2; letter-spacing: -0.03em;}\n.dockyard-root .goal-copy p { margin: 0; color: var(--text-2);}\n.dockyard-root .kpi-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px;}\n.dockyard-root .kpi { padding: 15px; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--surface-soft);}\n.dockyard-root .kpi strong { display: block; margin: 8px 0 5px; font-size: 20px;}\n.dockyard-root .progress { height: 7px; border-radius: 999px; background: var(--neutral-bg); overflow: hidden;}\n.dockyard-root .progress > span { display: block; height: 100%; border-radius: inherit; background: var(--accent);}\n.dockyard-root .tabs { display: flex; align-items: center; gap: 2px; padding: 4px; width: max-content; max-width: 100%; overflow-x: auto; border: 1px solid var(--line); border-radius: 11px; background: var(--surface); margin-bottom: 18px;}\n.dockyard-root .tab { border: 0; background: transparent; min-width: max-content; padding: 8px 13px; border-radius: 8px; color: var(--text-2); font-weight: 680; font-size: 13px; cursor: pointer;}\n.dockyard-root .tab.active { color: var(--accent-ink); background: var(--surface-accent);}\n.dockyard-root .tab-panel { display: none;}\n.dockyard-root .tab-panel.active { display: block;}\n.dockyard-root .board-wrap { overflow-x: auto; padding-bottom: 6px;}\n.dockyard-root .board { display: grid; grid-template-columns: repeat(4,minmax(270px,1fr)); gap: 14px; min-width: 1130px;}\n.dockyard-root .board-column { border: 1px solid var(--line); border-radius: var(--radius-lg); background: var(--surface-soft); min-height: 430px;}\n.dockyard-root .column-head { padding: 15px 15px 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px;}\n.dockyard-root .column-head h3 { margin: 0; font-size: 14px;}\n.dockyard-root .column-meta { display: inline-flex; align-items: center; gap: 7px; color: var(--text-2); font-size: 12px;}\n.dockyard-root .wip-over { color: var(--danger); font-weight: 750;}\n.dockyard-root .card-stack { padding: 0 10px 12px; min-height: 340px;}\n.dockyard-root .card-stack.drag-over { background: color-mix(in srgb, var(--accent) 6%, transparent); border-radius: 12px;}\n.dockyard-root .work-card {\n  border: 1px solid var(--line);\n  border-radius: var(--radius-md);\n  background: var(--surface);\n  padding: 13px;\n  margin-bottom: 10px;\n  cursor: grab;\n  box-shadow: 0 3px 10px rgba(31,42,68,.05);}\n.dockyard-root .work-card:active { cursor: grabbing;}\n.dockyard-root .work-card.dragging { opacity: .45;}\n.dockyard-root .work-type { display: flex; align-items: center; justify-content: space-between; gap: 8px;}\n.dockyard-root .type { font-size: 11px; font-weight: 780; text-transform: uppercase; letter-spacing: .05em; color: var(--accent-ink);}\n.dockyard-root .work-card h4 { margin: 10px 0 12px; font-size: 14px; line-height: 1.35;}\n.dockyard-root .work-meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; color: var(--text-3); font-size: 12px;}\n.dockyard-root .drag-handle { color: var(--text-3);}\n.dockyard-root .timeline-list { display: grid; gap: 12px;}\n.dockyard-root .timeline-row { display: grid; grid-template-columns: 120px minmax(0,1fr) auto; gap: 16px; align-items: center; padding: 15px; border: 1px solid var(--line); border-radius: var(--radius-md); background: var(--surface);}\n.dockyard-root .backlog-list { display: grid; gap: 10px;}\n.dockyard-root .backlog-item {\n  display: grid;\n  grid-template-columns: 42px minmax(240px,1.4fr) minmax(140px,.65fr) minmax(170px,.75fr) auto;\n  gap: 16px;\n  align-items: center;\n  padding: 15px 17px;\n  border: 1px solid var(--line);\n  border-radius: var(--radius-md);\n  background: var(--surface);}\n.dockyard-root .rank { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; background: var(--surface-soft); font-weight: 780;}\n.dockyard-root .rank-controls { display: flex; gap: 5px; justify-content: flex-end;}\n.dockyard-root .suppressed {\n  margin-top: 16px;\n  padding: 18px;\n  border: 1px dashed var(--line-strong);\n  border-radius: var(--radius-md);\n  background: var(--surface-soft);}\n.dockyard-root .suppressed h3 { margin: 0 0 6px; font-size: 15px;}\n.dockyard-root .approval-list { display: grid; gap: 14px;}\n.dockyard-root .approval-card { padding: 22px;}\n.dockyard-root .approval-card.resolved { opacity: .68;}\n.dockyard-root .approval-top { display: grid; grid-template-columns: 42px minmax(0,1fr) auto; gap: 14px; align-items: start;}\n.dockyard-root .approval-title h2 { margin: 0; font-size: 18px;}\n.dockyard-root .approval-title p { margin: 5px 0 0; color: var(--text-2); font-size: 13px;}\n.dockyard-root .evidence-box { margin: 17px 0; padding: 16px; border-radius: var(--radius-md); background: var(--surface-soft); border: 1px solid var(--line);}\n.dockyard-root .evidence-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 12px;}\n.dockyard-root .evidence-cell { padding-right: 12px; border-right: 1px solid var(--line);}\n.dockyard-root .evidence-cell:last-child { border: 0;}\n.dockyard-root .evidence-cell strong { display: block; margin-top: 5px; font-size: 14px;}\n.dockyard-root .approval-actions { display: flex; gap: 9px; align-items: center; flex-wrap: wrap;}\n.dockyard-root .team-layout { display: grid; grid-template-columns: minmax(0,1.55fr) minmax(320px,.8fr); gap: 18px;}\n.dockyard-root .registry { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px;}\n.dockyard-root .bot-card { border: 1px solid var(--line); border-radius: var(--radius-md); padding: 16px; background: var(--surface); cursor: pointer; text-align: left;}\n.dockyard-root .bot-card:hover { border-color: var(--line-strong); background: var(--surface-soft);}\n.dockyard-root .bot-head { display: flex; align-items: center; gap: 11px;}\n.dockyard-root .bot-head strong { display: block;}\n.dockyard-root .bot-head span { display: block; color: var(--text-2); font-size: 12px;}\n.dockyard-root .capabilities { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 13px;}\n.dockyard-root .capability { padding: 4px 7px; border-radius: 7px; background: var(--surface-soft); color: var(--text-2); font-size: 11px; font-weight: 680;}\n.dockyard-root .load-list { display: grid; gap: 13px; margin-top: 16px;}\n.dockyard-root .load-row { display: grid; grid-template-columns: 90px minmax(0,1fr) auto; gap: 10px; align-items: center; font-size: 13px;}\n.dockyard-root .load-bar { height: 7px; border-radius: 999px; background: var(--neutral-bg); overflow: hidden;}\n.dockyard-root .load-bar span { display: block; height: 100%; background: var(--accent); border-radius: inherit;}\n.dockyard-root .group-card { padding: 20px; margin-top: 18px;}\n.dockyard-root .handoff-list { display: grid; gap: 9px; margin-top: 14px;}\n.dockyard-root .handoff { width: 100%; text-align: left; border: 1px solid var(--line); border-radius: 11px; background: var(--surface-soft); padding: 13px; cursor: pointer; display: grid; grid-template-columns: auto minmax(0,1fr) auto; gap: 12px; align-items: center;}\n.dockyard-root .handoff:hover { border-color: var(--line-strong);}\n.dockyard-root .loop-layout { display: grid; grid-template-columns: minmax(0,1.45fr) minmax(320px,.75fr); gap: 18px;}\n.dockyard-root .loop { padding: 20px;}\n.dockyard-root .stage-list { display: grid; gap: 7px; margin-top: 17px;}\n.dockyard-root .stage {\n  width: 100%;\n  border: 1px solid var(--line);\n  border-radius: 11px;\n  background: var(--surface);\n  padding: 12px 13px;\n  display: grid;\n  grid-template-columns: 30px minmax(0,1fr) auto;\n  gap: 11px;\n  align-items: center;\n  text-align: left;\n  cursor: pointer;}\n.dockyard-root .stage:hover , .dockyard-root .stage.active { border-color: color-mix(in srgb, var(--accent) 45%, var(--line)); background: var(--surface-accent);}\n.dockyard-root .stage-state { width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center; color: var(--neutral); background: var(--neutral-bg);}\n.dockyard-root .stage.done .stage-state { color: var(--success); background: var(--success-bg);}\n.dockyard-root .stage.running .stage-state { color: var(--accent-ink); background: var(--surface-accent);}\n.dockyard-root .stage.waiting .stage-state { color: var(--warning); background: var(--warning-bg);}\n.dockyard-root .stage-copy strong { display: block; font-size: 13px;}\n.dockyard-root .stage-copy span { display: block; margin-top: 2px; color: var(--text-2); font-size: 12px;}\n.dockyard-root .detail-panel { padding: 20px; position: sticky; top: 94px; align-self: start;}\n.dockyard-root .detail-panel h2 { margin: 8px 0 10px; font-size: 20px;}\n.dockyard-root .audit-list { display: grid; gap: 11px; margin-top: 16px;}\n.dockyard-root .audit-row { display: grid; grid-template-columns: 28px minmax(0,1fr); gap: 10px; font-size: 13px;}\n.dockyard-root .audit-row .activity-icon { width: 28px; height: 28px; border-radius: 8px;}\n.dockyard-root .workflow-layout { display: grid; grid-template-columns: minmax(0,1.45fr) minmax(330px,.7fr); gap: 18px;}\n.dockyard-root .workflow-card { padding: 20px;}\n.dockyard-root .workflow-graph { width: 100%; min-height: 220px; margin-top: 16px; border-radius: 13px; background: var(--surface-soft); border: 1px solid var(--line);}\n.dockyard-root .workflow-graph text { fill: var(--text); font: 650 11px -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif;}\n.dockyard-root .workflow-graph .node { fill: var(--surface); stroke: var(--line-strong); stroke-width: 1.5;}\n.dockyard-root .workflow-graph .node-done { fill: var(--success-bg); stroke: var(--success);}\n.dockyard-root .workflow-graph .node-running { fill: var(--surface-accent); stroke: var(--accent);}\n.dockyard-root .workflow-graph .node-waiting { fill: var(--warning-bg); stroke: var(--warning); stroke-dasharray: 4 3;}\n.dockyard-root .workflow-graph .node-queued { fill: var(--neutral-bg); stroke: var(--neutral);}\n.dockyard-root .workflow-graph .edge { fill: none; stroke: var(--line-strong); stroke-width: 2;}\n.dockyard-root .workflow-graph .edge-live { stroke: var(--accent); stroke-dasharray: 8 7; animation: flow 1.1s linear infinite;}\n.dockyard-root @keyframes flow { to { stroke-dashoffset: -30;}\n.dockyard-root .legend { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 12px; color: var(--text-2); font-size: 12px;}\n.dockyard-root .legend span { display: inline-flex; align-items: center; gap: 6px;}\n.dockyard-root .legend i { width: 9px; height: 9px; border-radius: 3px; background: var(--neutral);}\n.dockyard-root .saved-list { display: grid; gap: 9px; margin-top: 15px;}\n.dockyard-root .saved-workflow { border: 1px solid var(--line); border-radius: 11px; padding: 13px; display: flex; align-items: center; justify-content: space-between; gap: 10px; background: var(--surface);}\n.dockyard-root .notification-wrap { position: relative;}\n.dockyard-root .popover {\n  position: absolute;\n  right: 0;\n  top: calc(100% + 10px);\n  z-index: 80;\n  width: min(390px, calc(100vw - 24px));\n  padding: 10px;\n  border: 1px solid var(--line);\n  border-radius: var(--radius-lg);\n  background: var(--surface-raised);\n  box-shadow: var(--shadow);\n  display: none;}\n.dockyard-root .popover.open { display: block;}\n.dockyard-root .popover-head { padding: 7px 8px 12px;}\n.dockyard-root .popover-head h2 { margin: 0; font-size: 16px;}\n.dockyard-root .notification {\n  width: 100%;\n  border: 0;\n  border-radius: 10px;\n  padding: 11px;\n  background: transparent;\n  display: grid;\n  grid-template-columns: 30px minmax(0,1fr);\n  gap: 10px;\n  text-align: left;\n  cursor: pointer;}\n.dockyard-root .notification:hover { background: var(--surface-soft);}\n.dockyard-root .notification strong { display: block; font-size: 13px;}\n.dockyard-root .notification span { display: block; margin-top: 2px; color: var(--text-2); font-size: 12px;}\n.dockyard-root .overlay {\n  position: fixed;\n  inset: 0;\n  z-index: 100;\n  display: none;\n  background: rgba(12, 17, 28, .42);\n  backdrop-filter: blur(3px);}\n.dockyard-root .overlay.open { display: flex;}\n.dockyard-root .modal-shell { width: 100%; min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px;}\n.dockyard-root .modal {\n  width: min(560px, 100%);\n  max-height: min(820px, calc(100vh - 48px));\n  overflow: auto;\n  border: 1px solid var(--line);\n  border-radius: 18px;\n  background: var(--surface-raised);\n  box-shadow: var(--shadow);}\n.dockyard-root .modal.wide { width: min(760px, 100%);}\n.dockyard-root .modal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px 22px 16px; border-bottom: 1px solid var(--line);}\n.dockyard-root .modal-head h2 { margin: 0; font-size: 21px; letter-spacing: -0.02em;}\n.dockyard-root .modal-head p { margin: 5px 0 0; color: var(--text-2); font-size: 13px;}\n.dockyard-root .modal-body { padding: 20px 22px;}\n.dockyard-root .modal-foot { display: flex; justify-content: flex-end; gap: 9px; padding: 16px 22px 20px; border-top: 1px solid var(--line);}\n.dockyard-root .drawer-shell { margin-left: auto; width: min(560px, 100%); min-height: 100%; background: var(--surface-raised); box-shadow: var(--shadow); overflow: auto;}\n.dockyard-root .drawer-head { position: sticky; top: 0; z-index: 2; background: var(--surface-raised); display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 22px; border-bottom: 1px solid var(--line);}\n.dockyard-root .drawer-head h2 { margin: 0; font-size: 22px;}\n.dockyard-root .drawer-body { padding: 22px;}\n.dockyard-root .form-grid { display: grid; gap: 15px;}\n.dockyard-root .field { display: grid; gap: 7px;}\n.dockyard-root .field label , .dockyard-root .field-label { font-size: 13px; font-weight: 720;}\n.dockyard-root .field input , .dockyard-root .field select , .dockyard-root .field textarea {\n  width: 100%;\n  min-height: 42px;\n  border: 1px solid var(--line-strong);\n  border-radius: 10px;\n  background: var(--surface);\n  color: var(--text);\n  padding: 9px 11px;}\n.dockyard-root .field textarea { min-height: 104px; resize: vertical;}\n.dockyard-root .helper { color: var(--text-3); font-size: 12px;}\n.dockyard-root .wizard-shell { margin-left: auto; width: min(720px, 100%); min-height: 100%; background: var(--surface-raised); box-shadow: var(--shadow); display: grid; grid-template-rows: auto auto minmax(0,1fr) auto;}\n.dockyard-root .wizard-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 23px 24px 16px;}\n.dockyard-root .wizard-head h2 { margin: 0; font-size: 24px; letter-spacing: -0.03em;}\n.dockyard-root .wizard-head p { margin: 6px 0 0; color: var(--text-2); font-size: 13px;}\n.dockyard-root .stepper { display: grid; grid-template-columns: repeat(4,1fr); padding: 0 24px 17px; gap: 7px;}\n.dockyard-root .step-track { height: 5px; border-radius: 999px; background: var(--neutral-bg);}\n.dockyard-root .step-track.active { background: var(--accent);}\n.dockyard-root .wizard-body { overflow: auto; padding: 22px 24px; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);}\n.dockyard-root .wizard-step { display: none;}\n.dockyard-root .wizard-step.active { display: block; animation: screen-in 180ms var(--ease);}\n.dockyard-root .wizard-step h3 { margin: 0; font-size: 21px;}\n.dockyard-root .wizard-step > p { margin: 7px 0 18px; color: var(--text-2);}\n.dockyard-root .template-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 11px;}\n.dockyard-root .template-card { border: 1px solid var(--line); border-radius: 13px; background: var(--surface); padding: 15px; text-align: left; cursor: pointer;}\n.dockyard-root .template-card:hover { border-color: var(--line-strong);}\n.dockyard-root .template-card.selected { border-color: var(--accent); background: var(--surface-accent);}\n.dockyard-root .template-card strong { display: block; margin: 10px 0 4px;}\n.dockyard-root .template-card span { color: var(--text-2); font-size: 12px;}\n.dockyard-root .template-tools { display: flex; gap: 8px; margin-top: 13px; flex-wrap: wrap;}\n.dockyard-root .dropzone { min-height: 160px; border: 1px dashed var(--line-strong); border-radius: 13px; background: var(--surface-soft); display: grid; place-items: center; text-align: center; padding: 24px; cursor: pointer;}\n.dockyard-root .dropzone:hover { border-color: var(--accent); background: var(--surface-accent);}\n.dockyard-root .upload-list { display: grid; gap: 8px; margin-top: 13px;}\n.dockyard-root .upload-row { border: 1px solid var(--line); border-radius: 10px; padding: 11px; display: flex; align-items: center; gap: 10px;}\n.dockyard-root .upload-row strong { display: block; font-size: 13px;}\n.dockyard-root .upload-row span { display: block; color: var(--text-2); font-size: 11px;}\n.dockyard-root .choice-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 9px;}\n.dockyard-root .choice { border: 1px solid var(--line); border-radius: 11px; background: var(--surface); padding: 12px; cursor: pointer; text-align: left;}\n.dockyard-root .choice.selected { border-color: var(--accent); background: var(--surface-accent);}\n.dockyard-root .wizard-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 17px 24px 21px;}\n.dockyard-root .toast-region { position: fixed; right: 22px; bottom: 22px; z-index: 150; display: grid; gap: 8px; pointer-events: none;}\n.dockyard-root .toast { min-width: 260px; max-width: 390px; padding: 12px 14px; border-radius: 11px; background: var(--text); color: var(--surface); box-shadow: var(--shadow); font-size: 13px; animation: toast-in 180ms var(--ease);}\n.dockyard-root @keyframes toast-in { from { opacity: 0; transform: translateY(5px);}\n.dockyard-root to { opacity: 1; transform: none;}\n.dockyard-root .theme-sun { display: none;}\n.dockyard-root html[data-theme=\"dark\"] .theme-sun { display: block;}\n.dockyard-root html[data-theme=\"dark\"] .theme-moon { display: none;}\n@media (max-width: 1100px){.dockyard-root .nav-pill span.label { display: none;}\n.dockyard-root .project-row { grid-template-columns: minmax(220px,1.3fr) 110px 120px auto;}\n.dockyard-root .project-row .hide-md { display: none;}\n.dockyard-root .grid-2 , .dockyard-root .team-layout , .dockyard-root .loop-layout , .dockyard-root .workflow-layout { grid-template-columns: 1fr;}\n.dockyard-root .detail-panel { position: static;}\n.dockyard-root .metric-strip { grid-template-columns: repeat(2,1fr);}}\n@media (max-width: 760px){.dockyard-root .appbar-inner { padding-inline: 14px; gap: 10px;}\n.dockyard-root .brand span { display: none;}\n.dockyard-root .shell { padding: 24px 14px 50px;}\n.dockyard-root .page-head { flex-direction: column;}\n.dockyard-root .page-actions { justify-content: flex-start;}\n.dockyard-root .attention-card , .dockyard-root .goal-card { grid-template-columns: 1fr;}\n.dockyard-root .grid-even , .dockyard-root .registry , .dockyard-root .kpi-grid , .dockyard-root .evidence-grid , .dockyard-root .template-grid , .dockyard-root .choice-grid { grid-template-columns: 1fr;}\n.dockyard-root .metric-strip { grid-template-columns: 1fr;}\n.dockyard-root .project-row { grid-template-columns: minmax(0,1fr) auto; gap: 10px;}\n.dockyard-root .project-row .hide-sm { display: none;}\n.dockyard-root .backlog-item { grid-template-columns: 36px minmax(0,1fr) auto;}\n.dockyard-root .backlog-item .hide-sm { display: none;}\n.dockyard-root .approval-top { grid-template-columns: 38px minmax(0,1fr);}\n.dockyard-root .approval-top > .badge { grid-column: 2; width: max-content;}\n.dockyard-root .modal-shell { padding: 10px;}\n.dockyard-root .modal { max-height: calc(100vh - 20px);}\n.dockyard-root .wizard-shell { width: 100%;}}\n@media (prefers-reduced-motion: reduce){.dockyard-root * , .dockyard-root *::before , .dockyard-root *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important;}}"
const V4_SPRITE = "<svg class=\"sr-only\" aria-hidden=\"true\" focusable=\"false\" xmlns=\"http://www.w3.org/2000/svg\">\n  <symbol id=\"i-dock\" viewBox=\"0 0 24 24\"><path d=\"M4 18h16M6 18l2-9h8l2 9M9 9V6h6v3M8 14h8\"/></symbol>\n  <symbol id=\"i-home\" viewBox=\"0 0 24 24\"><path d=\"M3 11.5 12 4l9 7.5M5.5 10v9h13v-9M9.5 19v-5h5v5\"/></symbol>\n  <symbol id=\"i-project\" viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"M3 9h18M8 4v5\"/></symbol>\n  <symbol id=\"i-backlog\" viewBox=\"0 0 24 24\"><path d=\"M8 6h13M8 12h13M8 18h13\"/><circle cx=\"4\" cy=\"6\" r=\"1\"/><circle cx=\"4\" cy=\"12\" r=\"1\"/><circle cx=\"4\" cy=\"18\" r=\"1\"/></symbol>\n  <symbol id=\"i-approval\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m8 12 2.6 2.6L16.5 9\"/></symbol>\n  <symbol id=\"i-bots\" viewBox=\"0 0 24 24\"><rect x=\"4\" y=\"7\" width=\"16\" height=\"12\" rx=\"3\"/><path d=\"M9 12h.01M15 12h.01M9 16h6M12 7V4M10 4h4\"/></symbol>\n  <symbol id=\"i-initiative\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"8\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M12 2v2M22 12h-2M12 22v-2M2 12h2\"/></symbol>\n  <symbol id=\"i-workflow\" viewBox=\"0 0 24 24\"><rect x=\"3\" y=\"3\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"15\" y=\"15\" width=\"6\" height=\"6\" rx=\"1\"/><path d=\"M9 6h4a5 5 0 0 1 5 5v4M15 18h-4a5 5 0 0 1-5-5V9\"/></symbol>\n  <symbol id=\"i-plus\" viewBox=\"0 0 24 24\"><path d=\"M12 5v14M5 12h14\"/></symbol>\n  <symbol id=\"i-bell\" viewBox=\"0 0 24 24\"><path d=\"M6 9a6 6 0 0 1 12 0c0 7 3 7 3 7H3s3 0 3-7M10 20h4\"/></symbol>\n  <symbol id=\"i-moon\" viewBox=\"0 0 24 24\"><path d=\"M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z\"/></symbol>\n  <symbol id=\"i-sun\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4\"/></symbol>\n  <symbol id=\"i-chevron\" viewBox=\"0 0 24 24\"><path d=\"m9 6 6 6-6 6\"/></symbol>\n  <symbol id=\"i-close\" viewBox=\"0 0 24 24\"><path d=\"m6 6 12 12M18 6 6 18\"/></symbol>\n  <symbol id=\"i-alert\" viewBox=\"0 0 24 24\"><path d=\"M12 3 2.8 20h18.4L12 3Z\"/><path d=\"M12 9v4M12 17h.01\"/></symbol>\n  <symbol id=\"i-heart\" viewBox=\"0 0 24 24\"><path d=\"M20.8 5.8a5.2 5.2 0 0 0-7.4 0L12 7.2l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 22l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z\"/></symbol>\n  <symbol id=\"i-activity\" viewBox=\"0 0 24 24\"><path d=\"M3 12h4l2-6 4 12 2-6h6\"/></symbol>\n  <symbol id=\"i-target\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><circle cx=\"12\" cy=\"12\" r=\"5\"/><circle cx=\"12\" cy=\"12\" r=\"1\"/></symbol>\n  <symbol id=\"i-milestone\" viewBox=\"0 0 24 24\"><path d=\"M5 21V4M5 5h12l-2 4 2 4H5\"/></symbol>\n  <symbol id=\"i-drag\" viewBox=\"0 0 24 24\"><circle cx=\"9\" cy=\"7\" r=\"1\"/><circle cx=\"15\" cy=\"7\" r=\"1\"/><circle cx=\"9\" cy=\"12\" r=\"1\"/><circle cx=\"15\" cy=\"12\" r=\"1\"/><circle cx=\"9\" cy=\"17\" r=\"1\"/><circle cx=\"15\" cy=\"17\" r=\"1\"/></symbol>\n  <symbol id=\"i-evidence\" viewBox=\"0 0 24 24\"><path d=\"M6 3h9l4 4v14H6zM14 3v5h5M9 12h6M9 16h6\"/></symbol>\n  <symbol id=\"i-freeze\" viewBox=\"0 0 24 24\"><path d=\"M12 2v20M4.2 6.5l15.6 9M4.2 17.5l15.6-9M8 4l4 3 4-3M8 20l4-3 4 3M3.8 10l4.5 2-4.5 2M20.2 10l-4.5 2 4.5 2\"/></symbol>\n  <symbol id=\"i-upload\" viewBox=\"0 0 24 24\"><path d=\"M12 16V4M7 9l5-5 5 5M4 15v5h16v-5\"/></symbol>\n  <symbol id=\"i-folder\" viewBox=\"0 0 24 24\"><path d=\"M3 6h7l2 2h9v11H3z\"/></symbol>\n  <symbol id=\"i-clock\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 7v5l3 2\"/></symbol>\n  <symbol id=\"i-pause\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M10 9v6M14 9v6\"/></symbol>\n  <symbol id=\"i-play\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"m10 8 6 4-6 4z\"/></symbol>\n  <symbol id=\"i-search\" viewBox=\"0 0 24 24\"><circle cx=\"10.5\" cy=\"10.5\" r=\"6.5\"/><path d=\"m16 16 5 5\"/></symbol>\n  <symbol id=\"i-info\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6M12 7h.01\"/></symbol>\n  <symbol id=\"i-code\" viewBox=\"0 0 24 24\"><path d=\"m8 9-3 3 3 3M16 9l3 3-3 3M14 5l-4 14\"/></symbol>\n  <symbol id=\"i-shield\" viewBox=\"0 0 24 24\"><path d=\"M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z\"/><path d=\"m9 12 2 2 4-4\"/></symbol>\n</svg>"

let _rest = null
function bindRest(ctx) { _rest = ctx.rest }

async function api(path, init) {
  try {
    return await _rest(path, { method: init?.method ?? 'GET', body: init?.body })
  } catch (e) {
    throw new Error(String(e?.message ?? e).slice(0, 120))
  }
}

function useChrome() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = V4_CSS
    document.head.appendChild(style)
    const wrap = document.createElement('div')
    wrap.style.display = 'none'
    wrap.innerHTML = V4_SPRITE
    document.body.appendChild(wrap)
    return () => { style.remove(); wrap.remove() }
  }, [])
}

/* ---------- shared bits (v4 classes) ---------- */

function PageHead({ title, sub, right }) {
  return jsxs('div', { className: 'page-head', children: [
    jsxs('div', { children: [jsx('h1', { children: title }), jsx('p', { children: sub })] }),
    right && jsx('div', { className: 'page-actions', children: right }),
  ]})
}

function Owed({ n }) {
  return jsxs('span', { className: 'owed', children: [
    jsx('span', { className: 'status-dot' }),
    `${n} decision${n === 1 ? '' : 's'} owed`,
  ]})
}

function EmptyCard({ icon, label, title, sub, action }) {
  return jsxs('div', { className: 'card', style: { padding: '56px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }, children: [
    jsxs('span', { className: 'activity-icon', style: { width: 48, height: 48 }, children: [
      jsx('svg', { className: 'icon', style: { width: 22, height: 22 }, 'aria-hidden': true,
        children: jsx('use', { href: `#${icon}` }) }),
    ]}),
    jsx('span', { className: 'mini-label', children: label }),
    jsx('h2', { className: 'section-title', style: { margin: 0 }, children: title }),
    jsx('p', { className: 'section-sub', style: { maxWidth: 380 }, children: sub }),
    action,
  ]})
}

function Loading() {
  return jsxs('div', { className: 'card', style: { padding: '56px 24px', textAlign: 'center' }, children: [
    jsx('span', { className: 'mini-label', children: 'LOADING' }),
    jsx('p', { className: 'section-sub', children: 'Fetching the fleet state…' }),
  ]})
}

function ErrorBox({ error, onRetry }) {
  return jsxs('div', { className: 'card approval-card', children: [
    jsxs('div', { className: 'approval-top', children: [
      jsxs('span', { className: 'activity-icon', style: { color: 'var(--danger)', background: 'var(--danger-bg)' }, children: [
        jsx('svg', { className: 'icon', 'aria-hidden': true, children: jsx('use', { href: '#i-alert' }) }),
      ]}),
      jsxs('div', { className: 'approval-title', children: [
        jsx('h2', { children: 'Cannot reach the Dockyard service' }),
        jsx('p', { children: String(error) }),
      ]}),
    ]}),
    jsxs('div', { className: 'approval-actions', children: [
      jsx('button', { type: 'button', className: 'button primary', onClick: onRetry, children: 'Retry now' }),
    ]}),
  ]})
}

/* ---------- Dashboard tab (v4 s1: fleet home) ---------- */

function healthBadge(health) {
  const map = {
    healthy: ['success', 'Healthy'],
    watch: ['warning', 'Watch'],
    frozen: ['danger', 'Frozen'],
    attention: ['danger', 'Needs attention'],
  }
  const [cls, label] = map[health] || ['neutral', 'Unknown']
  return jsxs('span', { className: `badge ${cls}`, children: [
    jsx('span', { className: 'status-dot' }), label,
  ]})
}

function renderDashboard(view, goInbox) {
  const projects = view.projects ?? []
  if (projects.length === 0) {
    return jsx(EmptyCard, {
      icon: 'i-project', label: 'NO PROJECTS YET',
      title: 'Your fleet starts with one project',
      sub: 'Onboarding walks you through creating a project, adding work and inviting bots. It takes under a minute.',
      action: jsx('code', {
        style: { padding: '8px 14px', borderRadius: 'var(--radius-sm, 8px)', background: 'var(--surface-soft, #f8f9fc)', border: '1px solid var(--line, #dfe3eb)', fontFamily: 'ui-monospace, monospace', fontSize: 12.5 },
        children: 'hermes dockyard onboard',
      }),
    })
  }

  const owed = view.owed_decisions ?? 0
  const totals = view.totals ?? {}
  const active = totals.active_work ?? projects.reduce((a, p) => a + ((p.work?.active) ?? 0), 0)
  const blocked = totals.blocked ?? projects.reduce((a, p) => a + ((p.work?.blocked) ?? 0), 0)
  const done = projects.reduce((a, p) => a + ((p.work?.done) ?? 0), 0)
  const healthy = projects.filter(p => p.health === 'healthy').length

  return jsxs(Fragment, { children: [
    jsx(PageHead, {
      title: 'Your fleet, without the noise',
      sub: `${projects.length} project${projects.length === 1 ? '' : 's'} under watch. The system surfaces only the calls that are yours to make.`,
      right: owed > 0 ? jsx(Owed, { n: owed }) : null,
    }),

    owed > 0 && jsxs('div', { className: 'attention-card elevated', children: [
      jsxs('div', { children: [
        jsx('div', { className: 'mini-label', children: 'NEEDS YOUR DECISION' }),
        jsx('div', { className: 'attention-number', children: owed }),
        jsx('div', { className: 'small-text', style: { marginTop: 10 }, children: 'Each decision carries evidence and a safe rollback.' }),
        jsx('button', { type: 'button', className: 'button primary small', style: { marginTop: 16 }, onClick: goInbox,
          children: 'Review decisions' }),
      ]}),
    ]}),

    jsxs('div', { className: 'metric-strip', 'aria-label': 'Fleet summary', children: [
      jsxs('div', { className: 'metric', children: [
        jsx('span', { className: 'mini-label', children: 'PROJECT HEALTH' }),
        jsx('strong', { children: `${healthy} healthy` }),
        jsx('span', { className: 'delta', children: `${projects.length - healthy} other` }),
      ]}),
      jsxs('div', { className: 'metric', children: [
        jsx('span', { className: 'mini-label', children: 'ACTIVE WORK' }),
        jsx('strong', { children: `${active} items` }),
        jsx('span', { className: 'delta', children: `${blocked} blocked` }),
      ]}),
      jsxs('div', { className: 'metric', children: [
        jsx('span', { className: 'mini-label', children: 'COMPLETED' }),
        jsx('strong', { children: `${done} items` }),
        jsx('span', { className: 'delta', children: 'all time' }),
      ]}),
      jsxs('div', { className: 'metric', children: [
        jsx('span', { className: 'mini-label', children: 'DECISIONS OWED' }),
        jsx('strong', { style: owed > 0 ? { color: 'var(--accent)' } : { color: 'var(--success)' },
          children: owed > 0 ? String(owed) : 'None' }),
        jsx('span', { className: 'delta', children: owed > 0 ? 'waiting on you' : 'nothing pending' }),
      ]}),
    ]}),

    jsx('div', { className: 'card project-list', children:
      jsxs(Fragment, { children: [
        jsxs('div', { className: 'card-pad spread', children: [
          jsxs('div', { children: [
            jsx('h2', { className: 'section-title', children: 'Projects' }),
            jsx('p', { className: 'section-sub', children: 'Health, active work and who owns the next move.' }),
          ]}),
        ]}),
        projects.map((p) => jsxs('button', {
          type: 'button', className: 'project-row',
          onClick: () => host.navigate('/dockyard'),
          children: [
            jsxs('span', { className: 'project-name', children: [
              jsxs('span', { className: 'project-icon', children: [
                jsx('svg', { className: 'icon', 'aria-hidden': true, children: jsx('use', { href: '#i-project' }) }),
              ]}),
              jsxs('span', { children: [
                jsx('strong', { children: p.id }),
                jsx('span', { children: p.phase ? `Phase: ${p.phase}` : 'No phase set' }),
              ]}),
            ]}),
            healthBadge(p.health),
            jsxs('span', { children: [
              jsx('strong', { children: `${p.work?.active ?? 0} active` }),
              jsx('span', { className: 'small-text', children: p.work?.blocked ? `${p.work.blocked} blocked` : 'nothing blocked' }),
            ]}),
            jsx('svg', { className: 'icon', 'aria-hidden': true, children: jsx('use', { href: '#i-chevron' }) }),
          ],
        }, p.id)),
      ]}),
    }),
  ]})
}

/* ---------- Inbox tab (v4 s4: approval cards) ---------- */

function renderInbox(view, refresh) {
  const items = view.items ?? []
  if (items.length === 0) {
    return jsx(EmptyCard, {
      icon: 'i-approval', label: 'INBOX ZERO',
      title: 'Nothing is waiting on you',
      sub: 'New requests appear here with evidence and a safe rollback, so you can decide without leaving this page.',
    })
  }

  return jsxs(Fragment, { children: [
    jsx(PageHead, {
      title: 'Approval Inbox',
      sub: 'Every pending human decision across every project, with enough evidence to decide here.',
      right: jsx(Owed, { n: items.length }),
    }),
    jsx('div', { className: 'approval-list', children:
      items.map((it) => jsx(ApprovalCard, { item: it, refresh }, it.ref)),
    }),
  ]})
}

function ApprovalCard({ item, refresh }) {
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState(null)
  const [decided, setDecided] = useState(null)

  const decide = async () => {
    setBusy(true); setFail(null)
    try {
      await api(`/initiatives/${encodeURIComponent(item.ref)}/approve`, { method: 'POST', body: {} })
      setDecided('approved')
      refresh()
    } catch (e) {
      setBusy(false)
      setFail(String(e).slice(0, 80))
    }
  }

  if (decided === 'approved') {
    return jsxs('article', { className: 'card approval-card resolved', children: [
      jsxs('div', { className: 'approval-top', children: [
        jsxs('span', { className: 'activity-icon', style: { color: 'var(--success)', background: 'var(--success-bg)' }, children: [
          jsx('svg', { className: 'icon', 'aria-hidden': true, children: jsx('use', { href: '#i-approval' }) }),
        ]}),
        jsxs('div', { className: 'approval-title', children: [
          jsx('h2', { children: item.title }),
          jsx('p', { children: `${item.project || item.project_id || ''} / approved just now` }),
        ]}),
        jsx('span', { className: 'badge success', children: 'Approved' }),
      ]}),
    ]})
  }

  return jsxs('article', { className: 'card approval-card', children: [
    jsxs('div', { className: 'approval-top', children: [
      jsxs('span', { className: 'activity-icon', style: { color: 'var(--warning)', background: 'var(--warning-bg)' }, children: [
        jsx('svg', { className: 'icon', 'aria-hidden': true, children: jsx('use', { href: '#i-milestone' }) }),
      ]}),
      jsxs('div', { className: 'approval-title', children: [
        jsx('h2', { children: item.title }),
        jsx('p', { children: `${item.project || item.project_id || ''} / ${item.ref}` }),
      ]}),
      jsx('span', { className: `badge ${item.risk === 'high' ? 'danger' : 'warning'}`,
        children: `${(item.risk || 'medium').charAt(0).toUpperCase()}${(item.risk || 'medium').slice(1)} risk` }),
    ]}),
    jsxs('div', { className: 'approval-actions', children: [
      jsx('button', { type: 'button', className: 'button primary', disabled: busy, onClick: decide,
        children: busy ? 'Approving…' : 'Approve' }),
      fail && jsx('span', { className: 'badge danger', children: fail }),
      !fail && jsx('span', { className: 'badge neutral decision-state', children: 'Awaiting you' }),
    ]}),
  ]})
}

/* ---------- Notifications tab (v4 activity-list language) ---------- */

function renderNotifications(view, refresh) {
  const notes = view.notifications ?? []
  if (notes.length === 0) {
    return jsx(EmptyCard, {
      icon: 'i-bell', label: 'ALL CLEAR',
      title: 'No notifications',
      sub: 'Fleet events land here when bots need attention, work completes, or a decision becomes yours.',
    })
  }

  return jsxs(Fragment, { children: [
    jsx(PageHead, {
      title: 'Notifications',
      sub: 'Attributed fleet events that need your eyes. Acknowledge to clear them.',
      right: jsx(Owed, { n: notes.filter(n => !n.acked).length }),
    }),
    jsx('div', { className: 'card', children:
      jsx('div', { className: 'activity-list', children:
        notes.map((n) => jsx(NotificationRow, { n, refresh }, String(n.id))),
      }),
    }),
  ]})
}

function NotificationRow({ n, refresh }) {
  const [acked, setAcked] = useState(Boolean(n.acked))
  const [busy, setBusy] = useState(false)

  const ack = async () => {
    setBusy(true)
    try {
      await api(`/notifications/${n.id}/ack`, { method: 'POST', body: {} })
      setAcked(true)
      refresh()
    } catch { /* keep row active; button re-enables */ }
    setBusy(false)
  }

  return jsxs('div', { className: 'activity-item', style: acked ? { opacity: 0.5 } : undefined, children: [
    jsxs('span', { className: 'activity-icon', style: { color: 'var(--accent)', background: 'var(--surface-accent)' }, children: [
      jsx('svg', { className: 'icon icon-sm', 'aria-hidden': true, children: jsx('use', { href: '#i-bell' }) }),
    ]}),
    jsxs('span', { children: [
      jsx('p', { children: n.title ?? n.summary ?? '' }),
      jsx('time', { children: n.body ?? '' }),
    ]}),
    !acked && jsx('button', {
      type: 'button', className: 'button quiet small', disabled: busy,
      style: { marginLeft: 'auto' }, onClick: ack,
      children: busy ? '…' : 'Acknowledge',
    }),
    acked && jsx('span', { className: 'badge neutral', style: { marginLeft: 'auto' }, children: 'Cleared' }),
  ]})
}

/* ---------- Page shell + registration ---------- */

function DashboardPage() {
  useChrome()
  const [tab, setTab] = useState('dashboard')
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let live = true
    setError(null)
    const path =
      tab === 'dashboard' ? '/dashboard' :
      tab === 'inbox' ? '/inbox' : '/notifications'
    api(path).then(
      (d) => { if (live) setData(d) },
      (e) => { if (live) setError(e) },
    )
    return () => { live = false }
  }, [tab, tick])

  const refresh = () => setTick(t => t + 1)

  const tabs = [
    ['dashboard', 'Dashboard', 'i-home'],
    ['inbox', 'Approval Inbox', 'i-approval'],
    ['notifications', 'Notifications', 'i-bell'],
  ]

  return jsxs('div', {
    className: 'dockyard-root',
    style: {
      colorScheme: 'light',
      background: 'var(--bg, #f5f7fb)',
      minHeight: '100%',
      padding: '20px 22px',
      fontFamily: 'inherit',
    },
    children: [
      jsxs('div', { className: 'rail-tabs', style: { display: 'flex', gap: 8, marginBottom: 16 }, children:
        tabs.map(([key, label, icon]) => jsx('button', {
          type: 'button',
          onClick: () => setTab(key),
          className: `button small${tab === key ? ' primary' : ''}`,
          children: label,
        }, key)),
      }),
      error
        ? jsx(ErrorBox, { error, onRetry: refresh })
        : !data
          ? jsx(Loading)
          : tab === 'dashboard'
            ? renderDashboard(data, () => setTab('inbox'))
            : tab === 'inbox'
              ? renderInbox(data, refresh)
              : renderNotifications(data, refresh),
    ],
  })
}

const __plugin = {
  id: 'hermes-dockyard',
  name: 'Hermes Dockyard',
  register(ctx) {
    bindRest(ctx)
    ctx.registerMany([
      {
        id: 'page',
        area: 'routes',
        data: { path: '/dockyard' },
        render: () => jsx(DashboardPage, {}),
      },
      {
        id: 'nav',
        area: 'sidebar.nav',
        order: 55,
        data: { codicon: 'project', label: 'Dockyard', path: '/dockyard' },
      },
      {
        id: 'open',
        area: 'palette',
        data: {
          id: 'hermes-dockyard.open',
          label: 'Dockyard: Open fleet overview',
          keywords: ['dockyard', 'fleet', 'projects', 'inbox'],
          run: () => host.navigate('/dockyard'),
        },
      },
    ])
  },
}

export default __plugin
