import test from 'node:test';
import assert from 'node:assert/strict';
import { createDemoServer } from '../scripts/serve.mjs';

test('the demo server exposes only its explicit public asset allowlist', async t => {
  const server = createDemoServer();
  await new Promise(resolve => server.listen(0, 'localhost', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const root = ['http:', '', 'localhost:' + server.address().port].join('/');
  for (const path of ['/package.json', '/README.md', '/.git/config', '/unknown.mjs', '/%2e%2e/package.json']) {
    const response = await fetch(root + path);
    assert.equal(response.status, 404);
  }
  const page = await fetch(root);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /connect-src 'none'/);
  assert.match(await page.text(), /Multilingual Quality Gate/);
  assert.equal((await fetch(root, { method: 'POST', body: 'example' })).status, 405);
  assert.equal((await fetch(root, { method: 'HEAD' })).status, 200);
});
