// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { useState } from '../runtime/react.js'
import { useEffect } from '../runtime/react.js'
import { api } from '../runtime/context.js'
import { riskDetails } from '../lib/ui.js'
import { emitToast } from '../runtime/context.js'
import { formatWhen } from '../lib/ui.js'
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { Icon } from '../lib/ui.js'
import { StatusTag } from '../lib/ui.js'
import { validationSummary } from '../data/loaders.js'
import { Button } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { ConfirmDialog } from '../lib/ui.js'
export function ApprovalRow({ item, onResolved }) {
  const [state, setState] = useState('idle')
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [rejectConfirm, setRejectConfirm] = useState(false)
  // Decision is fetched and displayed when the row renders, not on click;
  // the submitted fingerprint must bind to the reviewed scope (round-2
  // review issue 3).
  const [reviewedDecision, setReviewedDecision] = useState(null)
  const [decisionError, setDecisionError] = useState(null)
  useEffect(() => {
    let disposed = false
    api(`/initiatives/${encodeURIComponent(item.ref)}/decision`)
      .then((decision) => {
        if (!disposed) setReviewedDecision(decision)
      })
      .catch(() => {
        if (!disposed) setDecisionError('Decision evidence unavailable; refresh before deciding.')
      })
    return () => { disposed = true }
  }, [item.ref])
  // The card must present the DECISION scope it will bind the fingerprint to
  // (round-3 R1; field mapping corrected round-4 Residual A). The canonical
  // decision payload carries the rationale under `reason` and the validation
  // contract nested at `validation.contract`.
  const tone2source = reviewedDecision
    ? {
        title: reviewedDecision.title ?? item.title,
        risk: reviewedDecision.risk ?? item.risk,
        rationale: reviewedDecision.reason
          ?? reviewedDecision.rationale
          ?? (item.detail?.rationale ?? ''),
        expected_outcome: reviewedDecision.expected_outcome ?? (item.detail?.expected_outcome ?? ''),
        validation: reviewedDecision.validation?.contract
          ?? reviewedDecision.validation
          ?? item.detail?.validation_contract
          ?? null,
      }
    : { title: item.title, risk: item.risk, rationale: item.detail?.rationale, expected_outcome: item.detail?.expected_outcome, validation: item.detail?.validation_contract ?? null }
  const [tone, label] = riskDetails(tone2source.risk)
  const detail = {
    ...item.detail,
    rationale: tone2source.rationale,
    expected_outcome: tone2source.expected_outcome,
    validation_contract: tone2source.validation,
  }
  const [decisionNote, setDecisionNote] = useState('')
  const [decisionReason, setDecisionReason] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [changesOpen, setChangesOpen] = useState(false)
  const [changesFeedback, setChangesFeedback] = useState('')
  const [changesBusy, setChangesBusy] = useState(false)
  const [commentBody, setCommentBody] = useState('')
  const [comments, setComments] = useState([])
  useEffect(() => {
    let disposed = false
    api(`/initiatives/${encodeURIComponent(item.ref)}/comments`)
      .then((thread) => { if (!disposed) setComments(thread.comments ?? []) })
      .catch(() => {})
    return () => { disposed = true }
  }, [item.ref])
  const requestChanges = async () => {
    setChangesBusy(true)
    setError(null)
    try {
      if (!reviewedDecision) {
        throw new Error('Decision evidence not reviewed yet; refresh before deciding.')
      }
      await api(`/initiatives/${encodeURIComponent(item.ref)}/request-changes`, {
        method: 'POST',
        body: {
          expected_fingerprint: reviewedDecision.fingerprint,
          feedback: changesFeedback.trim(),
          note: decisionNote || undefined,
        },
        suppressErrorToast: true,
      })
      setState('returned')
      emitToast('success', 'Returned to the proposer with your feedback')
      setTimeout(onResolved, 850)
    } catch (failure) {
      setChangesOpen(false)
      setState('failed')
      const message = `Request changes was not recorded. ${String(failure?.message ?? failure)}`
      setError(message)
      emitToast('danger', message)
    } finally { setChangesBusy(false) }
  }
  const addComment = async () => {
    const body = commentBody.trim()
    if (!body) return
    try {
      const created = await api(`/initiatives/${encodeURIComponent(item.ref)}/comments`, {
        method: 'POST', body: { body }, suppressErrorToast: true,
      })
      setComments((thread) => [...thread, created])
      setCommentBody('')
    } catch (failure) {
      emitToast('danger', `Comment was not recorded. ${String(failure?.message ?? failure)}`)
    }
  }
  const decide = async (action) => {
    const resolvedState = action === 'approve' ? 'approved' : 'rejected'
    const actionLabel = action === 'approve' ? 'Approve' : 'Reject'
    if (action === 'reject' && !noteOpen) {
      // Owner must supply the rejection reason (round-3 R1): no hard-coded reason.
      setNoteOpen(true)
      return
    }
    setState(action === 'approve' ? 'approving' : 'rejecting')
    setError(null)
    try {
      if (!reviewedDecision) {
        throw new Error('Decision evidence not reviewed yet; refresh before deciding.')
      }
      const body = action === 'reject'
        ? {
            expected_fingerprint: reviewedDecision.fingerprint,
            reason: decisionReason.trim() || 'Rejected from Desktop review',
            note: decisionNote || undefined,
          }
        : { expected_fingerprint: reviewedDecision.fingerprint, note: decisionNote || undefined }
      await api(`/initiatives/${encodeURIComponent(item.ref)}/${action}`, {
        method: 'POST', body, suppressErrorToast: true,
      })
      setState(resolvedState)
      setTimeout(onResolved, 850)
    } catch (failure) {
      setNoteOpen(false)
      // Ambiguous outcome (round-3 R2): queue disappearance is NOT proof of
      // which decision happened. Read the authoritative receipts instead.
      let confirmed = null
      try {
        const receipts = await api(`/initiatives/${encodeURIComponent(item.ref)}/decision/receipts`)
        const rows = receipts?.receipts ?? []
        if (rows.length > 0) {
          const latest = rows[rows.length - 1]
          confirmed = latest.decision === 'approved' ? 'approved' : latest.decision === 'rejected' ? 'rejected' : null
        }
      } catch {
        confirmed = null
      }
      if (confirmed === resolvedState) {
        setState(resolvedState)
        emitToast('success', `Initiative ${resolvedState}; confirmed by decision receipt`)
        setTimeout(onResolved, 850)
        return
      }
      if (confirmed != null) {
        // The other decision won; report the truth, never our attempted action.
        setState(confirmed)
        emitToast('warning', `Initiative was ${confirmed} by another decision; your ${actionLabel.toLowerCase()} was not applied`)
        setTimeout(onResolved, 850)
        return
      }
      let stillPending = null
      try {
        const inbox = await api('/inbox')
        stillPending = (inbox?.items ?? []).some((pending) => pending.ref === item.ref)
      } catch {
        stillPending = null
      }
      if (stillPending === true) {
        setState('failed')
        const detailMessage = String(failure?.message ?? failure)
        const message = `${actionLabel} was not recorded. The approval is still pending. ${detailMessage}`
        setError(message)
        emitToast('danger', message)
        return
      }
      setState('failed')
      const detailMessage = String(failure?.message ?? failure)
      const message = `${actionLabel} could not be confirmed. Refresh before trying again. ${detailMessage}`
      setError(message)
      emitToast('danger', message)
    }
  }
  const resolved = state === 'approved' || state === 'rejected'
  const stateTone = state === 'approved' ? 'success' : state === 'rejected' || state === 'failed' ? 'danger' : tone
  const stateLabel = state === 'approved'
    ? 'Approved'
    : state === 'rejected'
      ? 'Rejected'
      : state === 'failed'
        ? 'Decision unconfirmed'
        : label
  const created = formatWhen(detail.created_at)
  return jsxs('article', {
    className: 'dockyard-approval-row',
    'data-approval-card': true,
    'data-approval-ref': item.ref,
    'data-state': state,
    children: [
      jsxs('div', { className: 'dockyard-approval-top', children: [
        jsx('span', { className: `dockyard-approval-icon ${tone}`, children: jsx(Icon, { name: tone === 'danger' ? 'alert' : 'check' }) }),
        jsxs('div', { className: 'dockyard-approval-main', children: [
          jsx('h2', { children: tone2source.title }),
          jsx('span', { className: 'dockyard-meta', children: `${item.project || 'Unknown project'} / ${item.ref}${created ? ` / proposed ${created}` : ''}` }),
        ]}),
        jsx(StatusTag, { tone: stateTone, label: stateLabel }),
      ]}),
      jsxs('div', { className: 'dockyard-evidence-grid', 'data-evidence-grid': true, children: [
        jsxs('div', { className: 'dockyard-evidence-cell', 'data-evidence-cell': 'rationale', children: [
          jsx('span', { children: 'WHY PROPOSED' }),
          jsx('strong', { children: detail.rationale || 'No rationale supplied' }),
        ]}),
        jsxs('div', { className: 'dockyard-evidence-cell', 'data-evidence-cell': 'outcome', children: [
          jsx('span', { children: 'EXPECTED OUTCOME' }),
          jsx('strong', { children: detail.expected_outcome || 'No expected outcome supplied' }),
        ]}),
        jsxs('div', { className: 'dockyard-evidence-cell', 'data-evidence-cell': 'validation', children: [
          jsx('span', { children: 'VALIDATION' }),
          jsx('strong', { children: validationSummary(detail.validation_contract) }),
        ]}),
      ]}),
      decisionError
        ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: decisionError })
        : null,
      noteOpen && !resolved
        ? jsxs('div', { className: 'dockyard-decision-note-form', 'data-decision-note-form': true, children: [
            jsxs('label', { children: ['Rejection reason ', jsx('input', {
              value: decisionReason,
              onChange: (event) => setDecisionReason(event.target.value),
              placeholder: 'Why this initiative is rejected',
            })]}),
            jsxs('label', { children: ['Note (optional) ', jsx('input', {
              value: decisionNote,
              onChange: (event) => setDecisionNote(event.target.value),
              placeholder: 'Optional context recorded with the decision',
            })]}),
            jsxs('div', { className: 'dockyard-form-actions', children: [
              jsx(Button, {
                action: 'confirm-reject-with-reason', variant: 'danger',
                disabled: state === 'rejecting' || !decisionReason.trim(),
                onClick: () => decide('reject'),
                children: 'Reject with reason',
              }),
              jsx(Button, { variant: 'quiet', onClick: () => setNoteOpen(false), children: 'Cancel' }),
            ]}),
          ]})
        : null,
      changesOpen && !resolved
        ? jsxs('div', { className: 'dockyard-decision-note-form', 'data-request-changes-form': true, children: [
            jsxs('label', { children: ['Feedback for the proposer ', jsx('input', {
              value: changesFeedback,
              onChange: (event) => setChangesFeedback(event.target.value),
              placeholder: 'What must change before you can approve',
            })]}),
            jsxs('div', { className: 'dockyard-form-actions', children: [
              jsx(Button, {
                action: 'confirm-request-changes', variant: 'primary',
                disabled: changesBusy || !changesFeedback.trim(),
                onClick: requestChanges,
                children: changesBusy ? 'Returning…' : 'Return to proposer',
              }),
              jsx(Button, { variant: 'quiet', onClick: () => setChangesOpen(false), children: 'Cancel' }),
            ]}),
          ]})
        : null,
      jsxs('div', { className: 'dockyard-approval-actions', children: [
        resolved ? jsx(StatusTag, { tone: stateTone, label: stateLabel }) : jsx(Button, {
          action: 'approve',
          variant: 'primary',
          disabled: state === 'approving' || state === 'rejecting',
          onClick: () => decide('approve'),
          children: state === 'approving' ? 'Approving...' : 'Approve',
        }),
        resolved ? null : jsx(Button, {
          action: 'reject',
          variant: 'danger',
          disabled: state === 'approving' || state === 'rejecting',
          onClick: () => setRejectConfirm(true),
          children: state === 'rejecting' ? 'Rejecting...' : 'Reject',
        }),
        resolved ? null : jsx(Button, {
          action: 'request-changes',
          variant: 'quiet',
          disabled: state === 'approving' || state === 'rejecting',
          onClick: () => setChangesOpen((open) => !open),
          children: 'Request changes',
        }),
        jsx(Button, {
          action: 'toggle-evidence',
          variant: 'quiet',
          onClick: () => setExpanded((open) => !open),
          children: expanded ? 'Hide evidence details' : 'Show evidence details',
        }),
        !resolved ? jsx(StatusTag, { tone: 'neutral', label: 'Awaiting you' }) : null,
      ]}),
      jsx('div', {
        className: 'dockyard-evidence-details',
        'data-evidence-details': true,
        hidden: !expanded,
        children: `Status: ${detail.status || 'pending approval'}. Priority: ${number(detail.priority ?? 0)}. Approval state: ${detail.approval_state || 'pending'}. Context reference: ${item.deep_link || item.ref}.`,
      }),
      error ? jsx('p', { className: 'dockyard-inline-error', role: 'alert', children: error }) : null,
      rejectConfirm ? jsx(ConfirmDialog, {
        confirmKey: `reject-${item.ref}`,
        title: 'Reject this initiative?',
        description: `${item.title} will leave the approval queue and be recorded as rejected.`,
        confirmLabel: 'Reject initiative',
        busy: state === 'rejecting',
        onCancel: () => setRejectConfirm(false),
        onConfirm: async () => { setRejectConfirm(false); await decide('reject') },
      }) : null,
      jsxs('div', { className: 'dockyard-approval-comments', 'data-approval-comments': true, children: [
        comments.length ? jsxs('div', { className: 'dockyard-comment-thread', children:
          comments.map((comment) => jsxs('p', { children: [
            jsx('strong', { children: comment.actor }),
            jsx('span', { children: ` · ${formatWhen(comment.created_at)} · ${comment.body}` }),
          ]}, comment.id)),
        }) : jsx('p', { className: 'dockyard-meta', children: 'No comments yet.' }),
        jsxs('div', { className: 'dockyard-comment-form', children: [
          jsx('input', {
            value: commentBody,
            onChange: (event) => setCommentBody(event.target.value),
            placeholder: 'Add context without deciding (recorded in the audit trail)',
            'aria-label': 'Comment',
          }),
          jsx(Button, { small: true, variant: 'quiet', onClick: addComment, disabled: !commentBody.trim(), children: 'Comment' }),
        ]}),
      ]}),
    ],
  })
}
