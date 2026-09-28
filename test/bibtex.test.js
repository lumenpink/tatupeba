import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cleanBibTeX, countBibEntries } from '../src/bibtex.js';

describe('BibTeX Module', () => {
  it('remove entradas vazias noauthor geradas por anexos soltos', () => {
    const dirty = `
@misc{noauthor_notitle_nodate,
}

@book{jaspers2006,
  title = {Psicopatologia geral}
}
`;
    const cleaned = cleanBibTeX(dirty);
    assert.ok(!cleaned.includes('noauthor_notitle_nodate'));
    assert.ok(cleaned.includes('@book{jaspers2006'));
  });

  it('conta corretamente as entradas em uma string BibTeX', () => {
    const sample = `
@book{jaspers2006,
  title = {Psicopatologia geral},
  author = {Jaspers, Karl}
}

@article{latour1996,
  title = {On actor-network theory},
  author = {Latour, Bruno}
}
`;
    assert.equal(countBibEntries(sample), 2);
  });

  it('retorna 0 para string vazia ou inválida', () => {
    assert.equal(countBibEntries(''), 0);
    assert.equal(countBibEntries(null), 0);
  });
});
