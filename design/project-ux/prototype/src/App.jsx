import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from './Icon.jsx'
import Modal from './Modal.jsx'
import ProfilePicker from './ProfilePicker.jsx'
import {
  BLOCKED_ITEMS,
  INITIAL_GOALS,
  INITIAL_OBJECTIVES,
  PAGINATED_ITEMS,
  PROFILES,
  READY_ITEMS,
} from './data.js'

const NAV = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'onboarding', label: 'Onboarding', icon: 'rocket' },
  { id: 'team', label: 'Team', icon: 'users' },
  { id: 'exit', label: 'Member exit', icon: 'transfer' },
  { id: 'outcomes', label: 'Goals & objectives', icon: 'target' },
  { id: 'lifecycle', label: 'Archive & restore', icon: 'archive' },
  { id: 'states', label: 'State lab', icon: 'alert' },
]

function routeFromHash() {
  const route = window.location.hash.replace(/^#/, '').split('?')[0]
  return NAV.some((item) => item.id === route) ? route : 'overview'
}

function StatusTag({ tone = 'neutral', children }) {
  return (
    <span className={`status-tag ${tone}`}>
      <span className="status-mark" aria-hidden="true" />
      {children}
    </span>
  )
}

function Notice({ tone = 'info', title, children, actions, testId }) {
  return (
    <section
      className={`notice ${tone}`}
      role={tone === 'danger' ? 'alert' : 'status'}
      data-testid={testId}
      data-contrast={tone === 'warning' || tone === 'danger' ? tone : undefined}
    >
      <span className="notice-icon" aria-hidden="true"><Icon name={tone === 'danger' || tone === 'warning' ? 'alert' : 'shield'} /></span>
      <div className="notice-copy">
        <strong>{title}</strong>
        <div>{children}</div>
      </div>
      {actions ? <div className="notice-actions">{actions}</div> : null}
    </section>
  )
}

function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="page-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="page-actions">{actions}</div> : null}
    </header>
  )
}

function Metric({ value, label, detail, tone = 'neutral' }) {
  return (
    <div className="metric">
      <span className={`metric-value ${tone}`}>{value}</span>
      <strong>{label}</strong>
      <small>{detail}</small>
    </div>
  )
}

function Overview({ go }) {
  const journeyCards = [
    { id: 'onboarding', step: '01', title: 'Assemble a project', body: 'Four-step onboarding with exact preflight and a separate first assessment.', tag: '4 steps' },
    { id: 'team', step: '02', title: 'Manage membership', body: 'Add a discovered profile, transfer the sole lead, or remove a member with no work.', tag: '1 lead' },
    { id: 'exit', step: '03', title: 'Exit without hidden work', body: 'Inspect the complete item set, blockers, fingerprint, and resumable operation.', tag: 'Exact scope' },
    { id: 'outcomes', step: '04', title: 'Shape outcomes', body: 'Link multiple objectives to a goal while preserving unlinked work.', tag: 'Nullable links' },
  ]
  return (
    <>
      <PageHeader
        eyebrow="Phase 2 interaction model"
        title="Project stewardship, without the guesswork"
        description="A synthetic, standalone review surface for the management journeys that need contract clarity before production APIs are finalised."
        actions={<button className="button primary" type="button" onClick={() => go('onboarding')}><Icon name="rocket" /> Start onboarding</button>}
      />

      <section className="metric-strip" aria-label="Prototype coverage">
        <Metric value="7" label="Journey areas" detail="All interactive" tone="accent" />
        <Metric value="8" label="Failure states" detail="Fail closed" tone="warning" />
        <Metric value="1" label="Active lead" detail="Invariant preserved" tone="success" />
        <Metric value="0" label="Live writes" detail="Synthetic only" />
      </section>

      <div className="overview-layout">
        <section className="section journey-section">
          <div className="section-head">
            <div>
              <p className="eyebrow">Review path</p>
              <h2>Exercise the difficult journeys</h2>
            </div>
            <span className="section-count">Choose any route</span>
          </div>
          <div className="journey-list">
            {journeyCards.map((journey) => (
              <button className="journey-row" key={journey.id} type="button" onClick={() => go(journey.id)}>
                <span className="journey-index">{journey.step}</span>
                <span className="journey-copy">
                  <strong>{journey.title}</strong>
                  <span>{journey.body}</span>
                </span>
                <StatusTag tone="info">{journey.tag}</StatusTag>
                <span className="journey-arrow"><Icon name="arrow" /></span>
              </button>
            ))}
          </div>
        </section>

        <aside className="guardrail-card">
          <div className="guardrail-mark"><Icon name="shield" size={22} /></div>
          <p className="eyebrow">Contract guardrails</p>
          <h2>Truth before convenience</h2>
          <ul className="check-list">
            <li><Icon name="check" /> Unavailable profiles stay visible but cannot be selected.</li>
            <li><Icon name="check" /> Incomplete or stale previews cannot authorise a transfer.</li>
            <li><Icon name="check" /> Partial operations resume; committed host writes are not presented as reversible.</li>
            <li><Icon name="check" /> Archive preserves canonical project, board, task, and repository records.</li>
          </ul>
          <button className="button" type="button" onClick={() => go('states')}>Inspect state language</button>
        </aside>
      </div>
    </>
  )
}

const ONBOARDING_STEPS = ['Project', 'Purpose', 'Team + policy', 'Review']

function Onboarding() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ name: '', key: '', purpose: '', lead: null, members: [], autonomy: 'review', verification: 'evidence' })
  const [error, setError] = useState('')
  const [pickerMode, setPickerMode] = useState(null)
  const [created, setCreated] = useState(false)
  const [assessment, setAssessment] = useState('idle')

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const validateStep = () => {
    if (step === 0) {
      if (!form.name.trim()) return 'Project name is required.'
      if (form.name.trim().length > 48) return 'Project name must be 48 characters or fewer.'
      if (!/^[A-Z][A-Z0-9-]{1,9}$/.test(form.key.trim())) return 'Project key must be 2–10 uppercase letters, numbers, or hyphens.'
    }
    if (step === 1 && form.purpose.trim().length < 24) return 'Purpose must be at least 24 characters so reviewers can judge intent.'
    if (step === 2 && !form.lead) return 'Choose one available Hermes profile as project lead.'
    return ''
  }

  const next = () => {
    const message = validateStep()
    if (message) {
      setError(message)
      return
    }
    setError('')
    setStep((value) => Math.min(3, value + 1))
  }

  const selectProfile = (profile) => {
    if (pickerMode === 'lead') {
      setForm((current) => ({ ...current, lead: profile, members: current.members.filter((member) => member.slug !== profile.slug) }))
    } else {
      setForm((current) => current.members.some((member) => member.slug === profile.slug)
        ? current
        : { ...current, members: [...current.members, profile] })
    }
  }

  const reviewCount = 1 + form.members.length

  if (created) {
    return (
      <>
        <PageHeader
          eyebrow="Onboarding complete"
          title={form.name}
          description="The synthetic project record and team preflight completed. No assessment was started as part of onboarding."
          actions={<StatusTag tone="success">Created locally</StatusTag>}
        />
        <div className="completion-grid">
          <section className="section completion-main">
            <div className="success-orbit"><Icon name="check" size={28} /></div>
            <p className="eyebrow">Separate follow-up action</p>
            <h2>Run the first assessment when the project is ready</h2>
            <p>Onboarding established identity, purpose, membership, and policy only. Assessment has its own explicit action and receipt.</p>
            {assessment === 'idle' ? (
              <button className="button primary" type="button" onClick={() => setAssessment('complete')}>Run first assessment</button>
            ) : (
              <Notice tone="success" title="Assessment requested separately" testId="assessment-success">
                <p>Receipt <code>ASSESS-SYNTH-001</code> was created after onboarding by an explicit action.</p>
              </Notice>
            )}
          </section>
          <aside className="receipt-card">
            <p className="eyebrow">Onboarding receipt</p>
            <dl className="definition-list">
              <div><dt>Project key</dt><dd>{form.key}</dd></div>
              <div><dt>Lead</dt><dd>{form.lead?.slug}</dd></div>
              <div><dt>Active team</dt><dd>{reviewCount} profiles</dd></div>
              <div><dt>Policy</dt><dd>{form.autonomy === 'review' ? 'Human review' : 'Bounded autonomy'}</dd></div>
              <div><dt>Assessment</dt><dd>{assessment === 'idle' ? 'Not started' : 'Requested separately'}</dd></div>
            </dl>
          </aside>
        </div>
        <button className="text-button" type="button" onClick={() => { setCreated(false); setStep(0); setAssessment('idle') }}>Reset synthetic onboarding</button>
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Project onboarding"
        title="Build the operating agreement first"
        description="Project identity, purpose, team, and policy are reviewed before any synthetic record is created. Assessment is deliberately outside this wizard."
      />

      <nav className="stepper" aria-label="Onboarding progress">
        {ONBOARDING_STEPS.map((label, index) => (
          <div className={`step ${index === step ? 'current' : ''} ${index < step ? 'complete' : ''}`} key={label} aria-current={index === step ? 'step' : undefined}>
            <span>{index < step ? <Icon name="check" size={14} /> : index + 1}</span>
            <strong>{label}</strong>
          </div>
        ))}
      </nav>

      <section className="wizard-card">
        <header className="wizard-head">
          <div>
            <p className="eyebrow">Step {step + 1} of 4</p>
            <h2>{ONBOARDING_STEPS[step]}</h2>
          </div>
          <span className="save-note">Input stays local to this browser session</span>
        </header>

        {error ? <Notice tone="danger" title="Check this step" testId="onboarding-validation"><p>{error}</p></Notice> : null}

        <div className="wizard-content" key={step}>
          {step === 0 ? (
            <div className="form-stack compact-width">
              <label className="form-field">
                <span>Project name <b aria-hidden="true">*</b></span>
                <input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="e.g. Atlas release readiness" autoFocus />
                <small>Clear enough to recognise in a busy project list. Maximum 48 characters.</small>
              </label>
              <label className="form-field">
                <span>Project key <b aria-hidden="true">*</b></span>
                <input value={form.key} onChange={(event) => update('key', event.target.value.toUpperCase())} placeholder="ATLAS" maxLength={10} />
                <small>Stable 2–10 character identifier. Uppercase letters, numbers, and hyphens.</small>
              </label>
              <div className="inline-fact"><Icon name="shield" /><span><strong>No project is created yet.</strong> Review and preflight must pass first.</span></div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="form-stack">
              <label className="form-field">
                <span>Purpose statement <b aria-hidden="true">*</b></span>
                <textarea value={form.purpose} onChange={(event) => update('purpose', event.target.value)} rows={6} placeholder="Describe the outcome, boundary, and evidence that will matter…" autoFocus />
                <small>{form.purpose.length}/500 · Minimum 24 characters for this prototype.</small>
              </label>
              <aside className="purpose-prompt">
                <strong>A useful purpose answers three questions</strong>
                <ol><li>What changes for the user?</li><li>What is outside this project?</li><li>What evidence makes the outcome credible?</li></ol>
              </aside>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="team-policy-grid">
              <section>
                <h3>Team</h3>
                <p className="section-intro">Identity is the Hermes profile slug. Display names are enrichment only.</p>
                <div className="selection-field">
                  <div><span className="field-label">Project lead</span><small>Exactly one available profile is required.</small></div>
                  {form.lead ? (
                    <div className="selected-profile"><span className="avatar">{form.lead.name[0]}</span><span><strong>{form.lead.name}</strong><code>{form.lead.slug}</code></span><button className="button small" type="button" onClick={() => setPickerMode('lead')}>Change</button></div>
                  ) : <button className="button" type="button" onClick={() => setPickerMode('lead')}>Choose lead</button>}
                </div>
                <div className="selection-field">
                  <div><span className="field-label">Members</span><small>Optional at onboarding; more can be added later.</small></div>
                  <button className="button" type="button" onClick={() => setPickerMode('member')}><Icon name="plus" /> Add member</button>
                </div>
                {form.members.length ? (
                  <ul className="chip-list" aria-label="Selected members">
                    {form.members.map((member) => <li key={member.slug}><span><strong>{member.name}</strong><code>{member.slug}</code></span><button type="button" aria-label={`Remove ${member.name}`} onClick={() => update('members', form.members.filter((item) => item.slug !== member.slug))}>×</button></li>)}
                  </ul>
                ) : <p className="empty-inline">No additional members selected.</p>}
              </section>
              <section>
                <h3>Operating policy</h3>
                <fieldset className="choice-group">
                  <legend>Decision autonomy</legend>
                  <label className={form.autonomy === 'review' ? 'selected' : ''}><input type="radio" name="autonomy" checked={form.autonomy === 'review'} onChange={() => update('autonomy', 'review')} /><span><strong>Human review</strong><small>Consequential actions wait for a person.</small></span></label>
                  <label className={form.autonomy === 'bounded' ? 'selected' : ''}><input type="radio" name="autonomy" checked={form.autonomy === 'bounded'} onChange={() => update('autonomy', 'bounded')} /><span><strong>Bounded autonomy</strong><small>Only explicitly allowed low-risk actions proceed.</small></span></label>
                </fieldset>
                <label className="form-field">
                  <span>Verification policy</span>
                  <select value={form.verification} onChange={(event) => update('verification', event.target.value)}>
                    <option value="evidence">Fresh evidence before completion</option>
                    <option value="review">Human review before completion</option>
                  </select>
                </label>
              </section>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="review-layout">
              <section className="review-summary">
                <div className="review-block"><span>Project</span><strong>{form.name}</strong><code>{form.key}</code></div>
                <div className="review-block"><span>Purpose</span><p>{form.purpose}</p></div>
                <div className="review-block"><span>Team</span><strong>{form.lead?.name} · lead</strong><p>{form.members.length ? form.members.map((member) => member.name).join(', ') : 'No additional members'}</p></div>
                <div className="review-block"><span>Policy</span><strong>{form.autonomy === 'review' ? 'Human review' : 'Bounded autonomy'}</strong><p>{form.verification === 'evidence' ? 'Fresh evidence before completion' : 'Human review before completion'}</p></div>
              </section>
              <aside className="preflight-card" data-testid="preflight">
                <div className="preflight-head"><span className="success-orbit small"><Icon name="check" /></span><div><p className="eyebrow">Preflight</p><h3>Ready to create</h3></div></div>
                <ul className="preflight-list">
                  <li><Icon name="check" /><span><strong>Project fields valid</strong><small>Name and stable key are present.</small></span></li>
                  <li><Icon name="check" /><span><strong>One active lead</strong><small><code>{form.lead?.slug}</code> is available.</small></span></li>
                  <li><Icon name="check" /><span><strong>Team set is exact</strong><small>{reviewCount} discovered profile{reviewCount === 1 ? '' : 's'}.</small></span></li>
                  <li><Icon name="check" /><span><strong>Assessment excluded</strong><small>No assessment starts during create.</small></span></li>
                </ul>
                <div className="fingerprint"><span>Preflight fingerprint</span><code>pf_6f08a9d2c141</code></div>
              </aside>
            </div>
          ) : null}
        </div>

        <footer className="wizard-actions">
          <button className="button" type="button" disabled={step === 0} onClick={() => { setError(''); setStep((value) => value - 1) }}>Back</button>
          <span>Nothing is created until Review passes.</span>
          {step < 3 ? <button className="button primary" type="button" onClick={next}>Continue</button> : <button className="button primary" type="button" onClick={() => setCreated(true)}>Create synthetic project</button>}
        </footer>
      </section>

      <ProfilePicker
        open={pickerMode !== null}
        onClose={() => setPickerMode(null)}
        onSelect={selectProfile}
        title={pickerMode === 'lead' ? 'Choose the project lead' : 'Add a team member'}
        exclude={[form.lead?.slug, ...form.members.map((member) => member.slug)].filter(Boolean)}
      />
    </>
  )
}

function Team({ go }) {
  const [members, setMembers] = useState([
    { slug: 'alex', name: 'Alex Morgan', role: 'lead', work: 7, available: true },
    { slug: 'mina', name: 'Mina Patel', role: 'member', work: 0, available: true },
    { slug: 'jordan', name: 'Jordan Lee', role: 'member', work: 4, available: true },
  ])
  const [revision, setRevision] = useState(42)
  const [action, setAction] = useState(null)
  const [candidate, setCandidate] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [message, setMessage] = useState('')

  const currentLead = members.find((member) => member.role === 'lead')
  const memberProfiles = PROFILES.filter((profile) => members.some((member) => member.slug === profile.slug))

  const startAction = (kind) => {
    setAction(kind)
    setCandidate(null)
    setMessage('')
  }

  const confirmAction = () => {
    if (!candidate) return
    if (action === 'add') {
      setMembers((current) => [...current, { slug: candidate.slug, name: candidate.name, role: 'member', work: 0, available: true }])
      setMessage(`${candidate.name} joined as a member.`)
    } else {
      setMembers((current) => current.map((member) => ({ ...member, role: member.slug === candidate.slug ? 'lead' : 'member' })))
      setMessage(`Lead transferred from ${currentLead.name} to ${candidate.name}.`)
    }
    setRevision((value) => value + 1)
    setAction(null)
    setCandidate(null)
  }

  const removeMember = () => {
    setMembers((current) => current.filter((member) => member.slug !== removeTarget.slug))
    setMessage(`${removeTarget.name} was removed. Work check confirmed 0 affected items.`)
    setRevision((value) => value + 1)
    setRemoveTarget(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Membership authority"
        title="Keep one lead, and make work visible"
        description="All identity selection uses the same discovered-profile picker. Removal is direct only when the exact workload is zero."
        actions={<span className="revision-chip">Membership revision <strong>{revision}</strong></span>}
      />

      {message ? <Notice tone="success" title="Membership updated" testId="team-success"><p>{message}</p></Notice> : null}

      <section className="team-command-card">
        <div>
          <p className="eyebrow">Team actions</p>
          <h2>{action === 'add' ? 'Add an existing Hermes profile' : action === 'transfer' ? 'Transfer the active lead' : 'Choose a membership change'}</h2>
          <p>{action === 'add' ? 'The profile must be available and not already on this project.' : action === 'transfer' ? 'The current lead is demoted only when the selected active member is promoted in the same change.' : 'Each action has a distinct consequence and guard.'}</p>
        </div>
        {!action ? (
          <div className="command-actions">
            <button className="button primary" type="button" onClick={() => startAction('add')}><Icon name="plus" /> Add member</button>
            <button className="button" type="button" onClick={() => startAction('transfer')}><Icon name="transfer" /> Transfer lead</button>
          </div>
        ) : (
          <div className="inline-action-panel" data-testid={`${action}-panel`}>
            <div className="candidate-slot">
              {candidate ? <><span className="avatar">{candidate.name[0]}</span><span><strong>{candidate.name}</strong><code>{candidate.slug}</code></span></> : <span>No profile selected</span>}
            </div>
            <button className="button" type="button" onClick={() => setPickerOpen(true)}>{candidate ? 'Change profile' : 'Choose profile'}</button>
            <button className="button primary" type="button" disabled={!candidate} onClick={confirmAction}>{action === 'add' ? 'Confirm add' : 'Confirm lead transfer'}</button>
            <button className="text-button" type="button" onClick={() => { setAction(null); setCandidate(null) }}>Close action</button>
          </div>
        )}
      </section>

      <section className="section team-section">
        <div className="section-head">
          <div><p className="eyebrow">Active roster</p><h2>{members.length} project profiles</h2></div>
          <StatusTag tone="success">Exactly one lead</StatusTag>
        </div>
        <div className="team-table" role="table" aria-label="Project members">
          <div className="team-row team-header" role="row"><span role="columnheader">Profile</span><span role="columnheader">Role</span><span role="columnheader">Affected work</span><span role="columnheader">Action</span></div>
          {members.map((member) => (
            <div className="team-row" role="row" key={member.slug}>
              <div className="member-cell" role="cell"><span className="avatar">{member.name[0]}</span><span><strong>{member.name}</strong><code>{member.slug}</code></span></div>
              <div role="cell"><StatusTag tone={member.role === 'lead' ? 'info' : 'neutral'}>{member.role === 'lead' ? 'Lead' : 'Member'}</StatusTag></div>
              <div className="work-cell" role="cell"><strong>{member.work}</strong><span>{member.work === 1 ? 'item' : 'items'}</span></div>
              <div className="row-actions" role="cell">
                {member.role === 'lead' ? (
                  <button className="button small" type="button" disabled data-contrast="disabled" title="Transfer the lead role first">Remove lead (blocked)</button>
                ) : member.work === 0 ? (
                  <button className="button small danger-outline" type="button" onClick={() => setRemoveTarget(member)}>Remove</button>
                ) : (
                  <button className="button small" type="button" onClick={() => go('exit')}>Exit with transfer</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="only-lead-guard"><Icon name="shield" /><span><strong>Only-lead guard:</strong> {currentLead.name} cannot be removed, marked unavailable, or started on departure until another active member becomes lead.</span></div>
      </section>

      <ProfilePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={setCandidate}
        title={action === 'add' ? 'Choose a profile to add' : 'Choose the next project lead'}
        description={action === 'add' ? 'Already-active members are excluded.' : 'Only active project members are eligible; the current lead is excluded.'}
        exclude={action === 'add' ? members.map((member) => member.slug) : [currentLead.slug]}
        profiles={action === 'transfer' ? memberProfiles : PROFILES}
      />

      <Modal
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title="Remove member with no assigned work?"
        description="This direct path is only available after a complete workload check returns zero."
      >
        {removeTarget ? (
          <>
            <div className="consequence-card">
              <span className="avatar">{removeTarget.name[0]}</span>
              <div><strong>{removeTarget.name}</strong><code>{removeTarget.slug}</code></div>
              <StatusTag tone="success">0 of 0 items</StatusTag>
            </div>
            <Notice tone="info" title="Complete work check"><p>All pages were read at membership revision {revision}. No task reassignment operation is needed.</p></Notice>
            <div className="modal-actions end">
              <button className="button" data-autofocus type="button" onClick={() => setRemoveTarget(null)}>Keep member</button>
              <button className="button danger" type="button" onClick={removeMember}>Confirm removal</button>
            </div>
          </>
        ) : null}
      </Modal>
    </>
  )
}

function WorkItemList({ items, title = 'Exact affected items', complete = true, outcomes = {}, completionLabel, completionTone }) {
  return (
    <section className="work-list" aria-label={title}>
      <header>
        <div><p className="eyebrow">Canonical work read</p><h3>{title}</h3></div>
        <StatusTag tone={completionTone || (complete ? 'success' : 'warning')}>{completionLabel || (complete ? `${items.length} of ${items.length} · complete` : `${items.length} read · incomplete`)}</StatusTag>
      </header>
      <div className="work-list-head"><span>Item</span><span>Status</span><span>Revision</span><span>Outcome</span></div>
      {items.map((item) => (
        <div className="work-item" key={item.id}>
          <span className="work-title"><code>{item.id}</code><strong>{item.title}</strong><small>{item.kind}</small></span>
          <StatusTag tone={item.status === 'running' || item.status === 'scheduled' ? 'warning' : 'neutral'}>{item.status}</StatusTag>
          <code>r{item.revision}</code>
          <span className={`outcome ${outcomes[item.id] || ''}`}>{outcomes[item.id] || (complete ? 'Will transfer' : 'Not authorised')}</span>
        </div>
      ))}
    </section>
  )
}

function ExactPreview({ items, revision, fingerprint, replacement, onChooseReplacement, onStart, started }) {
  const [confirmed, setConfirmed] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => setConfirmed(false), [fingerprint, replacement?.slug])

  if (started) {
    return (
      <Notice tone="success" title="Canonical readback completed" testId="exit-complete">
        <p>Operation <code>OP-SYNTH-204</code> transferred all {items.length} items to <code>{replacement.slug}</code>. Jordan is now departed. No item was hidden or silently retained.</p>
      </Notice>
    )
  }

  return (
    <>
      <div className="preview-grid">
        <WorkItemList items={items} />
        <aside className="preview-rail">
          <div className="scope-lock"><Icon name="shield" /><div><strong>Scope is fixed</strong><p>The operation covers every eligible item shown. There is no subset selection.</p></div></div>
          <div className="metadata-card">
            <div><span>Member leaving</span><code>jordan</code></div>
            <div><span>Membership revision</span><code>{revision}</code></div>
            <div><span>Enumeration</span><strong>{items.length} of {items.length}, all pages</strong></div>
            <div className="full"><span>Preview fingerprint</span><code>{fingerprint}</code></div>
          </div>
          <div className="replacement-card">
            <span className="field-label">Replacement owner</span>
            {replacement ? <div className="selected-profile"><span className="avatar">{replacement.name[0]}</span><span><strong>{replacement.name}</strong><code>{replacement.slug}</code></span></div> : <p>No replacement selected.</p>}
            <button className="button" type="button" onClick={onChooseReplacement}>{replacement ? 'Change replacement' : 'Choose replacement'}</button>
          </div>
          <label className={`confirm-check ${confirmed ? 'selected' : ''}`}>
            <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
            <span>I confirm this exact {items.length}-item scope and fingerprint.</span>
          </label>
          <button className="button primary full-button" type="button" disabled={!replacement || !confirmed} onClick={() => setConfirmOpen(true)}>Start exact transfer</button>
          <p className="microcopy">Membership stays <code>departure_pending</code> until every canonical readback succeeds.</p>
        </aside>
      </div>
      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Start this exact transfer?" description="The durable operation records intent before writing each canonical assignment.">
        <dl className="definition-list boxed">
          <div><dt>Scope</dt><dd>All {items.length} eligible items</dd></div>
          <div><dt>From</dt><dd><code>jordan</code></dd></div>
          <div><dt>To</dt><dd><code>{replacement?.slug}</code></dd></div>
          <div><dt>Revision</dt><dd>{revision}</dd></div>
          <div className="wide"><dt>Fingerprint</dt><dd><code>{fingerprint}</code></dd></div>
        </dl>
        <Notice tone="warning" title="Committed assignments are not represented as reversible"><p>If the operation is interrupted, return to its journal and resume the remaining items.</p></Notice>
        <div className="modal-actions end">
          <button className="button" data-autofocus type="button" onClick={() => setConfirmOpen(false)}>Go back</button>
          <button className="button primary" type="button" onClick={() => { setConfirmOpen(false); onStart() }}>Confirm and start</button>
        </div>
      </Modal>
    </>
  )
}

const EXIT_SCENARIOS = [
  ['ready', 'Ready preview'],
  ['stale', 'Stale preview'],
  ['incomplete', 'Incomplete list'],
  ['blocked', 'Active blockers'],
  ['unreadable', 'Unreadable'],
  ['offline', 'Offline'],
  ['denied', 'Permission denied'],
  ['partial', 'Partial transfer'],
]

function MemberExit() {
  const [scenario, setScenario] = useState('ready')
  const [replacement, setReplacement] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [staleRefreshed, setStaleRefreshed] = useState(false)
  const [pagesComplete, setPagesComplete] = useState(false)
  const [readRecovered, setReadRecovered] = useState(false)
  const [deniedChecked, setDeniedChecked] = useState(false)
  const [partialResumed, setPartialResumed] = useState(false)
  const [started, setStarted] = useState(false)

  const selectScenario = (value) => {
    setScenario(value)
    setStaleRefreshed(false)
    setPagesComplete(false)
    setReadRecovered(false)
    setDeniedChecked(false)
    setPartialResumed(false)
    setStarted(false)
  }

  const readyPreview = (items = READY_ITEMS, revision = 42, fingerprint = 'sha256:8a37c0e7b214b3ad') => (
    <ExactPreview
      items={items}
      revision={revision}
      fingerprint={fingerprint}
      replacement={replacement}
      onChooseReplacement={() => setPickerOpen(true)}
      onStart={() => setStarted(true)}
      started={started}
    />
  )

  let content
  if (scenario === 'ready') content = readyPreview()
  if (scenario === 'stale') content = staleRefreshed ? (
    <>
      <Notice tone="success" title="Preview refreshed"><p>Membership revision advanced from 42 to 43. The exact list and fingerprint were recomputed.</p></Notice>
      {readyPreview(READY_ITEMS, 43, 'sha256:9bd1f77e4c089c31')}
    </>
  ) : (
    <Notice tone="warning" title="Preview is stale" testId="stale-preview" actions={<button className="button warning-action" type="button" onClick={() => setStaleRefreshed(true)}>Refresh exact preview</button>}>
      <p>The team changed after this preview. Expected membership revision <code>42</code>; current revision is <code>43</code>. No transfer was started.</p>
    </Notice>
  )
  if (scenario === 'incomplete') content = pagesComplete ? (
    <>
      <Notice tone="success" title="All pages loaded"><p>The complete 8-item synthetic fixture is now fingerprinted. Confirmation remains all-or-nothing.</p></Notice>
      {readyPreview(PAGINATED_ITEMS, 42, 'sha256:f4d901b6a8c2e511')}
    </>
  ) : (
    <>
      <Notice tone="warning" title="Enumeration is incomplete" testId="incomplete-preview" actions={<button className="button warning-action" type="button" onClick={() => setPagesComplete(true)}>Load every page</button>}>
        <p>Page 1 returned 4 items and a continuation cursor. This partial set cannot produce a confirmation fingerprint.</p>
      </Notice>
      <WorkItemList items={READY_ITEMS} title="Items read so far" complete={false} />
    </>
  )
  if (scenario === 'blocked') content = (
    <>
      <Notice tone="warning" title="2 retryable blockers prevent departure" testId="active-blockers">
        <p>Claimed/running and scheduled work cannot transfer under the current host contract. Resolve those states in canonical Kanban, then refresh the whole preview.</p>
      </Notice>
      <WorkItemList items={BLOCKED_ITEMS} title="Exact blocking items" outcomes={{ 'TASK-190': 'Claim lock present', 'TASK-191': 'Scheduled for owner' }} />
      <div className="blocked-footer"><span>Jordan remains <code>active</code>. No operation has started.</span><button className="button" type="button">Refresh blocker state</button></div>
    </>
  )
  if (scenario === 'unreadable') content = readRecovered ? (
    <>
      <Notice tone="success" title="Canonical read recovered"><p>The full list is readable again. A new fingerprint was generated from current revisions.</p></Notice>
      {readyPreview(READY_ITEMS, 42, 'sha256:c7a45e2a90f14462')}
    </>
  ) : (
    <Notice tone="danger" title="Canonical work state is unreadable" testId="unreadable-state" actions={<button className="button danger-action" type="button" onClick={() => setReadRecovered(true)}>Retry canonical read</button>}>
      <p><code>TASK-201</code> returned no trustworthy state. The item remains a pending blocker; the member cannot depart and no success is shown.</p>
    </Notice>
  )
  if (scenario === 'offline') content = (
    <Notice tone="danger" title="Connection is offline" testId="offline-state" actions={<button className="button danger-action" type="button" onClick={() => setScenario('ready')}>Retry connection</button>}>
      <p>The preview cannot be refreshed while offline. The chosen member and replacement are preserved locally; no mutation was sent.</p>
    </Notice>
  )
  if (scenario === 'denied') content = (
    <Notice tone="danger" title="Permission denied" testId="permission-state" actions={<button className="button danger-action" type="button" onClick={() => setDeniedChecked(true)}>Retry access check</button>}>
      <p>The verified principal does not have <code>membership.admin</code>. No preview authorisation or transfer write was attempted.</p>
      {deniedChecked ? <p className="inline-result">Access is still denied in this synthetic scenario. Ask a project administrator to grant the capability.</p> : null}
    </Notice>
  )
  if (scenario === 'partial') {
    const outcomes = partialResumed
      ? { 'TASK-184': 'Transferred', 'TASK-189': 'Transferred', 'TASK-201': 'Transferred', 'TASK-207': 'Transferred' }
      : { 'TASK-184': 'Transferred', 'TASK-189': 'Transferred', 'TASK-201': 'Pending retry', 'TASK-207': 'Pending retry' }
    content = (
      <>
        <Notice tone={partialResumed ? 'success' : 'warning'} title={partialResumed ? 'Transfer completed after resume' : 'Transfer is partially applied'} testId="partial-transfer">
          <p>Operation <code>OP-XFER-204</code> · idempotency key <code>exit:jordan:r42</code>. {partialResumed ? 'Canonical readback proves all 4 assignments.' : 'Two host writes are committed and two items remain in the durable journal.'}</p>
        </Notice>
        <div className="operation-strip">
          <div><span>Membership</span><StatusTag tone={partialResumed ? 'neutral' : 'warning'}>{partialResumed ? 'departed' : 'departure_pending'}</StatusTag></div>
          <div><span>Progress</span><strong>{partialResumed ? '4 / 4' : '2 / 4'}</strong></div>
          <div><span>Operation state</span><strong>{partialResumed ? 'completed' : 'running'}</strong></div>
          {!partialResumed ? <button className="button primary" type="button" onClick={() => setPartialResumed(true)}>Resume remaining items</button> : null}
        </div>
        <WorkItemList
          items={READY_ITEMS}
          title="Journalled item outcomes"
          outcomes={outcomes}
          completionLabel={partialResumed ? '4 of 4 · transferred' : '4 of 4 · journalled'}
          completionTone={partialResumed ? 'success' : 'warning'}
        />
        {!partialResumed ? <p className="contract-note"><Icon name="shield" /> No cancel or reversal action is exposed: host assignments already committed may not be safely reversible. Resume is idempotent and rereads canonical state.</p> : null}
      </>
    )
  }

  return (
    <>
      <PageHeader
        eyebrow="Consequential member exit"
        title="Every affected item, or no departure"
        description="Preview completeness, membership revision, item revisions, replacement, and fingerprint travel together. The user cannot hide a subset."
        actions={<StatusTag tone="info">Synthetic member · jordan</StatusTag>}
      />

      <div className="scenario-bar" role="tablist" aria-label="Member exit scenarios">
        {EXIT_SCENARIOS.map(([id, label]) => <button key={id} role="tab" type="button" aria-selected={scenario === id} onClick={() => selectScenario(id)}>{label}</button>)}
      </div>

      <section className="exit-stage" data-scenario={scenario}>{content}</section>

      <ProfilePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={setReplacement}
        title="Choose the replacement owner"
        description="Only another available active project member can receive the exact eligible set."
        exclude={['jordan']}
        profiles={PROFILES.filter((profile) => ['alex', 'mina', 'jordan'].includes(profile.slug))}
      />
    </>
  )
}

function EntityEditor({ editor, goals, onClose, onSave }) {
  const editing = editor?.mode === 'edit'
  const source = editor?.kind === 'goal'
    ? goals.find((goal) => goal.id === editor.id)
    : editor?.source
  const [title, setTitle] = useState(source?.title || '')
  const [description, setDescription] = useState(source?.description || '')
  const [goalId, setGoalId] = useState(source?.goalId || '')
  const [error, setError] = useState('')

  useEffect(() => {
    setTitle(source?.title || '')
    setDescription(source?.description || '')
    setGoalId(source?.goalId || '')
    setError('')
  }, [editor?.kind, editor?.mode, editor?.id])

  const save = () => {
    if (title.trim().length < 4) {
      setError('Title must be at least 4 characters.')
      return
    }
    onSave({ title: title.trim(), description: description.trim(), goalId: goalId || null })
  }

  return (
    <Modal
      open={editor !== null}
      onClose={onClose}
      title={`${editing ? 'Edit' : 'Create'} ${editor?.kind || 'item'}`}
      description={editor?.kind === 'goal' ? 'Goals can link several objectives.' : 'An objective may stay unlinked or belong to one goal.'}
    >
      {error ? <Notice tone="danger" title="Cannot save"><p>{error}</p></Notice> : null}
      <div className="form-stack">
        <label className="form-field"><span>Title</span><input data-autofocus value={title} onChange={(event) => setTitle(event.target.value)} /></label>
        {editor?.kind === 'goal' ? <label className="form-field"><span>Description</span><textarea rows={4} value={description} onChange={(event) => setDescription(event.target.value)} /></label> : (
          <label className="form-field"><span>Goal link</span><select value={goalId} onChange={(event) => setGoalId(event.target.value)}><option value="">Unlinked objective</option>{goals.filter((goal) => !goal.archived).map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}</select><small>Leaving this unlinked is valid and preserved.</small></label>
        )}
      </div>
      <div className="modal-actions end"><button className="button" type="button" onClick={onClose}>Close</button><button className="button primary" type="button" onClick={save}>Save {editor?.kind}</button></div>
    </Modal>
  )
}

function Outcomes() {
  const [goals, setGoals] = useState(INITIAL_GOALS)
  const [objectives, setObjectives] = useState(INITIAL_OBJECTIVES)
  const [editor, setEditor] = useState(null)
  const [message, setMessage] = useState('')

  const activeGoals = goals.filter((goal) => !goal.archived)
  const activeObjectives = objectives.filter((objective) => !objective.archived)
  const unlinked = activeObjectives.filter((objective) => !objective.goalId)

  const openGoal = (mode, goal) => setEditor({ kind: 'goal', mode, id: goal?.id })
  const openObjective = (mode, objective) => setEditor({ kind: 'objective', mode, id: objective?.id, source: objective })

  const saveEntity = (draft) => {
    if (editor.kind === 'goal') {
      if (editor.mode === 'edit') setGoals((current) => current.map((goal) => goal.id === editor.id ? { ...goal, title: draft.title, description: draft.description } : goal))
      else setGoals((current) => [...current, { id: `GOAL-${String(current.length + 1).padStart(2, '0')}`, title: draft.title, description: draft.description, objectiveIds: [], archived: false }])
    } else if (editor.mode === 'edit') {
      setObjectives((current) => current.map((objective) => objective.id === editor.id ? { ...objective, title: draft.title, goalId: draft.goalId } : objective))
    } else {
      setObjectives((current) => [...current, { id: `OBJ-${30 + current.length}`, title: draft.title, goalId: draft.goalId, archived: false }])
    }
    setMessage(`${editor.kind === 'goal' ? 'Goal' : 'Objective'} ${editor.mode === 'edit' ? 'updated' : 'created'} in synthetic state.`)
    setEditor(null)
  }

  const archiveGoal = (id, archived) => {
    setGoals((current) => current.map((goal) => goal.id === id ? { ...goal, archived } : goal))
    setMessage(`Goal ${archived ? 'archived' : 'restored'}; linked objectives remain preserved.`)
  }
  const archiveObjective = (id, archived) => {
    setObjectives((current) => current.map((objective) => objective.id === id ? { ...objective, archived } : objective))
    setMessage(`Objective ${archived ? 'archived' : 'restored'} with its goal link preserved.`)
  }

  return (
    <>
      <PageHeader
        eyebrow="Outcome hierarchy"
        title="Goals organise objectives; they do not consume them"
        description="A goal may link many objectives. Existing unlinked objectives remain first-class and can be linked later without migration pressure."
        actions={<div className="page-actions"><button className="button" type="button" onClick={() => openObjective('create')}><Icon name="plus" /> Create objective</button><button className="button primary" type="button" onClick={() => openGoal('create')}><Icon name="plus" /> Create goal</button></div>}
      />

      {message ? <Notice tone="success" title="Outcome state updated"><p>{message}</p></Notice> : null}

      <div className="outcomes-layout">
        <section className="goal-column">
          <div className="column-head"><div><p className="eyebrow">Active goals</p><h2>{activeGoals.length} outcome groups</h2></div><span>{activeObjectives.length - unlinked.length} linked objectives</span></div>
          {activeGoals.map((goal) => {
            const linked = activeObjectives.filter((objective) => objective.goalId === goal.id)
            return (
              <article className="goal-card" key={goal.id}>
                <header><span className="goal-number">{goal.id}</span><div className="card-actions"><button className="text-button" type="button" onClick={() => openGoal('edit', goal)}>Edit</button><button className="text-button" type="button" onClick={() => archiveGoal(goal.id, true)}>Archive</button></div></header>
                <h3>{goal.title}</h3>
                <p>{goal.description}</p>
                <div className="objective-stack">
                  <span className="stack-label">{linked.length} linked objective{linked.length === 1 ? '' : 's'}</span>
                  {linked.map((objective) => (
                    <div className="objective-row" key={objective.id}>
                      <span><code>{objective.id}</code><strong>{objective.title}</strong></span>
                      <div><button className="icon-text" type="button" onClick={() => openObjective('edit', objective)}>Edit</button><button className="icon-text" type="button" onClick={() => archiveObjective(objective.id, true)}>Archive</button></div>
                    </div>
                  ))}
                  {!linked.length ? <p className="empty-inline">No objectives linked yet.</p> : null}
                </div>
              </article>
            )
          })}
        </section>

        <aside className="objective-column">
          <div className="column-head"><div><p className="eyebrow">Unlinked</p><h2>Independent objectives</h2></div><StatusTag tone="neutral">{unlinked.length}</StatusTag></div>
          <p className="section-intro">These remain valid without a goal and are never hidden by the new hierarchy.</p>
          {unlinked.map((objective) => (
            <article className="unlinked-card" key={objective.id}>
              <code>{objective.id}</code><h3>{objective.title}</h3><div className="card-actions"><button className="text-button" type="button" onClick={() => openObjective('edit', objective)}>Edit or link</button><button className="text-button" type="button" onClick={() => archiveObjective(objective.id, true)}>Archive</button></div>
            </article>
          ))}
          {!unlinked.length ? <div className="empty-compact"><strong>No unlinked objectives</strong><span>New objectives can still be created without a goal.</span></div> : null}
        </aside>
      </div>

      <section className="section archive-shelf">
        <div className="section-head"><div><p className="eyebrow">Archive shelf</p><h2>Restorable outcome history</h2></div><span className="section-count">No permanent delete</span></div>
        <div className="archive-items">
          {goals.filter((goal) => goal.archived).map((goal) => <div key={goal.id}><span><StatusTag tone="neutral">Goal</StatusTag><strong>{goal.title}</strong></span><button className="button small" type="button" onClick={() => archiveGoal(goal.id, false)}>Restore goal</button></div>)}
          {objectives.filter((objective) => objective.archived).map((objective) => <div key={objective.id}><span><StatusTag tone="neutral">Objective</StatusTag><strong>{objective.title}</strong></span><button className="button small" type="button" onClick={() => archiveObjective(objective.id, false)}>Restore objective</button></div>)}
        </div>
      </section>

      <EntityEditor editor={editor} goals={goals} onClose={() => setEditor(null)} onSave={saveEntity} />
    </>
  )
}

function Lifecycle() {
  const [milestones, setMilestones] = useState([
    { id: 'MS-04', title: 'Phase 2 interaction approval', due: 'Review boundary', archived: false },
    { id: 'MS-03', title: 'Phase 1 contract checkpoint', due: 'Completed evidence', archived: true },
  ])
  const [projectArchived, setProjectArchived] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [message, setMessage] = useState('')

  const apply = () => {
    if (confirm.kind === 'project') {
      setProjectArchived(true)
      setMessage('Project archived from Stewardship active views. Canonical project, board, tasks, and repository were represented as retained.')
    } else {
      setMilestones((current) => current.map((milestone) => milestone.id === confirm.id ? { ...milestone, archived: true } : milestone))
      setMessage('Milestone archived with attributed work and history preserved.')
    }
    setConfirm(null)
  }

  return (
    <>
      <PageHeader
        eyebrow="Lifecycle boundaries"
        title="Archive first; preserve the record"
        description="Milestones and projects leave active views without permanent deletion. This prototype does not imply that workflow execution pauses."
        actions={<StatusTag tone={projectArchived ? 'neutral' : 'success'}>{projectArchived ? 'Project archived' : 'Project active'}</StatusTag>}
      />

      {message ? <Notice tone="success" title="Lifecycle updated"><p>{message}</p></Notice> : null}

      <div className="lifecycle-grid">
        <section className={`project-lifecycle-card ${projectArchived ? 'archived' : ''}`}>
          <div className="project-emblem"><Icon name="archive" size={24} /></div>
          <div className="project-lifecycle-copy"><p className="eyebrow">Project · ATLAS</p><h2>Atlas release readiness</h2><p>Purpose, membership, evidence, lifecycle history, and links remain available.</p></div>
          <dl className="retention-list">
            <div><dt>Stewardship visibility</dt><dd>{projectArchived ? 'Archived views' : 'Active views'}</dd></div>
            <div><dt>Canonical project + board</dt><dd>Retained</dd></div>
            <div><dt>Tasks + repository</dt><dd>Retained</dd></div>
            <div><dt>Workflow execution</dt><dd>Not claimed paused</dd></div>
          </dl>
          {projectArchived ? <button className="button primary" type="button" onClick={() => { setProjectArchived(false); setMessage('Project restored to active Stewardship views. No workflow-state claim was made.') }}>Restore project</button> : <button className="button danger-outline" type="button" onClick={() => setConfirm({ kind: 'project' })}>Archive project</button>}
        </section>

        <section className="section milestone-section">
          <div className="section-head"><div><p className="eyebrow">Milestones</p><h2>Planning markers</h2></div><span className="section-count">Archive or restore</span></div>
          {milestones.map((milestone) => (
            <div className={`milestone-row ${milestone.archived ? 'archived' : ''}`} key={milestone.id}>
              <span className="timeline-mark" aria-hidden="true" />
              <div><code>{milestone.id}</code><strong>{milestone.title}</strong><small>{milestone.due} · attribution preserved</small></div>
              <StatusTag tone={milestone.archived ? 'neutral' : 'info'}>{milestone.archived ? 'Archived' : 'Active'}</StatusTag>
              {milestone.archived ? <button className="button small" type="button" onClick={() => { setMilestones((current) => current.map((item) => item.id === milestone.id ? { ...item, archived: false } : item)); setMessage('Milestone restored with prior links intact.') }}>Restore</button> : <button className="button small" type="button" onClick={() => setConfirm({ kind: 'milestone', id: milestone.id, title: milestone.title })}>Archive</button>}
            </div>
          ))}
        </section>
      </div>

      <Notice tone="info" title="Permanent deletion is outside this release">
        <p>There is no project, milestone, or workflow purge action in this prototype. Archive and restore preserve history and avoid claims about canonical workflow control.</p>
      </Notice>

      <Modal open={confirm !== null} onClose={() => setConfirm(null)} title={confirm?.kind === 'project' ? 'Archive this project?' : 'Archive this milestone?'} description="Archiving is reversible and retains historical links.">
        {confirm?.kind === 'project' ? (
          <>
            <Notice tone="warning" title="Visibility changes; canonical records remain"><p>The project leaves active Stewardship views. Canonical project, board, tasks, and repository remain untouched. Workflow execution is not represented as paused.</p></Notice>
            <div className="retained-box"><strong>Retained</strong><span>Purpose · team · goals · objectives · milestones · audit history</span></div>
          </>
        ) : <div className="retained-box"><strong>{confirm?.title}</strong><span>Attributed work, dates, links, and audit history remain.</span></div>}
        <div className="modal-actions end"><button className="button" data-autofocus type="button" onClick={() => setConfirm(null)}>Keep active</button><button className="button warning-action" type="button" onClick={apply}>Confirm archive</button></div>
      </Modal>
    </>
  )
}

function StateLab() {
  const [offlineRecovered, setOfflineRecovered] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  return (
    <>
      <PageHeader
        eyebrow="Operational state language"
        title="Nothing empty means “everything is fine”"
        description="Every unavailable or unsafe condition explains what is known, what is blocked, and the next supported action."
      />
      <div className="state-grid">
        <article className="state-card" aria-busy="true">
          <header><StatusTag tone="neutral">Loading</StatusTag><code>profiles.read</code></header>
          <h2>Discovering Hermes profiles</h2>
          <div className="skeleton-stack" aria-hidden="true"><span /><span /><span /></div>
          <p>Selection is unavailable until discovery returns a trustworthy result.</p>
        </article>
        <article className="state-card">
          <header><StatusTag tone="neutral">Empty</StatusTag><code>goals.list</code></header>
          <h2>No active goals yet</h2>
          <p>This project has no active goals. Archived goals, if any, stay in the archive shelf.</p>
          <button className="button small" type="button">Create first goal</button>
        </article>
        <article className="state-card">
          <header><StatusTag tone="danger">Unavailable</StatusTag><code>orbit</code></header>
          <h2>Historical profile not found</h2>
          <p>The reference remains visible but disabled. Create or relink a profile outside this panel, then refresh discovery.</p>
          <button className="button small" type="button" disabled data-contrast="disabled">Select unavailable profile</button>
        </article>
        <article className="state-card">
          <header><StatusTag tone={offlineRecovered ? 'success' : 'danger'}>{offlineRecovered ? 'Online' : 'Offline'}</StatusTag><code>host.connection</code></header>
          <h2>{offlineRecovered ? 'Connection restored' : 'Host connection lost'}</h2>
          <p>{offlineRecovered ? 'Fresh reads are allowed again; no queued mutation was inferred.' : 'Input is preserved locally. Reads and writes remain blocked until a retry succeeds.'}</p>
          {!offlineRecovered ? <button className="button small" type="button" onClick={() => setOfflineRecovered(true)}>Retry connection</button> : null}
        </article>
        <article className="state-card error-state" data-contrast="danger" role="alert">
          <header><StatusTag tone="danger">Validation</StatusTag><code>project.key</code></header>
          <h2>Project key is invalid</h2>
          <p>Use 2–10 uppercase letters, numbers, or hyphens. The field keeps its value for correction.</p>
          <button className="button small danger-action" type="button">Return to field</button>
        </article>
        <article className="state-card warning-state" data-contrast="warning">
          <header><StatusTag tone="warning">Conflict</StatusTag><code>HTTP 409</code></header>
          <h2>Preview fingerprint is stale</h2>
          <p>Membership revision changed. Refresh the complete list before confirming.</p>
          <button className="button small warning-action" type="button">Refresh preview</button>
        </article>
        <article className="state-card warning-state" data-contrast="warning">
          <header><StatusTag tone="warning">Recovery</StatusTag><code>OP-XFER-204</code></header>
          <h2>2 of 4 assignments applied</h2>
          <p>The journal is resumable. Already committed host writes are not presented as reversible.</p>
          <button className="button small warning-action" type="button" onClick={() => setRetryCount((value) => value + 1)}>Resume operation</button>
          {retryCount ? <small className="inline-result">Synthetic resume attempt {retryCount} recorded.</small> : null}
        </article>
        <article className="state-card error-state" data-contrast="danger" role="alert">
          <header><StatusTag tone="danger">Permission denied</StatusTag><code>membership.admin</code></header>
          <h2>Verified principal lacks authority</h2>
          <p>No mutation was sent. A project administrator must grant the capability before retry.</p>
          <button className="button small danger-action" type="button">Retry access check</button>
        </article>
        <article className="state-card error-state" data-contrast="danger" role="alert">
          <header><StatusTag tone="danger">Unreadable</StatusTag><code>TASK-201</code></header>
          <h2>Canonical state could not be read</h2>
          <p>The item remains a blocker. Departure cannot complete until a trustworthy read succeeds.</p>
          <button className="button small danger-action" type="button">Retry canonical read</button>
        </article>
        <article className="state-card warning-state" data-contrast="warning">
          <header><StatusTag tone="warning">Incomplete</StatusTag><code>next_cursor</code></header>
          <h2>More pages remain</h2>
          <p>The partial list is visible for diagnosis but cannot authorise a transfer.</p>
          <button className="button small warning-action" type="button">Load every page</button>
        </article>
      </div>
    </>
  )
}

export default function App() {
  const [route, setRoute] = useState(routeFromHash)
  const queryTheme = new URLSearchParams(window.location.search).get('theme')
  const [theme, setTheme] = useState(queryTheme === 'dark' ? 'dark' : 'light')
  const navRef = useRef(null)
  const navItemsRef = useRef({})

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const nav = navRef.current
      const item = navItemsRef.current[route]
      if (!nav || !item || nav.scrollWidth <= nav.clientWidth) return
      nav.scrollLeft = Math.max(0, item.offsetLeft - (nav.clientWidth - item.offsetWidth) / 2)
    })
    return () => cancelAnimationFrame(frame)
  }, [route])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const go = (id) => {
    window.location.hash = id
    setRoute(id)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const page = useMemo(() => {
    if (route === 'onboarding') return <Onboarding />
    if (route === 'team') return <Team go={go} />
    if (route === 'exit') return <MemberExit />
    if (route === 'outcomes') return <Outcomes />
    if (route === 'lifecycle') return <Lifecycle />
    if (route === 'states') return <StateLab />
    return <Overview go={go} />
  }, [route])

  return (
    <div className="dockyard-root">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <div className="shell">
        <header className="consolebar">
          <button className="brand-button" type="button" onClick={() => go('overview')} aria-label="Project Stewardship overview">
            <span className="brand-mark"><Icon name="target" /></span>
            <span className="brand-copy"><strong>Project Stewardship</strong><span>Phase 2 prototype</span></span>
          </button>
          <div className="console-meta">
            <span className="synthetic-pill"><span aria-hidden="true" /> Synthetic data</span>
            <span className="project-context"><small>Review project</small><strong>Atlas readiness</strong></span>
            <button className="theme-toggle" type="button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} aria-pressed={theme === 'dark'} onClick={() => setTheme((value) => value === 'light' ? 'dark' : 'light')}>
              <Icon name={theme === 'light' ? 'moon' : 'sun'} />
              <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
            </button>
          </div>
        </header>

        <div className="app-layout">
          <aside className="sidebar">
            <div className="sidebar-label"><span>Management</span><small>7 review areas</small></div>
            <nav ref={navRef} aria-label="Prototype journeys">
              {NAV.map((item) => (
                <button
                  ref={(node) => { navItemsRef.current[item.id] = node }}
                  key={item.id}
                  type="button"
                  className="nav-item"
                  aria-current={route === item.id ? 'page' : undefined}
                  data-contrast={route === item.id ? 'selected' : undefined}
                  onClick={() => go(item.id)}
                >
                  <Icon name={item.icon} /><span>{item.label}</span>{route === item.id ? <span className="nav-active" aria-hidden="true" /> : null}
                </button>
              ))}
            </nav>
            <div className="sidebar-note"><Icon name="shield" /><p><strong>Isolated review build</strong>No daemon, profile home, database, or plugin is read.</p></div>
          </aside>

          <main id="main-content" className="main-content" tabIndex={-1}>
            <div className="prototype-banner" role="note"><span>INTERACTIVE PROTOTYPE</span><p>All records and outcomes are deterministic synthetic fixtures. Nothing leaves this browser session.</p></div>
            {page}
          </main>
        </div>
      </div>
    </div>
  )
}
