import fs from 'node:fs/promises';
import path from 'node:path';

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
  return data?.key || 'sem_chave';
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
