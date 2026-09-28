import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { organizeEntities } from '../src/zotero.js';

describe('Zotero Entity Organizer', () => {
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
});
