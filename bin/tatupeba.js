#!/usr/bin/env node

import { syncBibTeX } from '../src/bibtex.js';
import { getConfig } from '../src/config.js';
import { syncAll } from '../src/index.js';
import { writeAllNotes } from '../src/markdown.js';
import { startServer } from '../src/server.js';
import { fetchAllItems, organizeEntities } from '../src/zotero.js';

const VERSION = '0.1.0-dev.1';

function showHelp() {
  console.log(`
🐾 Tatupeba v${VERSION} - Extrator e Sincronizador Zotero -> Obsidian + Joaju
"Assim se constrói."

Uso:
  tatupeba [comando] [opções]

Comandos:
  sync          Sincronização completa (notas Markdown no Obsidian + BibTeX no Joaju)
  bib           Sincroniza apenas o arquivo BibTeX (rápido)
  notes         Sincroniza apenas as notas de literatura Markdown
  serve         Inicia micro-servidor HTTP para gatilhos remotos (Obsidian/Mobile)
  status        Verifica credenciais e caminhos configurados
  help, -h      Exibe esta ajuda
  version, -v   Exibe a versão do Tatupeba

Opções:
  --obsidian <dir>    Caminho customizado do diretório de referências do Obsidian
  --bib <arquivo>     Caminho customizado do arquivo referencias.bib do Joaju
  --port <num>        Porta para o comando serve (padrão: 3001)
  --verbose           Modo detalhado de logs

Exemplos:
  tatupeba sync
  tatupeba bib
  tatupeba serve --port 3001
  tatupeba status
`);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    command: 'sync',
    options: {}
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help' || arg === 'help') {
      parsed.command = 'help';
    } else if (arg === '-v' || arg === '--version' || arg === 'version') {
      parsed.command = 'version';
    } else if (
      arg === 'sync' ||
      arg === 'bib' ||
      arg === 'notes' ||
      arg === 'serve' ||
      arg === 'status'
    ) {
      parsed.command = arg;
    } else if (arg === '--obsidian' && args[i + 1]) {
      parsed.options.obsidianRefsDir = args[++i];
    } else if (arg === '--bib' && args[i + 1]) {
      parsed.options.joajuBibPath = args[++i];
    } else if (arg === '--port' && args[i + 1]) {
      parsed.options.port = Number.parseInt(args[++i], 10);
    } else if (arg === '--verbose') {
      parsed.options.verbose = true;
    }
  }

  return parsed;
}

async function main() {
  const { command, options } = parseArgs();

  if (command === 'help') {
    showHelp();
    process.exit(0);
  }

  if (command === 'version') {
    console.log(`tatupeba v${VERSION}`);
    process.exit(0);
  }

  const config = { ...getConfig(), ...options };

  if (command === 'status') {
    console.log('🐾 [Tatupeba] Diagnóstico de Configuração:');
    console.log(
      `  - Zotero User ID : ${config.userId ? `Configurado (${config.userId})` : '❌ Ausente'}`
    );
    console.log(`  - Zotero API Key : ${config.apiKey ? 'Configurado (oculto)' : '❌ Ausente'}`);
    console.log(`  - Destino Obsidian: ${config.obsidianRefsDir}`);
    console.log(`  - Destino Joaju   : ${config.joajuBibPath}`);
    process.exit(0);
  }

  if (command === 'serve') {
    startServer(config);
    return;
  }

  console.log('🐾 [Tatupeba] Iniciando sincronização...');

  try {
    if (command === 'bib') {
      console.log('📚 Sincronizando apenas BibTeX com o Zotero...');
      const result = await syncBibTeX(config, (ev) => {
        if (ev.action === 'fetch_bibtex') {
          process.stdout.write(`  ⏳ Baixando registros BibTeX (offset: ${ev.start})...\r`);
        }
      });
      console.log(`\n✔ BibTeX sincronizado com sucesso! (${result.count} entradas exportadas)`);
      console.log(`  → Joaju: ${config.joajuBibPath}`);
      return;
    }

    if (command === 'notes') {
      console.log('📝 Sincronizando apenas notas de literatura Markdown...');
      const items = await fetchAllItems(config, (ev) => {
        if (ev.action === 'fetch_items') {
          process.stdout.write(
            `  ⏳ Baixando itens da biblioteca (coletados: ${ev.totalFetched})...\r`
          );
        }
      });
      console.log(`\n  📦 ${items.length} itens recebidos da API.`);
      const organized = organizeEntities(items);
      const notes = await writeAllNotes(organized, config.obsidianRefsDir);
      console.log(`✔ ${notes.length} notas Markdown salvas em: ${config.obsidianRefsDir}`);
      return;
    }

    // Default: syncAll
    const summary = await syncAll(config, (ev) => {
      if (ev.action === 'fetch_items') {
        process.stdout.write(`  ⏳ Baixando acervo Zotero (coletados: ${ev.totalFetched})...\r`);
      } else if (ev.action === 'notes_written') {
        console.log(`\n  📝 ${ev.totalNotes} notas de literatura escritas em ${ev.obsidianDir}`);
      } else if (ev.action === 'fetch_bibtex') {
        process.stdout.write(`  ⏳ Baixando BibTeX (offset: ${ev.start})...\r`);
      }
    });

    console.log('\n✔ Sincronização concluída com sucesso!');
    console.log(`  - Total de Itens Zotero: ${summary.totalItems}`);
    console.log(`  - Referências: ${summary.references}`);
    console.log(`  - Anexos (PDFs): ${summary.attachments}`);
    console.log(`  - Grifos/Anotações: ${summary.annotations}`);
    console.log(`  - Notas no Obsidian: ${summary.notesWritten} notas geradas`);
    console.log(`  - Entradas BibTeX: ${summary.bibEntries} salvas em ${summary.joajuBibPath}`);
  } catch (err) {
    console.error(`\n❌ Falha na execução do Tatupeba: ${err.message}`);
    process.exit(1);
  }
}

main();
