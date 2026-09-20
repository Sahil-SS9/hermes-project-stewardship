import assert from 'node:assert/strict'
import { build } from '../dashboard/node_modules/esbuild/lib/main.js'
import { JSDOM } from '../dashboard/node_modules/jsdom/lib/api.js'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

async function bundle() {
  const dir = await mkdtemp(join(tmpdir(), 'dockyard-canvas-'))
  const out = join(dir, 'mount.mjs')
  await build({ entryPoints: [new URL('./workflow-canvas-mount.js', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'browser', outfile: out, loader: { '.ts': 'ts' } })
  return { dir, out }
}
function globals(dom) {
  Object.assign(globalThis, { document: dom.window.document, window: dom.window, HTMLElement: dom.window.HTMLElement, SVGElement: dom.window.SVGElement, SVGSVGElement: dom.window.SVGSVGElement, matchMedia: () => ({ matches: false }) })
}

test('Desktop shared mount renders production canvas and disposes cleanly', async () => {
  const { dir, out } = await bundle()
  try {
    const dom = new JSDOM('<main id="host"></main>', { pretendToBeVisual: true, url: 'http://localhost/' }); globals(dom)
    const { mountDesktopWorkflowCanvas } = await import(`${out}?t=${Date.now()}`)
    const host = document.querySelector('#host')
    const dispose = mountDesktopWorkflowCanvas(host, 'p1', 'release', { nodes: [{ id: 'step-1', title: 'Ship', depends_on: [], human_gate: false }] }, [{ run_key: 'r1', version: 1, status: 'running', nodes: [{ node_id: 'step-1', status: 'working', title: 'Ship' }] }])
    await new Promise((resolve) => setTimeout(resolve, 25))
    assert.equal(host.querySelector('[data-wf-action="zoom-in"]')?.textContent, '+')
    assert.match(host.textContent, /Ship/)
    dispose(); assert.equal(host.childElementCount, 0)
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('Desktop canvas edit callback receives a canonical graph payload', async () => {
  const { dir, out } = await bundle()
  try {
    const dom = new JSDOM('<main id="host"></main>', { pretendToBeVisual: true, url: 'http://localhost/' }); globals(dom)
    const { mountDesktopWorkflowCanvas } = await import(`${out}?t=${Date.now()}`)
    const host = document.querySelector('#host'); let payload
    const dispose = mountDesktopWorkflowCanvas(host, 'p1', 'release', { nodes: [{ id: 'a', title: 'Plan', depends_on: [], human_gate: false }, { id: 'b', title: 'Ship', depends_on: ['a'], human_gate: false }] }, [], { onEdit: (nodes) => { payload = nodes } })
    await new Promise((resolve) => setTimeout(resolve, 25))
    host.querySelector('[data-node-id="b"]').dispatchEvent(new dom.window.Event('click', { bubbles: true }))
    host.querySelector('[aria-label="Node title"]').value = 'Ship it'
    host.querySelector('[aria-label="Dependencies"]').value = ''
    host.querySelector('[aria-label="Phase team override"]').value = 'release-bots'
    host.querySelector('button.dy-btn.primary').dispatchEvent(new dom.window.Event('click', { bubbles: true }))
    await new Promise((resolve) => setTimeout(resolve, 0))
    const edited = payload.find((node) => node.node_id === 'b')
    assert.equal(edited.title, 'Ship it'); assert.deepEqual(edited.depends_on, []); assert.equal(edited.phase_team, 'release-bots')
    dispose()
  } finally { await rm(dir, { recursive: true, force: true }) }
})
