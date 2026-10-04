// Owner decision 03/10/2026 (Q3): the Settings form shows the open-initiative
// limit the backend actually enforces (persistence/service.py, propose_initiative):
// the verification policy's number, else the legacy notification key, else 5.
// The old form default (3) disagreed, so saving any other setting quietly
// lowered the real limit.
import { test } from 'node:test'
import assert from 'node:assert/strict'

const model = await import('./src/project/settings-model.js')

test('nothing saved: the backend default, 5', () => {
  assert.equal(model.DEFAULT_MAX_OPEN_INITIATIVES, 5)
  assert.equal(model.effectiveMaxOpenInitiatives(undefined), 5)
  assert.equal(model.effectiveMaxOpenInitiatives({}), 5)
  assert.equal(model.effectiveMaxOpenInitiatives({ verification: {}, notification: {} }), 5)
})

test('a saved verification number is kept', () => {
  assert.equal(model.effectiveMaxOpenInitiatives({ verification: { max_open_initiatives: 50 } }), 50)
  assert.equal(model.effectiveMaxOpenInitiatives({ verification: { max_open_initiatives: 2 }, notification: { max_open_initiatives: 9 } }), 2,
    'the verification policy wins, as in the backend')
})

test('the legacy notification key is used when verification has none, as in the backend', () => {
  assert.equal(model.effectiveMaxOpenInitiatives({ notification: { max_open_initiatives: 2 } }), 2)
})
