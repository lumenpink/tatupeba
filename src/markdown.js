import fs from 'node:fs/promises';
import path from 'node:path';

const STOPWORDS = new Set([
  'a',
  'o',
  'as',
  'os',
  'um',
  'uma',
  'uns',
  'umas',
  'de',
  'do',
  'da',
  'dos',
  'das',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'por',
  'pelo',
  'pela',
  'pelos',
  'pelas',
  'para',
  'pra',
  'com',
  'sem',
  'sob',
  'sobre',
  'e',
  'ou',
  'que',
  'the',
  'an',
  'and',
  'or',
  'of',
  'in',
  'on',
  'at',
  'to',
  'for',
  'with',
  'by'
]);

function removeDiacritics(str) {
  return str.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export function buildBbtCitekey(data) {
  let authorPart = '';
  if (Array.isArray(data?.creators) && data.creators.length > 0) {
    const primary = data.creators.find((c) => c.creatorType === 'author') || data.creators[0];
    const rawName = primary.lastName || primary.name || primary.firstName || '';
    const words = removeDiacritics(rawName)
      .split(/[^a-zA-Z0-9]+/)
      .filter((w) => w.length > 0);

    if (words.length > 0) {
      const first = words[0].toLowerCase();
      const rest = words
        .slice(1)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join('');
      authorPart = `${first}${rest}`;
    }
  }

  let titlePart = '';
  if (data?.title && typeof data.title === 'string') {
    const words = removeDiacritics(data.title)
      .split(/[^a-zA-Z0-9]+/)
      .filter((w) => w.length > 0);

    const significant = words.filter((w) => !STOPWORDS.has(w.toLowerCase())).slice(0, 3);

    const chosen = significant.length > 0 ? significant : words.slice(0, 3);
    titlePart = chosen.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
  }

  let yearPart = 'nodate';
  const rawDate = data?.date || data?.year || '';
  if (rawDate) {
    const yearMatch = String(rawDate).match(/\b(\d{4})\b/);
    if (yearMatch) {
      yearPart = yearMatch[1];
    }
  }

  if (!authorPart && !titlePart) {
    return 'semChave';
  }

  const generated = `${authorPart}${titlePart}${yearPart}`.trim();
  return generated || 'semChave';
}

export function extractCitekey(data) {
  if (data?.citationKey && typeof data.citationKey === 'string' && data.citationKey.trim()) {
    return data.citationKey.trim();
  }
  if (data?.extra) {
    const match = data.extra.match(/Citation Key:\s*([^\n\r]+)/);
    if (match?.[1].trim()) {
      return match[1].trim();
    }
  }
  return buildBbtCitekey(data);
}

export function formatAuthors(creators = []) {
  const linksArray = [];
  const validCreators = [];

  for (const creator of creators) {
    let name = '';
    if (creator.lastName) {
      name = creator.lastName.trim();
      if (creator.firstName) {
        name += `, ${creator.firstName.trim()}`;
      }
    } else if (creator.name) {
      name = creator.name.trim();
    }

    if (!name || name.toLowerCase() === 'undefined' || name === ',') {
      continue;
    }

    linksArray.push(`[[${name}]]`);
    validCreators.push(name);
  }

  let authorsYaml = '';
  if (validCreators.length > 0) {
    authorsYaml = '\nauthors:\n';
    for (const name of validCreators) {
      authorsYaml += `  - "[[${name}]]"\n`;
    }
  }

  return {
    yaml: authorsYaml,
    links: linksArray.join(', ') || 'Desconhecido'
  };
}

export function formatTags(rawTags = []) {
  const result = ['referencia_zotero'];
  const seen = new Set(result);

  if (Array.isArray(rawTags)) {
    for (const item of rawTags) {
      const raw = typeof item === 'string' ? item : item?.tag;
      if (!raw || typeof raw !== 'string') continue;
      const clean = removeDiacritics(raw)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');

      if (!clean) continue;
      const tagWithPrefix = clean.startsWith('zot_') ? clean : `zot_${clean}`;
      if (!seen.has(tagWithPrefix)) {
        seen.add(tagWithPrefix);
        result.push(tagWithPrefix);
      }
    }
  }

  return result;
}

export function formatCollections(collectionKeys = [], collectionsMap = {}) {
  if (!Array.isArray(collectionKeys) || collectionKeys.length === 0) {
    return '';
  }

  const names = [];
  for (const key of collectionKeys) {
    const name = collectionsMap[key] || key;
    if (name && !names.includes(name)) {
      names.push(name);
    }
  }

  if (names.length === 0) return '';

  let yaml = '\ncollections:\n';
  for (const name of names) {
    yaml += `  - "${name.replace(/"/g, '\\"')}"\n`;
  }
  return yaml;
}

export function formatBibliographicMeta(reference = {}) {
  const fields = [
    { key: 'item_type', val: reference.itemType },
    {
      key: 'publication',
      val: reference.publicationTitle || reference.bookTitle || reference.proceedingsTitle
    },
    { key: 'publisher', val: reference.publisher },
    { key: 'place', val: reference.place },
    { key: 'volume', val: reference.volume },
    { key: 'issue', val: reference.issue || reference.number },
    { key: 'pages', val: reference.pages },
    { key: 'doi', val: reference.doi },
    { key: 'isbn', val: reference.isbn },
    { key: 'issn', val: reference.issn },
    { key: 'url', val: reference.url },
    { key: 'date', val: reference.date },
    { key: 'edition', val: reference.edition }
  ];

  let yaml = '';
  for (const { key, val } of fields) {
    if (val !== undefined && val !== null && String(val).trim() !== '') {
      const cleanVal = String(val).trim();
      if (key === 'item_type') {
        yaml += `${key}: ${cleanVal}\n`;
      } else {
        yaml += `${key}: "${cleanVal.replace(/"/g, '\\"')}"\n`;
      }
    }
  }

  return yaml;
}

export function renderInkSvg(ann) {
  let pos = ann?.annotationPosition;
  if (typeof pos === 'string') {
    try {
      pos = JSON.parse(pos);
    } catch {
      return '';
    }
  }

  const rawPaths = pos?.paths || (Array.isArray(pos) ? pos : null);
  if (!Array.isArray(rawPaths) || rawPaths.length === 0) {
    return '';
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  const validPaths = [];
  for (const path of rawPaths) {
    if (!Array.isArray(path) || path.length === 0) continue;
    const points = [];
    for (const pt of path) {
      if (Array.isArray(pt) && pt.length >= 2) {
        const x = Number(pt[0]);
        const y = Number(pt[1]);
        if (!Number.isNaN(x) && !Number.isNaN(y)) {
          points.push([x, y]);
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (points.length > 0) {
      validPaths.push(points);
    }
  }

  if (validPaths.length === 0 || !Number.isFinite(minX)) {
    return '';
  }

  const padding = 10;
  const vbX = Math.floor(minX - padding);
  const vbY = Math.floor(minY - padding);
  const vbW = Math.max(20, Math.ceil(maxX - minX + padding * 2));
  const vbH = Math.max(20, Math.ceil(maxY - minY + padding * 2));
  const color = ann?.annotationColor || '#000000';

  const pathElements = validPaths
    .map((pts) => {
      const d = `M ${pts[0][0]} ${pts[0][1]}${pts
        .slice(1)
        .map((p) => ` L ${p[0]} ${p[1]}`)
        .join('')}`;
      return `  <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
    })
    .join('\n');

  return `<svg viewBox="${vbX} ${vbY} ${vbW} ${vbH}" width="100%" height="auto" style="max-height: 400px; display: block; margin: 8px 0;" xmlns="http://www.w3.org/2000/svg">\n${pathElements}\n</svg>`;
}

export function formatAnnotations(itemPdfs, annotationsByPdf) {
  let annotationsMD = '';

  for (const pdf of itemPdfs) {
    const pdfAnns = annotationsByPdf[pdf.key] || [];

    for (const ann of pdfAnns) {
      const pageLabel = ann.annotationPageLabel || '1';
      const pdfLink = `[Ver no PDF](zotero://open-pdf/library/items/${pdf.key}?page=${pageLabel})`;

      if (ann.annotationType === 'highlight' && ann.annotationText) {
        annotationsMD += `\n> [!quote] Grifo (p. ${pageLabel}) - ${pdfLink}\n> ${ann.annotationText}\n`;
      }

      if (ann.annotationType === 'ink') {
        const svg = renderInkSvg(ann);
        annotationsMD += `\n> [!quote] ✍️ Desenho Livre (p. ${pageLabel}) - ${pdfLink}\n`;
        if (svg) {
          annotationsMD += `> ${svg.replace(/\n/g, '\n> ')}\n`;
        }
      }

      if (ann.annotationType === 'image' && ann.imageRelativePath) {
        annotationsMD += `\n![[${ann.imageRelativePath}]]\n*Legenda: Imagem p. ${pageLabel} - ${pdfLink}*\n`;
      }

      if (ann.annotationComment) {
        annotationsMD += `\n> [!note] Minha Reflexão (p. ${pageLabel}) - ${pdfLink}\n> ${ann.annotationComment}\n`;
      }
    }
  }

  return annotationsMD.trim();
}

export function generateLiteratureNote(
  reference,
  pdfs = [],
  annotationsByPdf = {},
  collectionsMap = {}
) {
  const citekey = extractCitekey(reference);
  const title = (reference.title || 'Sem Título').replace(/"/g, "'").trim();
  const year = reference.date ? reference.date.substring(0, 4) : 'S.d.';
  const abstract = reference.abstractNote
    ? reference.abstractNote.trim()
    : 'Nenhum resumo disponível.';
  const { yaml: authorsYaml, links: authorsLinks } = formatAuthors(reference.creators);
  const collectionsYaml = formatCollections(reference.collections, collectionsMap);
  const bibMetaYaml = formatBibliographicMeta(reference);
  const tagsList = formatTags(reference.tags);
  const tagsYaml = tagsList.map((t) => `  - ${t}`).join('\n');

  const primaryPdf = pdfs.length > 0 ? pdfs[0] : null;
  const pdfLinkHeader = primaryPdf
    ? ` | [Abrir PDF](zotero://open-pdf/library/items/${primaryPdf.key})`
    : '';

  const annotationsText = formatAnnotations(pdfs, annotationsByPdf);

  let metaBlock = '';
  if (bibMetaYaml) {
    metaBlock += bibMetaYaml;
  }
  if (collectionsYaml) {
    metaBlock += collectionsYaml;
  }

  return `---
title: "${title}"${authorsYaml}year: ${year}
citekey: ${citekey}
${metaBlock}tags:
${tagsYaml}
---

# ${title}

> [!abstract] **Informações e Links**
> **Autores:** ${authorsLinks}
> **Publicado em:** ${year}
> **Links:** [Abrir no Zotero](zotero://select/library/items/${reference.key})${pdfLinkHeader}

## 📝 Resumo
${abstract}

## 🖍️ Anotações e Grifos
${annotationsText || '*Nenhuma marcação extraída.*'}
`;
}

export async function writeAllNotes(organized, outputDir, collectionsMap = {}) {
  await fs.mkdir(outputDir, { recursive: true });

  const written = [];
  for (const ref of organized.references) {
    const citekey = extractCitekey(ref);
    const pdfs = organized.pdfsByReference[ref.key] || [];
    const content = generateLiteratureNote(ref, pdfs, organized.annotationsByPdf, collectionsMap);

    // Sanitiza nome do arquivo
    const safeCitekey = citekey.replace(/[<>:"/\\|?*]/g, '_');
    const filePath = path.join(outputDir, `${safeCitekey}.md`);
    await fs.writeFile(filePath, content, 'utf-8');
    written.push({ citekey: safeCitekey, filePath, title: ref.title });
  }

  return written;
}
