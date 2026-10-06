// C7 Reports: new reports name events with the Activity tab's words.
// The backend cannot import this JavaScript, so
// src/hermes_project_stewardship/persistence/report_words.py keeps its own
// copy of the Activity tab's fixed labels. This test fails if the copy and
// src/lib/event-vocab.js ever differ, in either direction.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describeEvent, KNOWN_EVENT_TYPES } from './src/lib/event-vocab.js'

const python = readFileSync(fileURLToPath(new URL('../../src/hermes_project_stewardship/persistence/report_words.py', import.meta.url)), 'utf8')
const start = python.indexOf('EVENT_WORDS = {')
const block = python.slice(start, python.indexOf('\n}', start))
const backendWords = Object.fromEntries([...block.matchAll(/^ {4}"([a-z_.]+)": "([^"]+)",$/gm)].map((match) => [match[1], match[2]]))
const resubmitted = /^RESUBMITTED_WORDS = "([^"]+)"$/m.exec(python)?.[1]

test('the backend has words for every event type the Activity tab names, and no others', () => {
  assert.ok(start >= 0 && Object.keys(backendWords).length >= 17, 'the backend word list was read')
  assert.deepEqual(Object.keys(backendWords).sort(), [...KNOWN_EVENT_TYPES].sort())
})

test('each backend word is the Activity tab\'s label for that type', () => {
  for (const [type, words] of Object.entries(backendWords)) {
    assert.equal(describeEvent({ event_type: type, payload: {} }).label, words, type)
  }
  assert.equal(describeEvent({ event_type: 'initiative.approval_required', payload: { resubmitted: true } }).label, resubmitted, 'a resubmitted proposal')
})

test('an unknown type and the "by" line follow the same rules on both sides', () => {
  // report_words.sentence and report_words.actor are pinned to these same
  // answers in tests/test_report_words.py.
  assert.equal(describeEvent({ event_type: 'milestone.created', payload: {} }).label, 'Milestone created')
  assert.equal(describeEvent({ event_type: 'project.content_uploaded', payload: {} }).label, 'Project content uploaded')
  assert.equal(describeEvent({ event_type: 'work.assigned', emitted_by: 'system', payload: {} }).by, 'System')
  assert.equal(describeEvent({ event_type: 'work.assigned', emitted_by: 'system', payload: { actor: 'sahil' } }).by, 'sahil')
  assert.equal(describeEvent({ event_type: 'work.assigned', emitted_by: 'octacon', payload: {} }).by, 'octacon')
})
