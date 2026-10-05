// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
// Sahil 04/10 (demo feedback d): one global project switcher, with "All
// projects"; the Roadmap and Notifications pickers go. Design round 05/10:
// three working directions on the real screens, Sahil picks one and the
// others are removed.
//   A  Breadcrumb   "Dockyard / [Project]" with a search popover (Vercel, GitHub)
//   B  Palette      a chip that opens a centred, keyboard-first palette (Linear)
//   C  Project row  every project one click away, in a row under the top bar
// The labels "Project context", "Find project" and "Projects" are kept so the
// existing journeys keep driving the switcher (A and B).
import { useEffect } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { useState } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { Icon } from './ui.js'

// The "All projects" choice. "*" can never be a project id (the backend
// stores the same value for the app to reopen on).
export const ALL_PROJECTS = '*'
export const SWITCHER_VARIANTS = Object.freeze(['a', 'b', 'c'])

const HEALTH = Object.freeze({
  critical: ['danger', 'Critical'],
  frozen: ['danger', 'Frozen'],
  attention: ['danger', 'Needs attention'],
  degraded: ['warning', 'Degraded'],
  watch: ['warning', 'Watch'],
  healthy: ['success', 'Healthy'],
})
// Unknown health shows nothing: an empty grey dot reads as a status it is not.
export const healthOf = (project) => HEALTH[project?.health] ?? [null, '']
export const projectName = (project) => project?.name || project?.id || ''
const initials = (label) => String(label).split(/[^A-Za-z0-9]+/).filter(Boolean).slice(0, 2)
  .map((part) => part[0]).join('').toUpperCase() || '?'
const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`

export function projectMeta(project) {
  const work = project?.work ?? {}
  const parts = []
  // "active" is the ordinary phase; only an unusual phase (paused, discovery...) is worth saying.
  if (project?.phase && String(project.phase).toLowerCase() !== 'active') parts.push(String(project.phase).replace(/[_-]+/g, ' ').replace(/^./, (c) => c.toUpperCase()))
  if (Number(work.active) > 0) parts.push(`${work.active} in progress`)
  if (Number(work.blocked) > 0) parts.push(`${work.blocked} blocked`)
  if (!Number(work.active) && !Number(work.blocked) && Number(work.backlog) > 0) parts.push(`${work.backlog} in backlog`)
  return parts.join(' · ')
}

// Initials are drawn by CSS (attr()), not written as text: a project's name
// reads exactly ("atlas-mobile", not "AM atlas-mobile") for screen readers,
// copy and the journeys that read the switcher.
export function ProjectAvatar({ project, all = false, size = '' }) {
  return jsx('span', {
    className: `dy-sw-avatar${size ? ` ${size}` : ''}`,
    'data-all': all ? 'true' : undefined,
    'data-initials': all ? undefined : initials(projectName(project)),
    'aria-hidden': true,
    children: all ? jsx(Icon, { name: 'layers' }) : null,
  })
}

// Search + keyboard state shared by the popover, the palette and the overflow menu.
function useSwitcherList(projects, scope, { withAll = true } = {}) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const needle = query.trim().toLowerCase()
  const entries = [
    ...(withAll && (!needle || 'all projects'.includes(needle)) ? [{ id: ALL_PROJECTS, all: true }] : []),
    ...projects
      .filter((project) => `${projectName(project)} ${project.id}`.toLowerCase().includes(needle))
      .map((project) => ({ id: project.id, project })),
  ]
  // Opening puts the cursor on the current choice, so Enter keeps it.
  const openAt = () => {
    setQuery('')
    const ids = [...(withAll ? [ALL_PROJECTS] : []), ...projects.map((project) => project.id)]
    setActive(Math.max(0, ids.indexOf(scope)))
  }
  const onKeyDown = (event, pick, close) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); return }
    if (event.key === 'Enter') { event.preventDefault(); if (entries[active]) pick(entries[active].id); return }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      const last = Math.max(0, entries.length - 1)
      setActive(event.key === 'Home' ? 0 : event.key === 'End' ? last
        : Math.max(0, Math.min(last, active + (event.key === 'ArrowDown' ? 1 : -1))))
    }
  }
  return { query, setQuery: (value) => { setQuery(value); setActive(0) }, active, setActive, entries, openAt, onKeyDown }
}

function SwitcherSearch({ idPrefix, list, onPick, onClose, placeholder = 'Find a project' }) {
  return jsxs('label', { className: 'dy-sw-search', children: [
    jsx(Icon, { name: 'search' }),
    jsx('input', {
      autoFocus: true,
      role: 'combobox',
      'aria-label': 'Find project',
      'aria-expanded': true,
      'aria-controls': `${idPrefix}-options`,
      'aria-autocomplete': 'list',
      'aria-activedescendant': list.entries[list.active] ? `${idPrefix}-option-${list.active}` : undefined,
      placeholder,
      value: list.query,
      onChange: (event) => list.setQuery(event.target.value),
      onKeyDown: (event) => list.onKeyDown(event, onPick, onClose),
    }),
  ] })
}

function SwitcherOptions({ idPrefix, list, scope, projects, onPick, rich = false }) {
  const activeId = `${idPrefix}-option-${list.active}`
  useEffect(() => { document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' }) }, [activeId])
  if (!list.entries.length) return jsx('p', { role: 'status', className: 'dy-sw-empty', children: 'No matching projects' })
  return jsx('div', { role: 'listbox', id: `${idPrefix}-options`, 'aria-label': 'Projects', className: 'dy-sw-options', children:
    list.entries.map((entry, index) => {
      const project = entry.project
      const [tone, healthLabel] = entry.all ? ['neutral', ''] : healthOf(project)
      const meta = entry.all ? `Every project · ${plural(projects.length, 'project')}` : projectMeta(project)
      return jsxs('div', {
        role: 'option',
        id: `${idPrefix}-option-${index}`,
        'aria-selected': entry.id === scope,
        'aria-label': entry.all ? 'All projects' : projectName(project),
        className: 'dy-sw-option',
        'data-active': index === list.active ? 'true' : undefined,
        'data-project-option': entry.id,
        onMouseDown: (event) => event.preventDefault(),
        onMouseMove: () => { if (index !== list.active) list.setActive(index) },
        onClick: () => onPick(entry.id),
        children: [
          jsx(ProjectAvatar, { project, all: entry.all, size: rich ? 'lg' : '' }),
          jsxs('span', { className: 'dy-sw-option-copy', children: [
            jsx('strong', { children: entry.all ? 'All projects' : projectName(project) }),
            meta ? jsx('span', { children: meta }) : null,
          ] }),
          entry.all || !tone ? null : rich
            ? jsxs('span', { className: `dy-sw-health ${tone}`, children: [jsx('span', { className: 'dy-sw-dot', 'aria-hidden': true }), healthLabel] })
            : jsx('span', { className: `dy-sw-dot ${tone}`, title: healthLabel, 'aria-hidden': true }),
          jsx('span', { className: 'dy-sw-check', 'aria-hidden': true, children: entry.id === scope ? jsx(Icon, { name: 'check' }) : null }),
        ],
      }, entry.id)
    }) })
}

function TriggerLabel({ projects, scope }) {
  const current = scope && scope !== ALL_PROJECTS ? projects.find((project) => project.id === scope) : null
  const label = scope === ALL_PROJECTS ? 'All projects' : current ? projectName(current) : (scope || 'Choose project')
  return [
    jsx(ProjectAvatar, { project: current ?? { id: label }, all: scope === ALL_PROJECTS }, 'avatar'),
    jsx('span', { className: 'dy-sw-trigger-name', children: label }, 'name'),
  ]
}

// A: breadcrumb next to the brand, with a search popover underneath.
function SwitcherA({ projects, scope, onChange, onNewProject }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef(null)
  const list = useSwitcherList(projects, scope)
  const close = (refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus() }
  const pick = (id) => { onChange(id); close() }
  return jsxs('div', {
    className: 'dy-sw dy-sw-a',
    'data-switcher': 'a',
    onBlur: (event) => { if (open && !event.currentTarget.contains(event.relatedTarget)) setOpen(false) },
    children: [
      jsx('span', { className: 'dy-sw-slash', 'aria-hidden': true, children: '/' }),
      jsxs('button', {
        ref: trigger,
        type: 'button',
        className: 'dy-sw-trigger',
        'aria-label': 'Project context',
        'aria-haspopup': 'listbox',
        'aria-expanded': open,
        'data-scope': scope ?? '',
        onClick: () => { if (!open) list.openAt(); setOpen(!open) },
        children: [...TriggerLabel({ projects, scope }), jsx('span', { className: 'dy-sw-caret', children: jsx(Icon, { name: 'arrow-up-down' }) }, 'caret')],
      }),
      open ? jsxs('div', { className: 'dy-sw-popover', role: 'dialog', 'aria-label': 'Switch project', children: [
        jsx(SwitcherSearch, { idPrefix: 'dy-sw-a', list, onPick: pick, onClose: () => close() }),
        jsx(SwitcherOptions, { idPrefix: 'dy-sw-a', list, scope, projects, onPick: pick }),
        onNewProject ? jsx('div', { className: 'dy-sw-foot', children: jsxs('button', {
          type: 'button', className: 'dy-sw-foot-action', 'data-switcher-new-project': 'true',
          onMouseDown: (event) => event.preventDefault(),
          onClick: () => { close(false); onNewProject() },
          children: [jsx(Icon, { name: 'plus' }), 'New project'],
        }) }) : null,
      ] }) : null,
    ],
  })
}

const isMac = () => /Mac|iPhone|iPad/.test(globalThis.navigator?.platform ?? '')
const isTyping = (target) => target instanceof Element && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))

// B: a chip that opens a centred palette; Ctrl/Cmd+J opens it from anywhere.
function SwitcherB({ projects, scope, onChange, onNewProject }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef(null)
  const list = useSwitcherList(projects, scope)
  const openPalette = () => { list.openAt(); setOpen(true) }
  const close = (refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus() }
  const pick = (id) => { onChange(id); close() }
  const latest = useRef(openPalette)
  latest.current = openPalette
  useEffect(() => {
    const onKey = (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey || event.key.toLowerCase() !== 'j') return
      if (isTyping(event.target) && !event.target.closest?.('.dy-sw-palette')) return
      event.preventDefault()
      latest.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const shortcut = isMac() ? '⌘J' : 'Ctrl J'
  return jsxs('div', { className: 'dy-sw dy-sw-b', 'data-switcher': 'b', children: [
    jsxs('button', {
      ref: trigger,
      type: 'button',
      className: 'dy-sw-trigger',
      'aria-label': 'Project context',
      'aria-haspopup': 'dialog',
      'aria-expanded': open,
      'aria-keyshortcuts': isMac() ? 'Meta+J' : 'Control+J',
      'data-scope': scope ?? '',
      onClick: openPalette,
      children: [...TriggerLabel({ projects, scope }), jsx('kbd', { className: 'dy-sw-kbd', children: shortcut }, 'kbd')],
    }),
    open ? jsx('div', {
      className: 'dy-sw-palette-layer',
      onMouseDown: (event) => { if (event.target === event.currentTarget) close() },
      children: jsxs('div', { className: 'dy-sw-palette', role: 'dialog', 'aria-modal': true, 'aria-label': 'Switch project',
        onKeyDown: (event) => { if (event.key === 'Tab') event.preventDefault() },
        children: [
          jsx(SwitcherSearch, { idPrefix: 'dy-sw-b', list, onPick: pick, onClose: () => close(), placeholder: 'Switch to a project…' }),
          jsx(SwitcherOptions, { idPrefix: 'dy-sw-b', list, scope, projects, onPick: pick, rich: true }),
          jsxs('div', { className: 'dy-sw-palette-foot', children: [
            jsxs('span', { children: [jsx('kbd', { children: '↑' }), jsx('kbd', { children: '↓' }), ' move  ', jsx('kbd', { children: 'Enter' }), ' switch  ', jsx('kbd', { children: 'Esc' }), ' close'] }),
            onNewProject ? jsxs('button', { type: 'button', className: 'dy-sw-foot-action', 'data-switcher-new-project': 'true',
              onClick: () => { close(false); onNewProject() }, children: [jsx(Icon, { name: 'plus' }), 'New project'] }) : null,
          ] }),
        ] }),
    }) : null,
  ] })
}

// C: every project one click away, in a row under the top bar. Projects that
// do not fit go in "More"; the chosen project always stays visible.
export function SwitcherStrip({ projects, scope, onChange, max = 5 }) {
  const [moreOpen, setMoreOpen] = useState(false)
  const more = useRef(null)
  let visible = projects.slice(0, max)
  const chosen = scope && scope !== ALL_PROJECTS ? projects.find((project) => project.id === scope) : null
  if (chosen && !visible.includes(chosen)) visible = [...visible.slice(0, max - 1), chosen]
  const overflow = projects.filter((project) => !visible.includes(project))
  const list = useSwitcherList(overflow, scope, { withAll: false })
  const chips = [{ id: ALL_PROJECTS, all: true }, ...visible.map((project) => ({ id: project.id, project }))]
  const selectedIndex = Math.max(0, chips.findIndex((chip) => chip.id === scope))
  const move = (event, index) => {
    const last = chips.length - 1
    const next = event.key === 'ArrowRight' ? Math.min(last, index + 1) : event.key === 'ArrowLeft' ? Math.max(0, index - 1)
      : event.key === 'Home' ? 0 : event.key === 'End' ? last : null
    if (next === null) return
    event.preventDefault()
    onChange(chips[next].id)
    event.currentTarget.parentElement?.querySelectorAll('[role="radio"]')[next]?.focus()
  }
  const closeMore = (refocus = true) => { setMoreOpen(false); if (refocus) more.current?.focus() }
  return jsxs('nav', { className: 'dy-sw-strip', 'data-switcher': 'c', 'aria-label': 'Project context', children: [
    jsx('div', { className: 'dy-sw-strip-chips', role: 'radiogroup', 'aria-label': 'Projects', children: chips.map((chip, index) => {
      const [tone, healthLabel] = chip.all ? ['neutral', ''] : healthOf(chip.project)
      return jsxs('button', {
        type: 'button',
        role: 'radio',
        className: 'dy-sw-chip',
        'aria-checked': chip.id === scope,
        'aria-label': chip.all ? 'All projects' : projectName(chip.project),
        'data-project-option': chip.id,
        tabIndex: index === selectedIndex ? 0 : -1,
        onClick: () => onChange(chip.id),
        onKeyDown: (event) => move(event, index),
        children: [
          jsx(ProjectAvatar, { project: chip.project, all: chip.all }),
          jsx('span', { children: chip.all ? 'All projects' : projectName(chip.project) }),
          chip.all || !tone ? null : jsx('span', { className: `dy-sw-dot ${tone}`, title: healthLabel, 'aria-hidden': true }),
        ],
      }, chip.id)
    }) }),
    overflow.length ? jsxs('div', { className: 'dy-sw dy-sw-strip-more',
      onBlur: (event) => { if (moreOpen && !event.currentTarget.contains(event.relatedTarget)) setMoreOpen(false) },
      children: [
        jsxs('button', { ref: more, type: 'button', className: 'dy-sw-chip more', 'aria-haspopup': 'listbox', 'aria-expanded': moreOpen,
          onClick: () => { if (!moreOpen) list.openAt(); setMoreOpen(!moreOpen) },
          children: [`More (${overflow.length})`, jsx(Icon, { name: 'chevron-down' })] }),
        moreOpen ? jsxs('div', { className: 'dy-sw-popover', role: 'dialog', 'aria-label': 'More projects', children: [
          jsx(SwitcherSearch, { idPrefix: 'dy-sw-c', list, onPick: (id) => { onChange(id); closeMore() }, onClose: () => closeMore() }),
          jsx(SwitcherOptions, { idPrefix: 'dy-sw-c', list, scope, projects: overflow, onPick: (id) => { onChange(id); closeMore() } }),
        ] }) : null,
      ] }) : null,
  ] })
}

// The switcher that lives inside the top bar (A or B). C renders its own row.
export function ProjectSwitcher({ variant = 'a', ...props }) {
  if (variant === 'b') return jsx(SwitcherB, props)
  if (variant === 'c') return null
  return jsx(SwitcherA, props)
}

// Shown on screens that follow the switcher while it is on one project.
export function ScopeNote({ name, hidden = 0, noun = 'items', onShowAll }) {
  return jsxs('div', { className: 'dy-scope-note', role: 'note', 'data-scope-note': 'true', children: [
    jsx(Icon, { name: 'filter' }),
    jsxs('span', { children: [
      jsx('strong', { children: `Showing ${name} only.` }),
      hidden > 0 ? ` ${plural(hidden, noun.replace(/s$/, ''), noun)} in other projects.` : '',
    ] }),
    jsx('button', { type: 'button', className: 'dockyard-button small', 'data-show-all-projects': 'true', onClick: onShowAll, children: 'Show all projects' }),
  ] })
}

// Screens that work on one project ask for one while "All projects" is on.
export function ProjectChooser({ projects, screen, onPick, onNewProject }) {
  return jsxs('section', { className: 'dy-chooser', 'data-project-chooser': screen, children: [
    jsxs('header', { children: [
      jsx('h1', { children: `${screen}: choose a project` }),
      jsx('p', { children: `${screen} works on one project at a time. The switcher is on All projects, so pick one here or in the switcher.` }),
    ] }),
    projects.length
      ? jsx('ul', { className: 'dy-chooser-list', children: projects.map((project) => {
          const [tone, healthLabel] = healthOf(project)
          return jsx('li', { children: jsxs('button', {
            type: 'button', className: 'dy-chooser-item', 'data-choose-project': project.id, onClick: () => onPick(project.id),
            children: [
              jsx(ProjectAvatar, { project, size: 'lg' }),
              jsxs('span', { className: 'dy-sw-option-copy', children: [
                jsx('strong', { children: projectName(project) }),
                jsx('span', { children: projectMeta(project) || 'No work yet' }),
              ] }),
              tone ? jsxs('span', { className: `dy-sw-health ${tone}`, children: [jsx('span', { className: 'dy-sw-dot', 'aria-hidden': true }), healthLabel] }) : null,
              jsx('span', { className: 'dy-chooser-go', 'aria-hidden': true, children: jsx(Icon, { name: 'chevron' }) }),
            ],
          }) }, project.id)
        }) })
      : jsxs('div', { className: 'dy-chooser-empty', children: [
          jsx('p', { children: 'No projects yet.' }),
          onNewProject ? jsx('button', { type: 'button', className: 'dockyard-button primary', onClick: onNewProject, children: 'New project' }) : null,
        ] }),
  ] })
}
