import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startServer } from '../src/server.js';

describe('Tatupeba HTTP Server', () => {
  let server;
  const testPort = 3999;

  before(() => {
    server = startServer({ port: testPort, host: '127.0.0.1' });
  });

  after(() => {
    server.close();
  });

  it('responde 200 e status JSON em GET /status com cabeçalhos CORS', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/status`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
    const data = await res.json();
    assert.equal(data.app, 'tatupeba');
    assert.equal(data.status, 'ok');
  });

  it('responde 204 para requisições OPTIONS pré-flight', async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/status`, {
      method: 'OPTIONS'
    });
    assert.equal(res.status, 204);
  });
});
