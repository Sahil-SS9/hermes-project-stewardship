// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { jsx, jsxs } from '../runtime/react.js'
import { Button } from '../lib/ui.js'
import { dockyardTypeLabel as typeLabel } from './backlog-model.js'

export function BacklogReasonModal(props) {
  const { pendingMove, reason, setReason, error, saving, pendingParentItem,
    pendingParentRef, pendingParentChoices, pendingParentChanged, saveParent,
    saveMove, setPendingMove } = props
  return jsxs('section', { className: 'dockyard-modal-layer', 'data-reason-modal': true, hidden: !pendingMove, children: [
      jsxs('div', { className: 'dockyard-modal', role: 'dialog', 'aria-modal': true, 'aria-labelledby': 'dockyard-reason-title', children: [
        jsx('h2', { id: 'dockyard-reason-title', children: pendingMove?.mode === 'parent' ? 'Re-parent item' : 'Record the reason' }),
        jsx('p', { children: pendingMove ? (pendingMove.mode === 'parent'
          ? `Change what “${pendingMove.title}” sits under. The move is audited.`
          : `Move ${pendingMove.title} to rank ${pendingMove.newRank}.`) : '' }),
        pendingMove?.mode === 'parent' ? jsxs('label', { children: [
          jsx('span', { children: 'New parent' }, 'np-label'),
          jsx('select', {
            id: 'dockyard-parent-select',
            value: pendingParentRef,
            onChange: (event) => setPendingMove((current) => ({ ...current, parent_ref: event.target.value })),
            children: [
              pendingParentItem?.type !== 'subtask' ? jsx('option', { value: '', children: 'No parent · top level' }, 'none') : null,
              ...pendingParentChoices.map((parent) => jsx('option', { value: parent.ref, children: `${parent.title || parent.ref} · ${typeLabel(parent.type)}` }, parent.ref)),
            ],
          }, 'np-select'),
        ] }) : null,
        jsx('label', { htmlFor: 'dockyard-rank-reason', children: pendingMove?.mode === 'parent' ? 'Reason for re-parenting' : 'Reason for this priority change' }),
        jsx('textarea', { id: 'dockyard-rank-reason', value: reason, onChange: (event) => setReason(event.target.value), placeholder: pendingMove?.mode === 'parent' ? 'Explain why this parent is the right fit.' : 'Explain why this rank is right for the project.' }),
        jsx('p', { className: 'dockyard-form-hint', children: 'Enter at least 4 characters; this reason is stored in the audit history.' }),
        error ? jsx('p', { className: 'dockyard-inline-error', children: error }) : null,
        jsxs('div', { className: 'dockyard-modal-actions', children: [
          jsx(Button, { onClick: () => setPendingMove(null), children: 'Cancel' }),
          pendingMove?.mode === 'parent'
            ? jsx(Button, { variant: 'primary', disabled: saving || !pendingParentChanged || reason.trim().length < 4, onClick: saveParent, children: saving ? 'Saving...' : 'Save parent change' })
            : jsx(Button, { variant: 'primary', disabled: saving || reason.trim().length < 4, onClick: saveMove, children: saving ? 'Saving...' : 'Save rank change' }),
        ]}),
      ]}),
    ]})
}
