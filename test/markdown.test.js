import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractCitekey,
  formatAnnotations,
  formatAuthors,
  formatBibliographicMeta,
  formatCollections,
  formatTags,
  generateLiteratureNote,
  renderInkSvg
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

  it('gera citekey no padrao Better BibTeX se nao houver Citation Key nem extra', () => {
    const data = {
      key: '4H65RQTM',
      title:
        'A relação da educação profissional e tecnológica com a universalização da educação básica',
      date: '2007-09-01',
      creators: [{ firstName: 'Gaudêncio', lastName: 'Frigotto' }]
    };
    const citekey = extractCitekey(data);
    assert.equal(citekey, 'frigottoRelacaoEducacaoProfissional2007');
    assert.notEqual(citekey, '4H65RQTM');
  });

  it('gera citekey no padrao Better BibTeX para organizacao e sem data (nodate)', () => {
    const data = {
      key: 'ORG12345',
      title: 'Diretrizes Curriculares Nacionais',
      creators: [{ name: 'Ministério da Educação' }]
    };
    const citekey = extractCitekey(data);
    assert.equal(citekey, 'ministerioDaEducacaoDiretrizesCurricularesNacionaisnodate');
  });

  it('elimina acentos no autor e extrai ano de string complexa', () => {
    const data = {
      key: 'DURK1',
      title: 'Da divisão do trabalho social',
      date: 'c. 1893 (reimpressão)',
      creators: [{ firstName: 'Émile', lastName: 'Durkheim' }]
    };
    assert.equal(extractCitekey(data), 'durkheimDivisaoTrabalhoSocial1893');
  });

  it('lida com titulo composto apenas por stopwords e sem autor', () => {
    const data = {
      key: 'ANON1',
      title: 'O e A',
      date: '2024'
    };
    assert.equal(extractCitekey(data), 'OEA2024');
  });

  it('retorna fallback seguro se item estiver vazio', () => {
    assert.equal(extractCitekey({}), 'semChave');
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

  it('formata tags do Zotero com prefixo zot_ e sanitizacao', () => {
    const rawTags = [
      { tag: 'Educação Popular' },
      { tag: 'Marxismo-Leninismo' },
      { tag: 'crítica & prática' },
      { tag: 'zot_ja_prefixada' }
    ];
    const formatted = formatTags(rawTags);
    assert.deepEqual(formatted, [
      'referencia_zotero',
      'zot_educacao_popular',
      'zot_marxismo_leninismo',
      'zot_critica_pratica',
      'zot_ja_prefixada'
    ]);
  });

  it('lida com tags nulas, vazias ou strings simples', () => {
    assert.deepEqual(formatTags(null), ['referencia_zotero']);
    assert.deepEqual(formatTags([]), ['referencia_zotero']);
    assert.deepEqual(formatTags(['simples', '  ']), ['referencia_zotero', 'zot_simples']);
  });

  it('formata colecoes hierarquicas para o frontmatter YAML', () => {
    const collectionsMap = {
      COL1: 'Educação',
      COL2: 'Educação/Ensino Médio'
    };
    const yaml = formatCollections(['COL1', 'COL2'], collectionsMap);
    assert.ok(yaml.includes('\ncollections:\n'));
    assert.ok(yaml.includes('  - "Educação"\n'));
    assert.ok(yaml.includes('  - "Educação/Ensino Médio"\n'));
  });

  it('injeta colecoes e tags zot_ na nota de literatura completa', () => {
    const ref = {
      key: 'ITEM1',
      title: 'Ciência em Ação',
      date: '2000-01-01',
      abstractNote: 'Um clássico dos estudos de ciência e tecnologia.',
      extra: 'Citation Key: latour2000',
      creators: [{ lastName: 'Latour', firstName: 'Bruno' }],
      tags: [{ tag: 'Sociologia da Ciência' }],
      collections: ['COL1']
    };
    const collectionsMap = { COL1: 'Estudos CTS' };

    const note = generateLiteratureNote(ref, [], {}, collectionsMap);
    assert.ok(note.includes('  - zot_sociologia_da_ciencia'));
    assert.ok(note.includes('collections:\n  - "Estudos CTS"'));
  });

  it('formata metadados bibliograficos completos no YAML', () => {
    const ref = {
      itemType: 'journalArticle',
      publicationTitle: 'Revista Educação em Questão',
      volume: '52',
      issue: '38',
      pages: '61-80',
      doi: '10.21680/1981-1802',
      issn: '1981-1802',
      url: 'https://periodicos.ufrn.br/educacaoemquestao/article/view/7956'
    };
    const yaml = formatBibliographicMeta(ref);
    assert.ok(yaml.includes('item_type: journalArticle\n'));
    assert.ok(yaml.includes('publication: "Revista Educação em Questão"\n'));
    assert.ok(yaml.includes('volume: "52"\n'));
    assert.ok(yaml.includes('issue: "38"\n'));
    assert.ok(yaml.includes('pages: "61-80"\n'));
    assert.ok(yaml.includes('doi: "10.21680/1981-1802"\n'));
    assert.ok(yaml.includes('issn: "1981-1802"\n'));
    assert.ok(
      yaml.includes('url: "https://periodicos.ufrn.br/educacaoemquestao/article/view/7956"\n')
    );
  });

  it('renderiza tracos ink como elemento SVG vetorial', () => {
    const ann = {
      annotationType: 'ink',
      annotationColor: '#ff2200',
      annotationPosition: {
        paths: [
          [
            [10, 20],
            [30, 40],
            [50, 60]
          ],
          [
            [100, 100],
            [120, 130]
          ]
        ]
      }
    };
    const svg = renderInkSvg(ann);
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('stroke="#ff2200"'));
    assert.ok(svg.includes('d="M 10 20 L 30 40 L 50 60"'));
    assert.ok(svg.includes('d="M 100 100 L 120 130"'));
  });

  it('renderiza tracos ink com array linear de coordenadas (padrao real Zotero)', () => {
    const ann = {
      annotationType: 'ink',
      annotationColor: '#ff6666',
      annotationPosition: {
        paths: [[192.364, 208.835, 193.606, 208.695, 194.816, 208.6]]
      }
    };
    const svg = renderInkSvg(ann);
    assert.ok(svg.includes('<svg'));
    assert.ok(svg.includes('stroke="#ff6666"'));
    assert.ok(svg.includes('d="M 192.364 208.835 L 193.606 208.695 L 194.816 208.6"'));
  });

  it('retorna string vazia para ink com json corrompido ou sem caminhos', () => {
    assert.equal(renderInkSvg({ annotationPosition: '{invalido' }), '');
    assert.equal(renderInkSvg({ annotationPosition: { paths: [] } }), '');
    assert.equal(renderInkSvg({ annotationPosition: null }), '');
  });

  it('inclui desenho livre no formatAnnotations com callout e link do PDF', () => {
    const pdfs = [{ key: 'PDFKEY1' }];
    const annotationsByPdf = {
      PDFKEY1: [
        {
          annotationType: 'ink',
          annotationPageLabel: '15',
          annotationColor: '#0055ff',
          annotationPosition: {
            paths: [
              [
                [5, 5],
                [25, 25]
              ]
            ]
          }
        }
      ]
    };
    const formatted = formatAnnotations(pdfs, annotationsByPdf);
    assert.ok(formatted.includes('> [!quote] ✍️ Desenho Livre (p. 15)'));
    assert.ok(formatted.includes('<svg'));
    assert.ok(formatted.includes('stroke="#0055ff"'));
    assert.ok(formatted.includes('zotero://open-pdf/library/items/PDFKEY1?page=15'));
  });

  it('formata imagem como callout padronizado com link do PDF e transclusao', () => {
    const pdfs = [{ key: 'PDFKEY1' }];
    const annotationsByPdf = {
      PDFKEY1: [
        {
          annotationType: 'image',
          annotationPageLabel: '8',
          imageRelativePath: '01_zotero/attachments/VCUI8KDL.png'
        }
      ]
    };
    const formatted = formatAnnotations(pdfs, annotationsByPdf);
    assert.ok(
      formatted.includes(
        '> [!quote] 📷 Imagem (p. 8) - [Ver no PDF](zotero://open-pdf/library/items/PDFKEY1?page=8)'
      )
    );
    assert.ok(formatted.includes('> ![[01_zotero/attachments/VCUI8KDL.png]]'));
    assert.ok(!formatted.includes('*Legenda: Imagem'));
  });

  it('formata desenho livre via transclusao quando houver imageRelativePath', () => {
    const pdfs = [{ key: 'PDFKEY1' }];
    const annotationsByPdf = {
      PDFKEY1: [
        {
          key: 'RS2MP6LJ',
          annotationType: 'ink',
          annotationPageLabel: '138',
          imageRelativePath: '01_zotero/attachments/RS2MP6LJ.svg'
        }
      ]
    };
    const formatted = formatAnnotations(pdfs, annotationsByPdf);
    assert.ok(
      formatted.includes(
        '> [!quote] ✍️ Desenho Livre (p. 138) - [Ver no PDF](zotero://open-pdf/library/items/PDFKEY1?page=138)'
      )
    );
    assert.ok(formatted.includes('> ![[01_zotero/attachments/RS2MP6LJ.svg]]'));
    assert.ok(!formatted.includes('<svg'));
  });

  it('inverte verticalmente coordenadas Y do ink para renderizar SVG desinvertido', () => {
    const ann = {
      annotationType: 'ink',
      annotationColor: '#2ea8e5',
      annotationPosition: {
        // y varia de 100 (base no PDF) a 300 (topo no PDF)
        paths: [[50, 100, 50, 300]]
      }
    };
    const svg = renderInkSvg(ann);
    // No SVG desinvertido:
    // O ponto original y=100 (base no PDF) deve se tornar y=300 (base no SVG)
    // O ponto original y=300 (topo no PDF) deve se tornar y=100 (topo no SVG)
    assert.ok(svg.includes('d="M 50 300 L 50 100"'));
  });

  it('ordena anotacoes por pageIndex crescente e topY decrescente no formatAnnotations', () => {
    const pdfs = [{ key: 'PDFKEY1' }];
    const annotationsByPdf = {
      PDFKEY1: [
        {
          key: 'ANN_P138_BOTTOM',
          annotationType: 'highlight',
          annotationText: 'Texto p138 baixo',
          annotationPageLabel: '138',
          annotationPosition: { pageIndex: 3, rects: [[10, 100, 50, 150]] } // topY = 150
        },
        {
          key: 'ANN_P139',
          annotationType: 'highlight',
          annotationText: 'Texto p139',
          annotationPageLabel: '139',
          annotationPosition: { pageIndex: 4, rects: [[10, 200, 50, 250]] }
        },
        {
          key: 'ANN_P138_TOP',
          annotationType: 'highlight',
          annotationText: 'Texto p138 topo',
          annotationPageLabel: '138',
          annotationPosition: { pageIndex: 3, rects: [[10, 400, 50, 450]] } // topY = 450
        },
        {
          key: 'ANN_P137',
          annotationType: 'highlight',
          annotationText: 'Texto p137',
          annotationPageLabel: '137',
          annotationPosition: { pageIndex: 2, rects: [[10, 100, 50, 150]] }
        }
      ]
    };

    const formatted = formatAnnotations(pdfs, annotationsByPdf);

    const idx137 = formatted.indexOf('Texto p137');
    const idx138Top = formatted.indexOf('Texto p138 topo');
    const idx138Bottom = formatted.indexOf('Texto p138 baixo');
    const idx139 = formatted.indexOf('Texto p139');

    // Ordem esperada: p.137 -> p.138 topo -> p.138 baixo -> p.139
    assert.ok(idx137 < idx138Top, 'p.137 deve vir antes de p.138 topo');
    assert.ok(idx138Top < idx138Bottom, 'p.138 topo deve vir antes de p.138 baixo');
    assert.ok(idx138Bottom < idx139, 'p.138 baixo deve vir antes de p.139');
  });
});
