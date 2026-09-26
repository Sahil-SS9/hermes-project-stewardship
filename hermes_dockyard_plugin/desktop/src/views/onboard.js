// GENERATED-STRUCTURE: hand-edited Desktop module. Edit this file, then run
// node hermes_dockyard_plugin/desktop/build.mjs to regenerate plugin.js.
import { jsxs } from '../runtime/react.js'
import { jsx } from '../runtime/react.js'
import { PageHead } from '../lib/ui.js'
import { StatusTag } from '../lib/ui.js'
import { number } from '../lib/ui.js'
import { plural } from '../lib/ui.js'
import { Button } from '../lib/ui.js'
export function OnboardPanel({ view, onOpen, onRefresh }) {
  const profiles = view.profiles ?? []
  return jsxs('div', { 'data-onboard-tab': true, children: [
    jsx(PageHead, {
      title: 'Onboard a project',
      description: 'Create a new project or connect an existing repository. Onboarding validates and connects; it never enables automation by itself.',
      onRefresh,
    }),
    jsxs('section', { className: 'dockyard-feature-card', children: [
      jsxs('div', { className: 'dockyard-section-head', children: [
        jsxs('div', { children: [jsx('h2', { children: 'New project' }), jsx('p', { children: 'The wizard discovers the host, validates the project and connects it before stewardship is enabled.' })] }),
        jsx(StatusTag, { tone: 'neutral', label: `${number(profiles.length)} discoverable ${plural(profiles.length, 'profile')}` }),
      ]}),
      jsx(Button, { action: 'open-onboard-tab', variant: 'primary', onClick: onOpen, children: 'Open onboarding wizard' }),
    ]}),
  ]})
}
