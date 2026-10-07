// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Workflows design round (07/10/2026), option B "Build on the canvas": New
// workflow opens an unsaved canvas. While it is empty, this card in its
// centre offers the four ways in; each one fills the canvas in place. The AI
// way opens the side panel (ai-panel.js). Nothing is saved until Save.
import { useState } from '../../runtime/react.js'
import { jsxs } from '../../runtime/react.js'
import { jsx } from '../../runtime/react.js'
import { Button } from '../../lib/ui.js'
import { readImport } from './standins.js'
import { TemplateList } from './shared.js'
import { ImportResult } from './shared.js'
import { PreviewTag } from './shared.js'
import { WAYS } from './start-dialog.js'
import { readFileText } from './start-dialog.js'

export function CanvasStartCard({ templates, onUse, onAi, onCancel }) {
  const [view, setView] = useState('ways')
  const [template, setTemplate] = useState(null)
  const [text, setText] = useState('')
  const [imported, setImported] = useState(null)
  const check = (value) => setImported(readImport(value))
  const ways = WAYS.map((w) => (w.way === 'ai' ? { ...w, title: 'Build with AI', text: 'Describe it in the panel; the AI explains and draws the steps here.' } : w))
  const pick = (way) => {
    if (way === 'blank') onUse({ name: '', nodes: [{ id: 'step-1', title: 'Step 1', depends_on: [], human_gate: false, kind: 'task' }], source: 'blank' })
    else if (way === 'ai') onAi()
    else setView(way)
  }
  return jsxs('div', { className: 'dy-wfd-start', role: 'region', 'aria-label': 'Start your workflow', 'data-wfd-canvas-start': view, children: [
    jsx('h3', { children: view === 'ways' ? 'Start your workflow' : view === 'template' ? 'Use a template' : 'Import' }),
    view === 'ways' ? jsx('div', { className: 'dy-wfd-ways', children: ways.map((w) => jsxs('button', { type: 'button', 'data-wfd-way': w.way, onClick: () => pick(w.way), children: [
      jsxs('strong', { children: [w.title, w.way === 'ai' ? jsx(PreviewTag, { children: 'Practice AI' }) : null] }),
      jsx('span', { children: w.text }),
    ] }, w.way)) }) : null,
    view === 'template' ? jsx(TemplateList, { templates, value: template?.name, onPick: setTemplate }) : null,
    view === 'import' ? jsxs('div', { className: 'dy-wfd-way-body', children: [
      jsxs('label', { className: 'dy-wfd-field', children: [
        jsx('span', { children: 'Paste the workflow' }),
        jsx('textarea', { rows: 4, value: text, 'data-wfd-import-text': true, placeholder: 'A Dockyard export (JSON). Other formats go through the AI.', onChange: (e) => { setText(e.target.value); setImported(null) } }),
      ] }),
      jsxs('div', { className: 'dy-wfd-row', children: [
        jsxs('label', { className: 'dy-wfd-file', children: [jsx('span', { children: 'or choose a file' }), jsx('input', { type: 'file', accept: '.json,.yaml,.yml,.txt', 'data-wfd-import-file': true, onChange: async (e) => { const value = await readFileText(e.target.files?.[0]); setText(value); check(value) } })] }),
        jsx(Button, { small: true, action: 'wfd-import-check', onClick: () => check(text), children: 'Check it' }),
      ] }),
      jsx(ImportResult, { result: imported }),
    ] }) : null,
    jsxs('div', { className: 'dy-wfd-start-actions', children: [
      view === 'ways' ? jsx(Button, { small: true, action: 'wfd-draft-discard', onClick: onCancel, children: 'Cancel' }) : jsx(Button, { small: true, action: 'wfd-start-back', onClick: () => { setView('ways'); setImported(null) }, children: '← All ways in' }),
      view === 'template' ? jsx(Button, { small: true, variant: 'primary', action: 'wfd-use-template', disabled: !template, onClick: () => onUse({ name: template.name, nodes: template.definition?.nodes ?? [], source: 'template' }), children: 'Put it on the canvas' }) : null,
      view === 'import' ? jsx(Button, { small: true, variant: 'primary', action: 'wfd-use-import', disabled: !imported || imported.kind === 'invalid', onClick: () => onUse({ name: imported.name, nodes: imported.nodes, source: imported.kind === 'dockyard' ? 'import' : 'ai-import', notCarried: imported.notCarried, format: imported.format }), children: 'Put it on the canvas' }) : null,
    ] }),
  ] })
}
