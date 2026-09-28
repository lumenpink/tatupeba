import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractCitekey,
  formatAnnotations,
  formatAuthors,
  generateLiteratureNote
} from '../src/markdown.js';

describe('Markdown Generator', () => {
  it('extrai citationKey nativo se disponível no objeto', () => {
    const data = {
      key: 'DEF123',
      citationKey: 'moysesLadoEscuroDislexia2011'
    };
    assert.equal(extractCitekey(data), 'moysesLadoEscuroDislexia2011');
  });

  it('extrai citekey do Better BibTeX se disponível no campo extra', () => {
    const data = {
      key: 'DEF123',
      extra: 'Citation Key: latour2012\nOutra coisa: 123'
    };
    assert.equal(extractCitekey(data), 'latour2012');
  });

  it('usa fallback da key Zotero se não houver Citation Key', () => {
    const data = {
      key: 'XYZ789',
      extra: 'Nota avulsa'
    };
    assert.equal(extractCitekey(data), 'XYZ789');
  });

  it('formata lista de autores para links do Obsidian e YAML', () => {
    const creators = [{ firstName: 'Bruno', lastName: 'Latour' }, { name: 'Comitê Invisível' }];
    const { yaml, links } = formatAuthors(creators);
    assert.ok(yaml.includes('- "[[Latour, Bruno]]"'));
    assert.ok(yaml.includes('- "[[Comitê Invisível]]"'));
    assert.equal(links, '[[Latour, Bruno]], [[Comitê Invisível]]');
  });

  it('formata anotações e grifos corretamente com callouts', () => {
    const pdfs = [{ key: 'PDFKEY1' }];
    const annotationsByPdf = {
      PDFKEY1: [
        {
          annotationType: 'highlight',
          annotationText: 'Texto grifado de grande relevância.',
          annotationPageLabel: '42'
        },
        {
          annotationComment: 'Minha observação crítica.',
          annotationPageLabel: '42'
        }
      ]
    };

    const formatted = formatAnnotations(pdfs, annotationsByPdf);
    assert.ok(formatted.includes('> [!quote] Grifo (p. 42)'));
    assert.ok(formatted.includes('Texto grifado de grande relevância.'));
    assert.ok(formatted.includes('> [!note] Minha Reflexão (p. 42)'));
    assert.ok(formatted.includes('Minha observação crítica.'));
  });

  it('monta a nota de literatura completa', () => {
    const ref = {
      key: 'ITEM1',
      title: 'Ciência em Ação',
      date: '2000-01-01',
      abstractNote: 'Um clássico dos estudos de ciência e tecnologia.',
      extra: 'Citation Key: latour2000',
      creators: [{ lastName: 'Latour', firstName: 'Bruno' }]
    };

    const note = generateLiteratureNote(ref, [], {});
    assert.ok(note.startsWith('---\n'));
    assert.ok(note.includes('citekey: latour2000'));
    assert.ok(note.includes('# Ciência em Ação'));
    assert.ok(note.includes('[[Latour, Bruno]]'));
    assert.ok(note.includes('Um clássico dos estudos de ciência e tecnologia.'));
  });
});
