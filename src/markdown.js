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
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function buildBbtCitekey(data) {
  let authorPart = '';
  if (Array.isArray(data?.creators) && data.creators.length > 0) {
    const primary =
      data.creators.find((c) => c.creatorType === 'author') || data.creators[0];
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

    const significant = words
      .filter((w) => !STOPWORDS.has(w.toLowerCase()))
      .slice(0, 3);

    const chosen = significant.length > 0 ? significant : words.slice(0, 3);
    titlePart = chosen
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('');
  }

  let yearPart = 'nodate';
  const rawDate = data?.date || data?.year || '';
  if (rawDate) {
    const yearMatch = String(rawDate).match(/\b(\d{4})\b/);
    if (yearMatch) {
      yearPart = yearMatch[1];
    }
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

export function generateLiteratureNote(reference, pdfs = [], annotationsByPdf = {}) {
  const citekey = extractCitekey(reference);
  const title = (reference.title || 'Sem Título').replace(/"/g, "'").trim();
  const year = reference.date ? reference.date.substring(0, 4) : 'S.d.';
  const abstract = reference.abstractNote
    ? reference.abstractNote.trim()
    : 'Nenhum resumo disponível.';
  const { yaml: authorsYaml, links: authorsLinks } = formatAuthors(reference.creators);

  const primaryPdf = pdfs.length > 0 ? pdfs[0] : null;
  const pdfLinkHeader = primaryPdf
    ? ` | [Abrir PDF](zotero://open-pdf/library/items/${primaryPdf.key})`
    : '';

  const annotationsText = formatAnnotations(pdfs, annotationsByPdf);

  return `---
title: "${title}"${authorsYaml}year: ${year}
citekey: ${citekey}
tags:
  - referencia_zotero
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

export async function writeAllNotes(organized, outputDir) {
  await fs.mkdir(outputDir, { recursive: true });

  const written = [];
  for (const ref of organized.references) {
    const citekey = extractCitekey(ref);
    const pdfs = organized.pdfsByReference[ref.key] || [];
    const content = generateLiteratureNote(ref, pdfs, organized.annotationsByPdf);

    // Sanitiza nome do arquivo
    const safeCitekey = citekey.replace(/[<>:"/\\|?*]/g, '_');
    const filePath = path.join(outputDir, `${safeCitekey}.md`);
    await fs.writeFile(filePath, content, 'utf-8');
    written.push({ citekey: safeCitekey, filePath, title: ref.title });
  }

  return written;
}
