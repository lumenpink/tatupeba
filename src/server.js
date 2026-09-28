import http from 'node:http';
import { syncBibTeX } from './bibtex.js';
import { getConfig } from './config.js';
import { syncAll } from './index.js';

let isSyncing = false;

export function startServer(options = {}) {
  const config = { ...getConfig(), ...options };
  const port = options.port || process.env.PORT || 3001;
  const host = options.host || '0.0.0.0';

  const server = http.createServer(async (req, res) => {
    // Permite CORS do Obsidian
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname;

    if (pathname === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(
        JSON.stringify({
          app: 'tatupeba',
          status: 'ok',
          syncing: isSyncing,
          userId: config.userId ? 'ok' : 'missing',
          obsidianRefsDir: config.obsidianRefsDir,
          joajuBibPath: config.joajuBibPath
        })
      );
      return;
    }

    if (pathname === '/sync' && (req.method === 'POST' || req.method === 'GET')) {
      if (isSyncing) {
        res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: 'Sincronização já em andamento' }));
        return;
      }

      isSyncing = true;
      try {
        const summary = await syncAll(config);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, summary }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      } finally {
        isSyncing = false;
      }
      return;
    }

    if (pathname === '/bib' && (req.method === 'POST' || req.method === 'GET')) {
      try {
        const result = await syncBibTeX(config);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(
          JSON.stringify({ ok: true, count: result.count, joajuBibPath: config.joajuBibPath })
        );
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Endpoint não encontrado' }));
  });

  server.listen(port, host, () => {
    console.log(`🐾 [Tatupeba HTTP] Escutando em http://${host}:${port}`);
    console.log('   Endpoints: /status, /sync, /bib');
  });

  const intervalHours = Number.parseFloat(
    options.syncIntervalHours || process.env.SYNC_INTERVAL_HOURS || '0'
  );

  let timer = null;
  if (intervalHours > 0) {
    const intervalMs = intervalHours * 60 * 60 * 1000;
    console.log(`⏰ [Tatupeba Cron] Agendamento ativo a cada ${intervalHours} hora(s).`);

    timer = setInterval(async () => {
      if (isSyncing) return;
      isSyncing = true;
      try {
        console.log('⏰ [Tatupeba Cron] Iniciando sincronização periódica programada...');
        await syncAll(config);
        console.log('✔ [Tatupeba Cron] Sincronização periódica concluída com sucesso!');
      } catch (err) {
        console.error(`❌ [Tatupeba Cron] Erro na sincronização agendada: ${err.message}`);
      } finally {
        isSyncing = false;
      }
    }, intervalMs);

    server.on('close', () => {
      if (timer) clearInterval(timer);
    });
  }

  return server;
}
