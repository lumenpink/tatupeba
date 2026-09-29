import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { startServer } from '../src/server.js';

describe('Tatupeba HTTP Server', () => {
  let server;
  const testPort = 3999;

  before(() => {
    server = startServer({ port: testPort, host: '127.0.0.1', silent: true });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
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

  it('bloqueia acesso com 401 se serverToken estiver ativo e token for ausente/inválido', async () => {
    const authServer = startServer({
      port: 3998,
      host: '127.0.0.1',
      serverToken: 'minha_chave',
      silent: true
    });
    try {
      const resNoAuth = await fetch('http://127.0.0.1:3998/sync');
      assert.equal(resNoAuth.status, 401);

      const resWrongAuth = await fetch('http://127.0.0.1:3998/sync', {
        headers: { Authorization: 'Bearer errado' }
      });
      assert.equal(resWrongAuth.status, 401);

      const resValidKey = await fetch('http://127.0.0.1:3998/status', {
        headers: { 'X-Api-Key': 'minha_chave' }
      });
      assert.equal(resValidKey.status, 200);
    } finally {
      await new Promise((resolve) => authServer.close(resolve));
    }
  });
});
