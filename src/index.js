import { syncBibTeX } from './bibtex.js';
import { getConfig } from './config.js';
import { writeAllNotes } from './markdown.js';
import { fetchAllCollections, fetchAllItems, organizeEntities } from './zotero.js';

export { cleanBibTeX, countBibEntries, saveBibTeX, syncBibTeX } from './bibtex.js';
export { getConfig } from './config.js';
export {
  extractCitekey,
  formatAnnotations,
  formatAuthors,
  formatCollections,
  formatTags,
  generateLiteratureNote,
  writeAllNotes
} from './markdown.js';
export { startServer } from './server.js';
export {
  buildCollectionsHierarchy,
  fetchAllCollections,
  fetchAllItems,
  fetchBibTeX,
  organizeEntities
} from './zotero.js';

export async function syncAll(customConfig = {}, onProgress = null) {
  const config = { ...getConfig(), ...customConfig };

  if (!config.userId || !config.apiKey) {
    throw new Error(
      'Credenciais do Zotero ausentes! Defina ZOTERO_USER_ID e ZOTERO_API_KEY no arquivo .env ou em ~/.config/tatupeba/config.json'
    );
  }

  if (onProgress) {
    onProgress({ action: 'sync_start', userId: config.userId });
  }

  // 1. Sincronização dos itens, coleções e notas Markdown
  let collectionsMap = {};
  try {
    collectionsMap = await fetchAllCollections(config, onProgress);
  } catch (err) {
    if (onProgress) {
      onProgress({ action: 'collections_warn', message: err.message });
    }
  }

  const items = await fetchAllItems(config, onProgress);
  const organized = organizeEntities(items);
  const writtenNotes = await writeAllNotes(organized, config.obsidianRefsDir, collectionsMap);

  if (onProgress) {
    onProgress({
      action: 'notes_written',
      totalNotes: writtenNotes.length,
      obsidianDir: config.obsidianRefsDir
    });
  }

  // 2. Sincronização do arquivo BibTeX
  const bibResult = await syncBibTeX(config, onProgress);

  const summary = {
    totalItems: items.length,
    references: organized.references.length,
    attachments: organized.attachments.length,
    annotations: organized.annotations.length,
    notesWritten: writtenNotes.length,
    bibEntries: bibResult.count,
    obsidianDir: config.obsidianRefsDir,
    joajuBibPath: config.joajuBibPath
  };

  if (onProgress) {
    onProgress({ action: 'sync_done', summary });
  }

  return summary;
}
