import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  calculateCropBox,
  findPdfZipInStorage,
  generatePageOverlaySvg,
  saveInkAsSvg
} from '../src/extractor.js';

describe('PDF Annotation Image Extractor', () => {
  describe('calculateCropBox', () => {
    it('calcula coordenadas de recorte cartesianas a 150 DPI com origem no canto inferior esquerdo', () => {
      // Coordenadas reais de JVRW7KMK no Zotero
      const rect = [64.114, 330.787, 308.475, 507.291];
      const pageDimensions = { width: 595.3, height: 793.7 };
      const dpi = 150;

      const crop = calculateCropBox(rect, pageDimensions, dpi);

      // 150 / 72 = 2.0833333333333335
      // x: Math.round(64.114 * 2.08333) = 134
      // y: Math.round((793.7 - 507.291) * 2.08333) = Math.round(286.409 * 2.08333) = 597
      // width: Math.round((308.475 - 64.114) * 2.08333) = Math.round(244.361 * 2.08333) = 509
      // height: Math.round((507.291 - 330.787) * 2.08333) = Math.round(176.504 * 2.08333) = 368
      assert.equal(crop.x, 134);
      assert.equal(crop.y, 597);
      assert.equal(crop.width, 509);
      assert.equal(crop.height, 368);
    });

    it('lida com retângulos invertidos (x2 < x1 ou y2 < y1)', () => {
      const rect = [308.475, 507.291, 64.114, 330.787];
      const pageDimensions = { width: 595.3, height: 793.7 };
      const crop = calculateCropBox(rect, pageDimensions, 150);

      assert.equal(crop.x, 134);
      assert.equal(crop.y, 597);
      assert.equal(crop.width, 509);
      assert.equal(crop.height, 368);
    });
  });

  describe('generatePageOverlaySvg', () => {
    it('gera SVG de página inteira invertendo o eixo vertical dos traços ink para casar com a imagem raster', () => {
      const pageDimensions = { width: 595.3, height: 793.7 };
      const dpi = 150;
      const inks = [
        {
          annotationColor: '#ff0000',
          annotationPosition: {
            paths: [
              [100, 200, 150, 250] // Array linear de coordenadas Zotero
            ]
          }
        }
      ];

      const svg = generatePageOverlaySvg(inks, pageDimensions, dpi);

      assert.ok(svg.includes('viewBox="0 0 595.3 793.7"'));
      assert.ok(svg.includes('width="1240"'));
      assert.ok(svg.includes('height="1654"'));
      assert.ok(svg.includes('stroke="#ff0000"'));

      // y1 original = 200 -> invertido: 793.7 - 200 = 593.70
      // y2 original = 250 -> invertido: 793.7 - 250 = 543.70
      assert.ok(svg.includes('593.70'));
      assert.ok(svg.includes('543.70'));
    });

    it('retorna string vazia se não houver inks', () => {
      const pageDimensions = { width: 595.3, height: 793.7 };
      const svg = generatePageOverlaySvg([], pageDimensions, 150);
      assert.equal(svg, '');
    });
  });

  describe('findPdfZipInStorage', () => {
    it('encontra recursivamente o arquivo ${parentItem}.zip dentro da pasta de storage do WebDAV', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tatupeba-test-'));
      const subDir = path.join(tmpDir, 'lumen', 'zotero');
      await fs.mkdir(subDir, { recursive: true });

      const targetZip = path.join(subDir, 'YABWMSBC.zip');
      await fs.writeFile(targetZip, 'dummy-zip-content');

      const found = await findPdfZipInStorage(tmpDir, 'YABWMSBC');
      assert.equal(found, targetZip);

      const notFound = await findPdfZipInStorage(tmpDir, 'INEXISTENTE');
      assert.equal(notFound, null);

      await fs.rm(tmpDir, { recursive: true, force: true });
    });
  });

  describe('saveInkAsSvg', () => {
    it('persiste anotação ink como arquivo .svg standalone em 01_zotero/attachments', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tatupeba-ink-test-'));
      const ann = {
        key: 'INK123',
        annotationType: 'ink',
        annotationColor: '#2ea8e5',
        annotationPosition: {
          paths: [[10, 20, 30, 40]]
        }
      };

      const relPath = await saveInkAsSvg(ann, tmpDir);
      assert.equal(relPath, '01_zotero/attachments/INK123.svg');

      const savedContent = await fs.readFile(path.join(tmpDir, 'INK123.svg'), 'utf-8');
      assert.ok(savedContent.includes('<svg'));
      assert.ok(savedContent.includes('stroke="#2ea8e5"'));

      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('retorna null se anotação for nula ou não for do tipo ink', async () => {
      assert.equal(await saveInkAsSvg(null, '/tmp'), null);
      assert.equal(await saveInkAsSvg({ annotationType: 'highlight' }, '/tmp'), null);
      assert.equal(await saveInkAsSvg({ annotationType: 'ink' }, '/tmp'), null);
    });
  });

  describe('Mutantes de Composição Gráfica', () => {
    it('garante que a chamada ao ImageMagick inclui -background none para preservar transparência', async () => {
      const extractorSource = await fs.readFile(
        path.join(import.meta.dirname, '../src/extractor.js'),
        'utf-8'
      );
      assert.ok(
        extractorSource.includes("'-background',"),
        'Mutante detectado: flag -background ausente no comando magick'
      );
      assert.ok(
        extractorSource.includes("'none',"),
        'Mutante detectado: valor none ausente para -background no magick'
      );
    });
  });
});
