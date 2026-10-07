// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
//
// Workflows (Sahil's pick, 07/10/2026: loops shown as a frame): the canvas
// hooks. The step panel says, in plain words: Who does it, What to do,
// Repeat, Ask me first, Limits. Real fields (who, what, repeat) save with the
// panel's own Save button through the screen's one save path; the rest are
// stand-ins kept in memory and tagged "Preview". A step that repeats is drawn
// inside a frame on the canvas, and its repeat settings live on that frame.
import { readStepSettings } from './standins.js'
import { writeStepSettings } from './standins.js'
import { CHECK_WORDS } from './standins.js'

const el = (tag, className, text) => {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}
const previewTag = () => el('span', 'dy-wfd-preview-tag', 'Preview')
const section = (title, { preview = false, help } = {}) => {
  const box = el('section', 'dy-wfx-section')
  const head = el('h5', '', title)
  if (preview) head.appendChild(previewTag())
  box.appendChild(head)
  if (help) box.appendChild(el('p', 'dy-wfx-help', help))
  return box
}
const labelled = (text, control) => {
  const label = el('label', 'dy-wf-field')
  label.append(el('span', '', text), control)
  return label
}

export const roundsWords = (n) => `Up to ${n} round${n === 1 ? '' : 's'}, then asks you`

// The step panel's extra sections for one step.
function panelExtras({ node, stored, members, settingsKey, onEditFrame }) {
  const current = readStepSettings(...settingsKey(node.node_id))
  const root = el('div', 'dy-wfx')
  if (node.human_gate) {
    // A sign-off step is done by you: the workflow waits here for your decision.
    const who = section('Who does it')
    who.appendChild(el('p', 'dy-wfx-help', 'You. The workflow waits here until you approve or send it back.'))
    root.appendChild(who)
    return { el: root, apply: (next) => next }
  }

  const who = section('Who does it')
  const pick = el('select', 'dy-wfx-select'); pick.setAttribute('data-wfx-who', ''); pick.setAttribute('aria-label', 'Who does it')
  const choices = ['', ...members]
  if (stored?.phase_team && !members.includes(stored.phase_team)) choices.push(stored.phase_team)
  for (const value of choices) { const o = el('option', '', value || 'Whoever the project picks'); o.value = value; pick.appendChild(o) }
  pick.value = stored?.phase_team ?? node.phase_team ?? ''
  who.appendChild(pick)

  const what = section('What to do')
  const body = el('textarea', 'dy-wfx-textarea'); body.rows = 3; body.setAttribute('data-wfx-body', ''); body.setAttribute('aria-label', 'What to do')
  body.placeholder = 'The instructions the bot gets for this step.'
  body.value = stored?.body ?? ''
  what.appendChild(body)
  root.append(who, what)

  // Repeat: a step that repeats is edited on its frame; one that does not
  // can be made to repeat here (3 rounds, changed on the frame). The first
  // step cannot repeat: the engine gates each round on a step before it.
  const repeats = Boolean(stored?.loop ?? node.loop)
  const roundsNow = Number((stored?.loop ?? node.loop)?.max_iterations ?? 3)
  let repeatBox = null
  const repeat = section('Repeat')
  if (repeats) {
    repeat.appendChild(el('p', 'dy-wfx-help', `${roundsWords(roundsNow)}. The repeat settings are on this step's frame on the canvas.`))
    const open = el('button', 'dy-btn', 'Edit the repeat'); open.type = 'button'; open.setAttribute('data-wfx-edit-frame', node.node_id)
    open.addEventListener('click', () => onEditFrame?.(node.node_id, open.getBoundingClientRect()))
    repeat.appendChild(open)
  } else if (!(node.depends_on ?? []).length) {
    const why = el('p', 'dy-wfx-help', "This step comes first, so it can't repeat: each round waits on a step before it.")
    why.setAttribute('data-wfx-no-repeat', '')
    repeat.appendChild(why)
  } else {
    repeatBox = el('input'); repeatBox.type = 'checkbox'; repeatBox.checked = false; repeatBox.setAttribute('data-wfx-repeat', '')
    const repeatLabel = el('label', 'dy-wfx-check'); repeatLabel.append(repeatBox, el('span', '', 'Try again if a round gets stuck (up to 3 rounds; change it on the frame)'))
    repeat.appendChild(repeatLabel)
  }
  root.appendChild(repeat)

  const ask = section('Ask me first', { preview: true })
  const askBox = el('input'); askBox.type = 'checkbox'; askBox.checked = current.askFirst; askBox.setAttribute('data-wfx-ask-first', '')
  const askLabel = el('label', 'dy-wfx-check'); askLabel.append(askBox, el('span', '', 'Ask me before this step starts'))
  ask.appendChild(askLabel)

  const limits = section('Limits', { preview: true, help: 'Not sent to the bot yet.' })
  const turns = el('input', 'dy-wfx-input'); turns.type = 'number'; turns.min = '1'; turns.value = current.limits.turns; turns.setAttribute('data-wfx-turns', '')
  const minutes = el('input', 'dy-wfx-input'); minutes.type = 'number'; minutes.min = '1'; minutes.value = current.limits.minutes; minutes.setAttribute('data-wfx-minutes', '')
  const skills = el('input', 'dy-wfx-input'); skills.value = current.limits.skills; skills.placeholder = 'e.g. github-pr-workflow'; skills.setAttribute('data-wfx-skills', '')
  const pair = el('div', 'dy-wfx-pair'); pair.append(labelled('At most turns', turns), labelled('At most minutes', minutes))
  limits.append(pair, labelled('Tools (skills)', skills))
  root.append(ask, limits)

  const apply = (next) => {
    writeStepSettings(...settingsKey(node.node_id), {
      check: current.check,
      askFirst: askBox.checked,
      limits: { turns: turns.value, minutes: minutes.value, skills: skills.value.trim() },
    })
    const patch = { body: body.value.trim() || null }
    if (repeatBox) patch.loop = repeatBox.checked ? { max_iterations: 3, until: { status: 'done' } } : null
    return { ...next, phase_team: pick.value || null, design_patch: patch }
  }
  return { el: root, apply }
}

// The hooks for one mounted canvas.
//   storedNode(id): the saved (or draft) step, with fields the canvas lacks.
//   settingsKey(id): [project, workflow, id] for the preview settings.
export function canvasDesignHooks({ draft, members, storedNode, settingsKey, onEditFrame }) {
  // Card notes must fit beside the status word on a 208px card (~20
  // characters), so a step is named by a short title, its id, or its title's
  // first word.
  const shortName = (id) => {
    const t = storedNode(id)?.title ?? id
    if (t.length <= 10) return t
    return id.length <= 10 ? id : t.split(/\s+/)[0]
  }
  // members may be a getter: the team arrives after the canvas mounts.
  const team = () => (typeof members === 'function' ? members() : members) ?? []
  return {
    labels: { heading: 'This step', title: 'Step name', deps: 'Comes after (step IDs)', team: '', save: draft ? 'Apply to draft' : 'Save version' },
    compactFacts: true,
    panelExtras: (node) => panelExtras({ node, stored: storedNode(node.node_id), members: team(), settingsKey, onEditFrame }),
    cardNote: (node) => {
      if (node.loop) return '↻ Repeats'
      if (node.when) return `If ${shortName(node.when.node)} ${node.when.status === 'blocked' ? 'gets stuck' : 'is done'}`
      // "Sign-off", not "Your sign-off": the gate's status ("awaiting
      // decision") is the longest on the card and they share the line.
      if (node.human_gate) return 'Sign-off'
      return null
    },
    frames: (nodes) => nodes.filter((n) => n.loop).map((n) => {
      const check = readStepSettings(...settingsKey(n.node_id)).check
      return {
        id: n.node_id,
        nodeIds: [n.node_id],
        label: `↻ ${roundsWords(Number(n.loop.max_iterations))}`,
        sublabel: check.by !== 'none' ? `Checked by: ${CHECK_WORDS[check.by]} (preview)` : null,
        onOpen: (rect) => onEditFrame?.(n.node_id, rect),
      }
    }),
  }
}
