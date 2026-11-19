import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { renderInkSvg } from './markdown.js';

const execFileAsync = promisify(execFile);

/**
 * Calcula a caixa de recorte (crop box) a partir das coordenadas do Zotero e dimensões da página.
 * O Zotero utiliza o sistema de coordenadas nativo do PDF (origem no canto inferior esquerdo a 72 DPI).
 *
 * @param {Array<number>} rect - [x1, y1, x2, y2]
 * @param {{ width: number, height: number }} pageDimensions
 * @param {number} dpi
 * @returns {{ x: number, y: number, width: number, height: number }}
 */
export function calculateCropBox(rect, pageDimensions, dpi = 150) {
  if (!Array.isArray(rect) || rect.length < 4) {
    throw new Error('Retângulo de recorte inválido');
  }

  const [rawX1, rawY1, rawX2, rawY2] = rect;
  const x1 = Math.min(rawX1, rawX2);
  const x2 = Math.max(rawX1, rawX2);
  const y1 = Math.min(rawY1, rawY2);
  const y2 = Math.max(rawY1, rawY2);

  const scale = dpi / 72.0;

  const cropX = Math.round(x1 * scale);
  const cropY = Math.round((pageDimensions.height - y2) * scale);
  const cropW = Math.round((x2 - x1) * scale);
  const cropH = Math.round((y2 - y1) * scale);

  return {
    x: cropX,
    y: cropY,
    width: cropW,
    height: cropH
  };
}

/**
 * Gera um arquivo SVG de sobreposição de página inteira a partir das anotações do tipo ink.
 * Inverte o eixo vertical dos pontos para alinhar à imagem raster gerada (origem superior esquerdo).
 *
 * @param {Array<object>} inks
 * @param {{ width: number, height: number }} pageDimensions
 * @param {number} dpi
 * @returns {string}
 */
export function generatePageOverlaySvg(inks, pageDimensions, dpi = 150) {
  if (!Array.isArray(inks) || inks.length === 0) {
    return '';
  }

  const scale = dpi / 72.0;
  const imgW = Math.round(pageDimensions.width * scale);
  const imgH = Math.round(pageDimensions.height * scale);
  const pdfH = pageDimensions.height;

  const svgPaths = [];

  for (const ink of inks) {
    let pos = ink?.annotationPosition;
    if (typeof pos === 'string') {
      try {
        pos = JSON.parse(pos);
      } catch {
        continue;
      }
    }

    const rawPaths = pos?.paths || (Array.isArray(pos) ? pos : null);
    if (!Array.isArray(rawPaths)) continue;

    const color = ink?.annotationColor || '#ff0000';

    for (const p of rawPaths) {
      if (!Array.isArray(p) || p.length === 0) continue;

      const points = [];
      if (typeof p[0] === 'number') {
        for (let i = 0; i < p.length; i += 2) {
          if (i + 1 < p.length) {
            points.push([p[i], pdfH - p[i + 1]]);
          }
        }
      } else {
        for (const pt of p) {
          if (Array.isArray(pt) && pt.length >= 2) {
            points.push([pt[0], pdfH - pt[1]]);
          }
        }
      }

      if (points.length > 0) {
        const d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}${points
          .slice(1)
          .map((pt) => ` L ${pt[0].toFixed(2)} ${pt[1].toFixed(2)}`)
          .join('')}`;
        svgPaths.push(
          `  <path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`
        );
      }
    }
  }

  if (svgPaths.length === 0) {
    return '';
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}" viewBox="0 0 ${pageDimensions.width} ${pageDimensions.height}">\n${svgPaths.join('\n')}\n</svg>`;
}

/**
 * Localiza recursivamente o arquivo ${parentItem}.zip dentro do diretório de armazenamento.
 *
 * @param {string} storageDir
 * @param {string} parentItem
 * @returns {Promise<string|null>}
 */
export async function findPdfZipInStorage(storageDir, parentItem) {
  if (!storageDir || !parentItem) return null;

  try {
    const entries = await fs.readdir(storageDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(storageDir, entry.name);
      if (entry.isDirectory()) {
        const found = await findPdfZipInStorage(fullPath, parentItem);
        if (found) return found;
      } else if (entry.isFile() && entry.name === `${parentItem}.zip`) {
        return fullPath;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Obtém as dimensões de uma página específica de um PDF usando pdfinfo.
 *
 * @param {string} pdfPath
 * @param {number} pageNumber
 * @returns {Promise<{ width: number, height: number }>}
 */
export async function getPdfPageDimensions(pdfPath, pageNumber) {
  const { stdout } = await execFileAsync('pdfinfo', [
    '-f',
    String(pageNumber),
    '-l',
    String(pageNumber),
    pdfPath
  ]);

  const match = stdout.match(/Page size:\s+([\d.]+)\s+x\s+([\d.]+)\s+pts/);
  if (match) {
    return {
      width: Number.parseFloat(match[1]),
      height: Number.parseFloat(match[2])
    };
  }

  // Fallback para tamanho A4 padrão caso pdfinfo não reporte o padrão esperado
  return { width: 595.3, height: 841.9 };
}

/**
 * Processa uma anotação do tipo 'image', realizando o desempacotamento, sobreposição de inks e recorte.
 *
 * @param {object} ann
 * @param {Array<object>} allInks
 * @param {object} options
 * @param {string} options.storageDir
 * @param {string} options.outputDir
 * @param {number} [options.dpi=150]
 * @returns {Promise<string|null>} Caminho relativo do arquivo gerado ou null
 */
export async function processAnnotationImage(ann, allInks = [], options = {}) {
  const { storageDir, outputDir, dpi = 150 } = options;
  if (!ann || ann.annotationType !== 'image') return null;

  const parentItem = ann.parentItem;
  if (!parentItem) return null;

  let pos = ann.annotationPosition;
  if (typeof pos === 'string') {
    try {
      pos = JSON.parse(pos);
    } catch {
      return null;
    }
  }

  const pageIndex = pos?.pageIndex ?? 0;
  const pageNumber = pageIndex + 1;
  const rects = pos?.rects;
  if (!Array.isArray(rects) || rects.length === 0) return null;
  const targetRect = rects[0];

  const zipPath = await findPdfZipInStorage(storageDir, parentItem);
  if (!zipPath) return null;

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tatupeba-crop-'));

  try {
    // 1. Descompactar o PDF do zip
    await execFileAsync('unzip', ['-o', zipPath, '*.pdf', '-d', tmpDir]);
    const files = await fs.readdir(tmpDir);
    const pdfFile = files.find((f) => f.toLowerCase().endsWith('.pdf'));
    if (!pdfFile) return null;

    const fullPdfPath = path.join(tmpDir, pdfFile);

    // 2. Medir dimensões da página
    const pageDims = await getPdfPageDimensions(fullPdfPath, pageNumber);

    // 3. Renderizar a página em PNG
    const pagePngPrefix = path.join(tmpDir, 'page');
    await execFileAsync('pdftoppm', [
      '-png',
      '-r',
      String(dpi),
      '-f',
      String(pageNumber),
      '-l',
      String(pageNumber),
      fullPdfPath,
      pagePngPrefix
    ]);

    // pdftoppm gera nomes no padrão page-01.png ou page-1.png
    const tmpFiles = await fs.readdir(tmpDir);
    const renderedPng = tmpFiles.find((f) => f.startsWith('page-') && f.endsWith('.png'));
    if (!renderedPng) return null;

    let currentBaseImage = path.join(tmpDir, renderedPng);

    // 4. Filtrar inks da mesma página
    const pageInks = allInks.filter((ink) => {
      let p = ink.annotationPosition;
      if (typeof p === 'string') {
        try {
          p = JSON.parse(p);
        } catch {
          return false;
        }
      }
      return (
        ink.parentItem === parentItem &&
        (p?.pageIndex === pageIndex || ink.annotationPageLabel === ann.annotationPageLabel)
      );
    });

    // 5. Sobrepor SVG se houver desenhos livres
    const overlaySvg = generatePageOverlaySvg(pageInks, pageDims, dpi);
    if (overlaySvg) {
      const svgPath = path.join(tmpDir, 'overlay.svg');
      await fs.writeFile(svgPath, overlaySvg);

      const composedPath = path.join(tmpDir, 'composed.png');
      await execFileAsync('magick', [
        '-background',
        'none',
        currentBaseImage,
        svgPath,
        '-composite',
        composedPath
      ]);
      currentBaseImage = composedPath;
    }

    // 6. Calcular dimensões e recortar
    const crop = calculateCropBox(targetRect, pageDims, dpi);
    const fileName = `${ann.key}.png`;
    const targetPath = path.join(outputDir, fileName);

    await fs.mkdir(outputDir, { recursive: true });

    await execFileAsync('magick', [
      currentBaseImage,
      '-crop',
      `${crop.width}x${crop.height}+${crop.x}+${crop.y}`,
      '+repage',
      targetPath
    ]);

    return `01_zotero/attachments/${fileName}`;
  } catch {
    return null;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Persiste uma anotação do tipo 'ink' como arquivo .svg standalone em 01_zotero/attachments.
 *
 * @param {object} ann
 * @param {string} outputDir
 * @returns {Promise<string|null>} Caminho relativo ou null
 */
export async function saveInkAsSvg(ann, outputDir) {
  if (!ann || ann.annotationType !== 'ink' || !ann.key) return null;
  const svg = renderInkSvg(ann);
  if (!svg) return null;

  await fs.mkdir(outputDir, { recursive: true });
  const fileName = `${ann.key}.svg`;
  const filePath = path.join(outputDir, fileName);
  await fs.writeFile(filePath, svg, 'utf-8');

  return `01_zotero/attachments/${fileName}`;
}
