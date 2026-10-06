// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// C7 Reports (06/10): a project's Reports tab. Generate a report (type and
// recent activity), read it as a formatted page, copy or download the exact
// saved Markdown, and open older ones. Reports live inside the project only
// (owner decision Q5). How a saved report is read, and every word, is in
// lib/report-vocab.js; the backend writes new reports in plain words
// (persistence/report_words.py).
//
// Two layouts are in design review (?review=1, reports-review.js):
//   side   past reports on the left, the open report beside them (default)
//   table  past reports in a table; a report opens in a side panel
// They share this file's controls, page, words and actions, so they differ
// only in layout. Once Sahil picks, the losing layout and the bar go.
import { useEffect } from '../runtime/react.js'
import { useRef } from '../runtime/react.js'
import { useState } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { jsxs } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { emitToast } from '../runtime/context.js'
import { _os } from '../runtime/context.js'
import { Button } from '../lib/ui.js'
import { Icon } from '../lib/ui.js'
import { plural } from '../lib/ui.js'
import { useDialogFocusManager } from '../lib/ui.js'
import { reportDownloadFilename } from '../../download.js'
import { downloadTextFile } from '../../download.js'
import { REPORT_TYPES } from '../lib/report-vocab.js'
import { parseReport } from '../lib/report-vocab.js'
import { reportHint } from '../lib/report-vocab.js'
import { reportTypeLabel } from '../lib/report-vocab.js'
import { reportWhen } from '../lib/report-vocab.js'
import { takesActivity } from '../lib/report-vocab.js'
import { readReportsReview } from './reports-review.js'
import { ReportsReviewBar } from './reports-review.js'

const byline = (report) => [reportWhen(report.generated_at), report.generated_by ? `by ${report.generated_by}` : ''].filter(Boolean).join(' · ')

function ReportControls({ type, onType, includeActivity, onActivity, generating, onGenerate, error }) {
  const allowed = takesActivity(type)
  return jsxs('div', { className: 'dy-rep-controls', 'data-report-controls': true, children: [
    jsxs('div', { className: 'dy-rep-row', children: [
      jsxs('label', { className: 'dy-rep-field', children: [
        jsx('span', { children: 'Report type' }),
        jsx('select', {
          'data-report-type': true, value: type, onChange: (event) => onType(event.target.value),
          children: REPORT_TYPES.map((entry) => jsx('option', { value: entry.value, children: entry.label }, entry.value)),
        }),
      ]}),
      jsxs('label', { className: 'dy-rep-check', 'data-report-activity': true, children: [
        // Risk reports never carry activity, so the box shows off there; the
        // person's choice comes back for the other types.
        jsx('input', { type: 'checkbox', checked: allowed && includeActivity, disabled: !allowed, onChange: (event) => onActivity(event.target.checked) }),
        jsx('span', { children: 'Include recent activity' }),
      ]}),
      jsx(Button, { action: 'generate-report', variant: 'primary', disabled: generating, onClick: onGenerate, children: generating ? 'Generating…' : 'Generate report' }),
    ]}),
    jsx('p', { className: 'dy-rep-hint', 'data-report-hint': true, children: reportHint(type, includeActivity) }),
    error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
  ]})
}

function ReportBlock({ block }) {
  if (block.kind === 'heading') return jsx('h3', { children: block.text })
  if (block.kind === 'text') return jsx('p', { children: block.text })
  if (block.kind === 'table') {
    return jsx('div', { className: 'dy-rep-table-wrap', children: jsxs('table', { className: 'dy-rep-table', children: [
      jsx('thead', { children: jsx('tr', { children: block.head.map((cell, index) => jsx('th', { scope: 'col', children: cell }, index)) }) }),
      jsx('tbody', { children: block.rows.map((row, index) => jsx('tr', { children: row.map((cell, column) => jsx('td', { children: cell }, column)) }, index)) }),
    ]}) })
  }
  // A list of "Label: value" lines reads as labelled facts; anything else as
  // a plain list.
  if (block.items.every((item) => item.label)) {
    return jsx('dl', { className: 'dy-rep-facts', children: block.items.map((item, index) => jsxs('div', { children: [
      jsx('dt', { children: item.label }), jsx('dd', { children: item.value }),
    ]}, index)) })
  }
  return jsx('ul', { className: 'dy-rep-items', children: block.items.map((item, index) => jsx('li', { children: item.text }, index)) })
}

// One saved report as a page. Copy and Download use the saved Markdown
// exactly as the backend returned it.
function ReportPage({ report, onCopy, onDownload }) {
  const doc = parseReport(report.content)
  const when = reportWhen(report.generated_at) || doc.generated
  const by = report.generated_by || doc.generatedBy
  return jsxs('div', { className: 'dy-rep-doc', 'data-report-preview': report.report_id, children: [
    jsxs('header', { className: 'dy-rep-doc-head', children: [
      jsxs('div', { children: [
        jsx('h2', { id: 'dy-rep-doc-title', children: doc.title || report.title }),
        jsx('p', { className: 'dy-rep-meta', 'data-report-meta': true, children: `${reportTypeLabel(report.report_type)} · Generated ${when}${by ? ` by ${by}` : ''}` }),
      ]}),
      jsxs('div', { className: 'dy-rep-actions', children: [
        jsx(Button, { action: 'copy-report', small: true, onClick: onCopy, children: 'Copy Markdown' }),
        jsx(Button, { action: 'download-report', small: true, onClick: onDownload, children: 'Download Markdown' }),
      ]}),
    ]}),
    jsx('div', { className: 'dy-rep-body', children: doc.blocks.map((block, index) => jsx(ReportBlock, { block }, index)) }),
  ]})
}

// What the reading area shows: the report, its loading or error state, or a
// pointer to what to do next.
function ReportBody({ state, history, onRetry, onCopy, onDownload }) {
  if (state.openError) {
    return jsxs('div', { className: 'dy-rep-state', role: 'alert', children: [
      jsx('p', { children: `This report could not be opened: ${state.openError}` }),
      jsx(Button, { action: 'retry-report', small: true, onClick: onRetry, children: 'Try again' }),
    ]})
  }
  if (state.report) return jsx(ReportPage, { report: state.report, onCopy, onDownload })
  if (state.opening) return jsx('p', { className: 'dy-rep-state', 'aria-busy': true, children: 'Opening the report…' })
  return jsxs('div', { className: 'dy-rep-state', 'data-report-empty': true, children: [
    jsx(Icon, { name: 'project' }),
    jsx('p', { children: history.length > 0
      ? 'Pick a report from the list to read it here.'
      : 'No reports yet. Pick a type above and press Generate report. Reports are saved here, so you can read, copy or download them later.' }),
  ]})
}

function ReportList({ history, openId, onOpen }) {
  return jsxs('aside', { className: 'dy-rep-list', 'data-report-list': true, 'aria-label': 'Past reports', children: [
    jsxs('h3', { children: ['Past reports', jsx('span', { children: history.length })] }),
    history.length > 0
      ? jsx('ul', { children: history.map((report) => jsx('li', { children: jsxs('button', {
          type: 'button', 'data-report-history': report.report_id, 'aria-current': report.report_id === openId ? 'true' : undefined,
          onClick: () => onOpen(report.report_id, { scroll: true }),
          children: [jsx('strong', { children: reportTypeLabel(report.report_type) }), jsx('span', { children: byline(report) })],
        }) }, report.report_id)) })
      : jsx('p', { className: 'dy-rep-none', children: 'No reports yet.' }),
  ]})
}

function ReportTable({ history, openId, onOpen }) {
  if (history.length === 0) {
    return jsx('p', { className: 'dy-rep-none dy-rep-none-table', 'data-report-list': true, children: 'No reports yet. Pick a type above and press Generate report.' })
  }
  return jsx('div', { className: 'dy-rep-reports-wrap', 'data-report-list': true, children: jsxs('table', { className: 'dy-rep-reports', children: [
    jsx('thead', { children: jsxs('tr', { children: [
      jsx('th', { scope: 'col', children: 'Report' }), jsx('th', { scope: 'col', children: 'Generated' }), jsx('th', { scope: 'col', children: 'By' }),
    ]}) }),
    jsx('tbody', { children: history.map((report) => jsxs('tr', {
      'data-report-row': report.report_id, 'aria-current': report.report_id === openId ? 'true' : undefined,
      // The whole row opens the report; its button is the keyboard route.
      onClick: () => onOpen(report.report_id),
      children: [
        jsx('td', { children: jsxs('button', { type: 'button', 'data-report-history': report.report_id, children: [
          jsx('span', { children: reportTypeLabel(report.report_type) }), jsx(Icon, { name: 'chevron' }),
        ]}) }),
        jsx('td', { children: reportWhen(report.generated_at) }),
        jsx('td', { children: report.generated_by || 'Unknown' }),
      ],
    }, report.report_id)) }),
  ]}) })
}

function ReportDrawer({ onClose, children }) {
  // Initial focus, Tab kept inside, and focus back to the row on close.
  useDialogFocusManager('[data-report-drawer] .dy-rep-drawer-panel')
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      event.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])
  return jsx('section', {
    className: 'dockyard-modal-layer dy-rep-drawer-layer', 'data-report-drawer': true,
    onClick: (event) => { if (event.target === event.currentTarget) onClose() },
    children: jsxs('aside', { className: 'dy-rep-drawer-panel', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'dy-rep-doc-title', children: [
      jsxs('header', { className: 'dy-rep-drawer-head', children: [
        jsx('span', { children: 'Report' }),
        jsx('button', { type: 'button', className: 'dy-rep-close', 'aria-label': 'Close report', 'data-report-close': true, onClick: onClose, children: jsx(Icon, { name: 'x' }) }),
      ]}),
      children,
    ]}),
  })
}

export function ProjectReportsPanel({ project, reports, onRefresh }) {
  const [, setReviewTick] = useState(0)
  const review = readReportsReview()
  const layout = review.reports
  const [type, setType] = useState('executive')
  const [includeActivity, setIncludeActivity] = useState(true)
  const [history, setHistory] = useState(reports)
  const [openId, setOpenId] = useState(null)
  const [report, setReport] = useState(null)
  const [opening, setOpening] = useState(false)
  const [openError, setOpenError] = useState(null)
  const [drawer, setDrawer] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  // The report asked for last: a slower earlier answer must not replace it.
  const wanted = useRef(null)

  const open = async (reportId, { scroll = false } = {}) => {
    wanted.current = reportId
    setOpenId(reportId)
    setOpenError(null)
    if (layout === 'table') setDrawer(true)
    if (scroll) {
      // At phone width the page sits above the list: bring it into view.
      globalThis.requestAnimationFrame?.(() => {
        const pane = document.querySelector('[data-report-pane]')
        if (pane && pane.getBoundingClientRect().top < 0) pane.scrollIntoView?.({ block: 'start' })
      })
    }
    if (report?.report_id === reportId) return
    setOpening(true)
    try {
      const loaded = await api(`/projects/${encodeURIComponent(project.id)}/reports/${encodeURIComponent(reportId)}`)
      if (wanted.current === reportId) setReport(loaded)
    } catch (failure) {
      if (wanted.current === reportId) setOpenError(String(failure?.message ?? failure))
    }
    if (wanted.current === reportId) setOpening(false)
  }
  // Side by side opens the newest report on arrival, so the page is never an
  // empty frame when reports exist. The table opens nothing until asked.
  useEffect(() => {
    if (layout === 'side' && !openId && history.length > 0) open(history[0].report_id)
  }, [layout])

  const generate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const made = await api(`/projects/${encodeURIComponent(project.id)}/reports`, {
        method: 'POST', body: { report_type: type, include_activity: includeActivity },
      })
      wanted.current = made.report_id
      setReport(made)
      setOpenId(made.report_id)
      setOpenError(null)
      setOpening(false)
      setHistory((current) => [made, ...current.filter((item) => item.report_id !== made.report_id)])
      if (layout === 'table') setDrawer(true)
      onRefresh?.()
    } catch (failure) {
      setError(String(failure?.message ?? failure))
    }
    setGenerating(false)
  }
  const shown = report && report.report_id === openId ? report : null
  const copy = async () => {
    const copied = shown?.content && _os?.writeClipboard ? await _os.writeClipboard(shown.content) : false
    emitToast(copied ? 'success' : 'danger', copied ? 'Report copied to clipboard' : 'Clipboard is unavailable')
  }
  const download = () => {
    // Phase 4: download the exact generated Markdown the API returned, under
    // a sanitised filename derived only from the report metadata.
    if (!shown?.content) return
    const filename = reportDownloadFilename(project.id, shown)
    const started = downloadTextFile(shown.content, filename)
    emitToast(started ? 'success' : 'danger', started ? `Downloading ${filename}` : 'Download could not start in this environment')
  }
  const body = jsx(ReportBody, {
    state: { report: shown, opening, openError }, history,
    onRetry: () => open(openId), onCopy: copy, onDownload: download,
  })

  return jsxs('section', { className: 'dy-rep', 'data-project-reports': true, children: [
    review.active ? jsx(ReportsReviewBar, { review, onChange: () => setReviewTick((tick) => tick + 1) }) : null,
    jsxs('header', { className: 'dy-rep-head', children: [
      jsx('h2', { children: 'Reports' }),
      jsx('span', { className: 'dy-rep-count', children: plural(history.length, 'report') }),
    ]}),
    jsx(ReportControls, {
      type, onType: setType, includeActivity, onActivity: setIncludeActivity,
      generating, onGenerate: generate, error,
    }),
    layout === 'table'
      ? jsxs('div', { className: 'dy-rep-tablelayout', 'data-report-layout': 'table', children: [
          jsx(ReportTable, { history, openId, onOpen: open }),
          drawer && openId ? jsx(ReportDrawer, { onClose: () => setDrawer(false), children: body }) : null,
        ]})
      : jsxs('div', { className: 'dy-rep-side', 'data-report-layout': 'side', children: [
          jsx(ReportList, { history, openId, onOpen: open }),
          jsx('article', { className: 'dy-rep-pane', 'data-report-pane': true, children: body }),
        ]}),
  ]})
}
