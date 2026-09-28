import fs from 'node:fs/promises';
import path from 'node:path';
import { fetchBibTeX } from './zotero.js';

export function countBibEntries(bibContent) {
  if (!bibContent) return 0;
  const matches = bibContent.match(/@[a-zA-Z]+\s*\{/g);
  return matches ? matches.length : 0;
}

export function cleanBibTeX(rawBib) {
  if (!rawBib) return '';
  return `${rawBib.replace(/@misc\{noauthor_notitle_nodate[^}]*\}\s*/g, '').trim()}\n`;
}

export async function saveBibTeX(bibContent, targetPath) {
  const dir = path.dirname(targetPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(targetPath, cleanBibTeX(bibContent), 'utf-8');
}

export async function syncBibTeX(config, onProgress) {
  if (onProgress) {
    onProgress({ action: 'sync_bibtex_start' });
  }

  const bibContent = await fetchBibTeX(config, onProgress);
  const count = countBibEntries(bibContent);

  // Salva no destino principal do Joaju
  if (config.joajuBibPath) {
    await saveBibTeX(bibContent, config.joajuBibPath);
  }

  // Salva também no cofre do Obsidian para backup/consulta local
  if (config.obsidianRefsDir) {
    const obsidianBibPath = path.join(config.obsidianRefsDir, '01_zotero', 'referencias.bib');
    await saveBibTeX(bibContent, obsidianBibPath);
  }

  if (onProgress) {
    onProgress({ action: 'sync_bibtex_done', count, joajuBibPath: config.joajuBibPath });
  }

  return { count, bibContent };
}
