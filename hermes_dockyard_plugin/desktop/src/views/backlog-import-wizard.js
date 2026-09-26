// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { jsx, jsxs } from '../runtime/react.js'
import { Button } from '../lib/ui.js'
import { Icon } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { readableLabel } from '../data/loaders.js'

export function BacklogImportWizard(props) {
  const {
    project, importOpen, importStep, importText, importMode, importRows,
    importValid, importError, importBusy, importResult, importSelected,
    importWarningsOnly, importColumnMetadata, setImportMode, setImportText,
    setImportRows, setImportValid, setImportError, setImportBusy, setImportStep,
    setImportSelected, closeImport, parseImport, runImport, api,
  } = props
  return !window.__V4_DISABLE?.has('wizard') ? jsxs('section', { className: 'dockyard-modal-layer', 'data-bulk-import-layer': true, hidden: !importOpen, children: [
      jsxs('div', { className: 'dockyard-modal dockyard-onboarding', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'dockyard-import-title', children: [
        jsxs('header', { className: 'dockyard-onboarding-head', children: [
          jsxs('div', { children: [
            jsx('h2', { id: 'dockyard-import-title', children: 'Bulk import backlog items' }),
            jsx('p', { children: `Import into ${project.name || project.id}. Paste JSON or choose a CSV file, validate every row, then confirm. No rows are written during preview.` }),
          ] }),
          jsx('button', { type: 'button', className: 'dockyard-modal-close', 'aria-label': 'Close bulk import', onClick: closeImport, children: '×' }),
        ] }),
        jsx('div', { className: 'dockyard-wizard-progress', role: 'progressbar', 'aria-label': 'Import progress', 'aria-valuemin': 1, 'aria-valuemax': 3, 'aria-valuenow': importStep, children:
          [['Source', 'Upload or paste'], ['Preview', 'Validate every row'], ['Result', 'Commit outcome']].map(([label, detail], index) => jsxs('div', { className: index + 1 < importStep ? 'complete' : index + 1 === importStep ? 'active' : '', children: [
            jsx('span', { children: index + 1 < importStep ? '✓' : number(index + 1) }),
            jsxs('span', { children: [jsx('strong', { children: label }), jsx('small', { children: detail })] }),
          ] }, label)),
        }),
        jsxs('div', { className: 'dockyard-wizard-body', children: [
          jsxs('div', { className: importStep === 1 ? 'dockyard-wizard-step active' : 'dockyard-wizard-step', hidden: importStep !== 1, 'data-import-step': '1', children: [
            jsx('h3', { children: 'Add your source' }),
            jsx('p', { className: 'import-source-hint', children: 'Required: row_key, type, title. Other supported columns are optional; open Column reference for formats and examples.' }),
            jsxs('div', { className: 'dockyard-tabs', role: 'tablist', children: [
              jsx('button', { type: 'button', role: 'tab', 'aria-selected': String(importMode === 'csv'), className: importMode === 'csv' ? 'active' : '', onClick: () => { setImportMode('csv'); setImportRows(null) }, children: 'CSV' }),
              jsx('button', { type: 'button', role: 'tab', 'aria-selected': String(importMode === 'json'), className: importMode === 'json' ? 'active' : '', onClick: () => { setImportMode('json'); setImportRows(null) }, children: 'JSON' }),
            ] }),
            jsx('textarea', {
              'data-import-input': true, 'aria-label': 'CSV or JSON import content', spellCheck: false, value: importText,
              onInput: (event) => { setImportText(event.target.value); setImportRows(null); setImportValid(false); setImportError(null) },
              placeholder: importMode === 'json'
                ? '[{"row_key":"release-1","type":"task","title":"Verify release checklist","estimate_days":2}]'
                : 'row_key,type,title,parent_key,labels,estimate_days,due\nrelease-1,task,Verify release checklist,,,2,',
            }),
            jsx('div', { className: 'import-source-divider', 'aria-hidden': true, children: 'or upload a file' }),
            jsxs('div', { className: 'dockyard-import-actions-row', children: [
              importMode === 'csv' ? jsxs('div', { className: 'import-drop', 'data-import-drop': true,
                onDragOver: (event) => { event.preventDefault(); event.currentTarget.classList.add('dragover') },
                onDragLeave: (event) => event.currentTarget.classList.remove('dragover'),
                onDrop: (event) => {
                  event.preventDefault(); event.currentTarget.classList.remove('dragover')
                  const file = event.dataTransfer?.files?.[0]
                  if (!file) return
                  const reader = new FileReader()
                  reader.onload = () => { setImportMode('csv'); setImportText(String(reader.result ?? '')); setImportRows(null); setImportError(null) }
                  reader.readAsText(file)
                }, children: [
                  jsx(Icon, { name: 'upload' }),
                  jsx('strong', { children: 'Choose a CSV file or drop it here' }),
                  jsx('small', { children: 'CSV only. File contents appear above before validation.' }),
                  jsx('input', { type: 'file', accept: '.csv,text/csv', 'aria-label': 'Choose CSV file', onChange: (event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => { setImportMode('csv'); setImportText(String(reader.result ?? '')); setImportRows(null); setImportValid(false); setImportError(null) }
                    reader.onerror = () => setImportError('Could not read the selected CSV file.')
                    reader.readAsText(file)
                  } }),
                ] }) : jsx('div', { className: 'create-help', children: 'JSON is paste-only. Use an array of objects with row_key, type and title; optional parent_key, labels, estimate_days and due.' }),
              jsx(Button, { action: 'import-download-template', small: true, onClick: () => {
                // P6.10: the downloadable template must match the shared
                // validator exactly; prefer the backend template and fall
                // back to the same columns locally if the host is offline.
                const fallback = ['row_key,type,title,parent_key,labels,estimate_days,due','epic-1,epic,Partner API v3,,,,','feature-1,feature,Usage dashboard,,,','task-1,task,Rotation cron,feature-1,,3,2026-10-01','bug-1,bug,Login 500 on expired token,,,,'].join(String.fromCharCode(10))
                api(`/projects/${encodeURIComponent(project.id)}/backlog/import-template`).then((template) => {
                  const csv = String(template?.csv ?? fallback)
                  const blob = new Blob([csv], { type: 'text/csv' })
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = 'backlog-import-template.csv'
                  document.body.appendChild(a); a.click(); a.remove()
                  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
                }).catch(() => {
                  const blob = new Blob([fallback], { type: 'text/csv' })
                  const a = document.createElement('a')
                  a.href = URL.createObjectURL(blob)
                  a.download = 'backlog-import-template.csv'
                  document.body.appendChild(a); a.click(); a.remove()
                  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
                })
              }, children: [jsx(Icon, { name: 'download' }), 'Download CSV template'] }),
            ] }),
            importColumnMetadata.length ? jsxs('details', { className: 'import-column-reference', children: [
              jsx('summary', { children: `Column reference · ${importColumnMetadata.filter((column) => column.required).map((column) => column.name).join(', ')} required · ${importColumnMetadata.length} supported` }),
              jsxs('div', { className: 'import-column-scroll', children: [
                jsx('table', { children: [jsx('thead', { children: jsx('tr', { children: ['Column', 'Requirement', 'Description', 'Format / example'].map((heading) => jsx('th', { children: heading }, heading)) }) }),
                  jsx('tbody', { children: importColumnMetadata.map((column) => jsx('tr', { children: [jsx('td', { children: jsx('code', { children: column.name }) }), jsx('td', { children: jsx('span', { className: column.required ? 'import-required' : 'import-optional', children: column.required ? 'Required' : 'Optional' }) }), jsx('td', { children: column.description }), jsx('td', { children: `${column.format} · ${column.example}` })] }, column.name)) }),
                ] }),
              ] }),
            ] }) : jsx('p', { className: 'dockyard-meta', children: 'Column reference unavailable. Download the server template before importing.' }),
            importError ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: importError }) : null,
          ] }),
          importRows && importRows.length ? jsxs('div', { className: importStep === 2 ? 'dockyard-wizard-step active' : 'dockyard-wizard-step', hidden: importStep !== 2, 'data-import-step': '2', children: [
            jsx('h3', { children: 'Review before writing' }),
            // Approved design: four validation summary cards + warnings-only
            // toggle. Warnings never block; errors do.
            jsxs('div', { className: 'import-summary', 'data-import-summary': true, children: [
              jsxs('div', { className: 'import-stat', children: [jsx('strong', { children: importRows.length }), jsx('span', { children: importRows.length === 1 ? 'row detected' : 'rows detected' })] }),
              jsxs('div', { className: 'import-stat valid', children: [jsx(Icon, { name: 'circle-check' }), jsxs('span', { children: [jsx('strong', { children: importRows.filter((row) => !row.problems.length).length }), ' valid'] })] }),
              jsxs('div', { className: 'import-stat warn', children: [jsx(Icon, { name: 'triangle-alert' }), jsxs('span', { children: [jsx('strong', { children: importRows.filter((row) => row.warnings.length).length }), ' warning', importRows.filter((row) => row.warnings.length).length === 1 ? '' : 's'] })] }),
              jsxs('div', { className: 'import-stat errored', children: [jsx(Icon, { name: 'alert' }), jsxs('span', { children: [jsx('strong', { children: importRows.filter((row) => row.errors.length).length }), ' error', importRows.filter((row) => row.errors.length).length === 1 ? '' : 's'] })] }),
            ] }),
            jsxs('div', { className: 'import-review-toolbar', children: [
              jsx('p', { className: 'dockyard-meta', children: importValid ? 'Server validation passed. Preview only: no items have been written.' : 'Server validation found row errors. Nothing can be imported until they are fixed.' }),
              jsxs('label', { className: 'import-warnings-toggle', children: [
                jsx('input', { type: 'checkbox', 'data-warnings-toggle': true, checked: importWarningsOnly, onChange: (event) => setImportWarningsOnly(event.target.checked) }),
                'Show issues only',
              ] }),
            ] }),
            !importValid ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: 'Correct every row error in the source, then validate again.' }) : null,
            importError ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: importError }) : null,
            // Approved design: split pane — left: per-row table with validation
            // badges; right: selected row's parsed values and will-import-as.
            jsxs('div', { className: 'import-split', 'data-import-split': true, children: [
              jsx('ul', { 'data-import-preview': true, children: importRows
                .filter((row) => !importWarningsOnly || row.problems.length)
                .map((row) => jsxs('li', {
                  className: [row.errors.length ? 'has-error' : '', row.warnings.length ? 'has-warning' : '', importSelected === row.idx ? 'selected' : ''].filter(Boolean).join(' '),
                  'data-import-row': row.idx,
                  onClick: () => setImportSelected(row.idx), children: [
                  jsx('strong', { children: row.type || 'Unknown' }),
                  jsx('span', { children: row.title || 'Untitled row' }),
                  row.errors.length
                    ? jsx('span', { className: 'import-badge error', children: 'Error' })
                    : row.warnings.length
                      ? jsx('span', { className: 'import-badge warning', children: 'Warning' })
                      : jsx('span', { className: 'import-badge ok', 'data-import-badge': 'ready', children: 'Ready' }),
                  row.problems.length ? jsx('span', { className: 'import-row-error', children: row.problems.join('; ') }) : null,
                ],
                }, row.idx)) }),
              (() => {
                const selectedRow = (importRows ?? []).find((row) => row.idx === importSelected) ?? importRows.find((row) => row.problems.length) ?? importRows[0]
                return jsxs('aside', { className: 'import-row-detail', 'data-import-row-detail': true, children: [
                  jsxs('h4', { children: [
                    'Row validation',
                    selectedRow.rowKey ? jsx('span', { className: 'dockyard-meta', children: ` · ${selectedRow.rowKey}` }) : null,
                    selectedRow.errors.length
                      ? jsx('span', { className: 'import-badge error', children: 'Error' })
                      : selectedRow.warnings.length
                        ? jsx('span', { className: 'import-badge warning', children: 'Warning' })
                        : jsx('span', { className: 'import-badge ok', children: 'Ready' }),
                  ] }),
                  selectedRow.errors.length
                    ? jsx('p', { className: 'dockyard-inline-error', children: selectedRow.errors.join('; ') })
                    : selectedRow.warnings.length
                      ? jsx('p', { className: 'import-warning-text', children: selectedRow.warnings.join('; ') })
                      : jsx('p', { className: 'dockyard-meta', children: 'No validation problems for this row.' }),
                  jsxs('div', { className: 'import-parsed', children: [
                    jsx('strong', { children: 'Parsed values (from CSV)' }),
                    jsx('dl', { children: [
                      jsxs('div', { children: [jsx('dt', { children: 'Type' }), jsx('dd', { children: selectedRow.type || 'task' })] }),
                      jsxs('div', { children: [jsx('dt', { children: 'Title' }), jsx('dd', { children: selectedRow.title || '—' })] }),
                      jsxs('div', { children: [jsx('dt', { children: 'Parent' }), jsx('dd', { children: selectedRow.parent || '—' })] }),
                      jsxs('div', { children: [jsx('dt', { children: 'Labels' }), jsx('dd', { children: selectedRow.labels || '—' })] }),
                      jsxs('div', { children: [jsx('dt', { children: 'Estimate' }), jsx('dd', { children: selectedRow.estimate || '—' })] }),
                      jsxs('div', { children: [jsx('dt', { children: 'Due' }), jsx('dd', { children: selectedRow.due || '—' })] }),
                      jsxs('div', { children: [jsx('dt', { children: 'Initiative' }), jsx('dd', { children: selectedRow.initiative || '—' })] }),
                    ] }),
                  ] }),
                  jsxs('div', { className: 'import-as', children: [
                    jsx('strong', { children: 'Will import as' }),
                    jsx('p', { children: `${readableLabel(selectedRow.type || 'task')} → ${readableLabel('backlog')}` }),
                    jsx('small', { className: 'dockyard-meta', children: `A new ${selectedRow.type || 'task'} will be created in ${project.name || project.id}.` }),
                  ] }),
                ] })
              })(),
            ] }),
          ] }) : null,
          importResult ? jsxs('div', { className: importStep === 3 ? 'dockyard-wizard-step active' : 'dockyard-wizard-step', hidden: importStep !== 3, 'data-import-step': '3', children: [
            jsx('h3', { children: importResult.written ? 'Import complete' : 'No items imported' }),
            jsxs('p', { role: 'status', children: [
              `Imported ${importResult.written} item${importResult.written === 1 ? '' : 's'}.`,
              importResult.failed.length ? ` ${importResult.failed.length} row(s) failed: ${importResult.failed.join(' | ')}` : '',
            ] }),
            importResult.items?.length ? jsxs('div', { className: 'import-result-refs', children: [
              jsx('strong', { children: 'Created work items' }),
              jsx('ul', { children: importResult.items.map((created) => jsx('li', { children: `${created.row_key} → ${created.ref}` }, created.row_key)) }),
            ] }) : null,
          ] }) : null,
        ] }),
        jsxs('footer', { className: 'dockyard-wizard-actions', children: [
          // Approved design: Cancel (and Back to source) on the left; the
          // primary forward action on the right.
          jsxs('span', { className: 'dockyard-wizard-actions-left', children: [
            importStep !== 3 ? jsx(Button, { onClick: closeImport, children: 'Cancel' }) : null,
            importStep === 2 && !importResult ? jsx(Button, { onClick: () => setImportStep(1), children: 'Back to source' }) : null,
            importStep === 3 && importResult ? jsx(Button, { onClick: () => setImportStep(1), children: 'Back to source' }) : null,
          ] }),
          jsxs('span', { className: 'dockyard-wizard-actions-right', children: [
            importStep === 1 ? jsx(Button, { action: 'import-next', variant: 'primary', disabled: importBusy, onClick: () => parseImport(true), children: importBusy ? 'Validating…' : 'Validate and preview →' }) : null,
importStep === 2 ? (importValid ? jsx(Button, { action: 'confirm-bulk-import', variant: 'primary', disabled: importBusy, onClick: runImport, children: importBusy ? 'Importing...' : `Import ${importRows.length} item${importRows.length === 1 ? '' : 's'} →` }) : jsx('button', { type: 'button', className: 'dockyard-button primary', disabled: true, 'data-import-blocked': true, children: 'Import blocked — fix row errors first' })) : null,
            importStep === 3 && importResult ? jsx(Button, { variant: 'primary', onClick: closeImport, children: 'Done' }) : null,
          ] }),
        ] }),
      ] }),
    ] }) : null
}
