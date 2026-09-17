import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('Desktop recovery rejects stale project responses and removes completed entries', () => {
  execFileSync(process.execPath, [fileURLToPath(new URL('../../../tests/desktop-transfer-races.cjs', import.meta.url))], { timeout: 30000, stdio: 'pipe' });
});
