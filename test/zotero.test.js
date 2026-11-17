import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  buildCollectionsHierarchy,
  organizeEntities,
  syncAnnotationImages
} from '../src/zotero.js';

describe('Zotero Entity Organizer', () => {
  it('constroi mapa hierarquico de colecoes', () => {
    const rawCollections = [
      { data: { key: 'ROOT1', name: 'Educação', parentCollection: false } },
      { data: { key: 'SUB1', name: 'Ensino Médio', parentCollection: 'ROOT1' } },
      { data: { key: 'SUB2', name: 'Integrado', parentCollection: 'SUB1' } }
    ];
    const map = buildCollectionsHierarchy(rawCollections);
    assert.equal(map.ROOT1, 'Educação');
    assert.equal(map.SUB1, 'Educação/Ensino Médio');
    assert.equal(map.SUB2, 'Educação/Ensino Médio/Integrado');
  });

  it('evita loop infinito em colecoes com referencia circular', () => {
    const raw = [
      { data: { key: 'C1', name: 'Ciclo 1', parentCollection: 'C2' } },
      { data: { key: 'C2', name: 'Ciclo 2', parentCollection: 'C1' } }
    ];
    const map = buildCollectionsHierarchy(raw);
    assert.ok(map.C1.includes('Ciclo'));
  });

  it('separa referências, anexos e anotações relacionando-os por chave', () => {
    const items = [
      {
        data: {
          key: 'REF1',
          itemType: 'book',
          title: 'Livro de Teste'
        }
      },
      {
        data: {
          key: 'ATT1',
          itemType: 'attachment',
          parentItem: 'REF1',
          title: 'Arquivo.pdf'
        }
      },
      {
        data: {
          key: 'ANN1',
          itemType: 'annotation',
          parentItem: 'ATT1',
          annotationType: 'highlight',
          annotationText: 'Citação chave'
        }
      }
    ];

    const result = organizeEntities(items);
    assert.equal(result.references.length, 1);
    assert.equal(result.attachments.length, 1);
    assert.equal(result.annotations.length, 1);

    assert.equal(result.pdfsByReference.REF1.length, 1);
    assert.equal(result.pdfsByReference.REF1[0].key, 'ATT1');

    assert.equal(result.annotationsByPdf.ATT1.length, 1);
    assert.equal(result.annotationsByPdf.ATT1[0].key, 'ANN1');
  });

  it('baixa e associa imageRelativePath para anotacoes do tipo image', async () => {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tatupeba-img-test-'));
    try {
      const annotations = [
        {
          key: 'IMG1',
          annotationType: 'image'
        }
      ];

      // Cria previamente para testar cache
      const attachDir = path.join(tmpDir, '01_zotero', 'attachments');
      await fs.mkdir(attachDir, { recursive: true });
      await fs.writeFile(path.join(attachDir, 'IMG1.png'), 'fake-png-data');

      const config = {
        obsidianRefsDir: tmpDir,
        userId: '123',
        apiKey: 'key'
      };

      await syncAnnotationImages(annotations, config);
      assert.equal(annotations[0].imageRelativePath, '01_zotero/attachments/IMG1.png');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('syncAnnotationImages lida com configuracao incompleta sem erros', async () => {
    await assert.doesNotReject(syncAnnotationImages([], {}));
    await assert.doesNotReject(syncAnnotationImages([{ annotationType: 'image' }], null));
  });
});
