// Entry: register the Dockyard tab with the host plugin registry.
import { initApp } from './app';
import { getSDK } from './api';
import type { HermesPluginSDK } from './api';

function whenReady(): Promise<void> {
  if (document.readyState !== 'loading') return Promise.resolve();
  return new Promise((resolve) =>
    document.addEventListener('DOMContentLoaded', () => resolve(), { once: true }),
  );
}

function registerPlugin(sdk: HermesPluginSDK): void {
  const registry = (window as any).__HERMES_PLUGINS__;
  const React = sdk.React;
  if (!registry || typeof registry.register !== 'function' || !React) {
    // Dev fallback: render directly into #root
    const root = document.getElementById('root');
    if (root) initApp(sdk, root);
    return;
  }
  const { useEffect, useRef } = sdk.hooks;
  const DockyardTab = () => {
    const ref = useRef(null);
    useEffect(() => {
      if (ref.current) {
        ref.current.innerHTML = '';
        initApp(sdk, ref.current);
      }
    }, []);
    return React.createElement('div', { ref, className: 'dy-host' });
  };
  registry.register('hermes-dockyard', DockyardTab);
}

void whenReady().then(() => {
  const sdk: HermesPluginSDK | null = getSDK();
  if (!sdk) {
    console.error('[hermes-dockyard] Hermes plugin SDK not present');
    return;
  }
  registerPlugin(sdk);
});
