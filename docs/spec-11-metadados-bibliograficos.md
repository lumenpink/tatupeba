# Especificação - Ticket #11: Enriquecimento de Metadados Bibliográficos no Frontmatter

## 1. Contexto e Motivação
Para que as notas de literatura Markdown no cofre e no Joaju contenham todas as informações necessárias para a montagem de referências bibliográficas formais (ABNT, APA, etc.) sem depender de fontes secundárias, o frontmatter YAML deve expressar os metadados bibliográficos estruturados da API do Zotero.

## 2. Contrato de Metadados (`formatBibliographicMeta`)
A função extrai e formata os seguintes campos no frontmatter quando presentes e não-vazios:
- `item_type`: `data.itemType`
- `publication`: `data.publicationTitle || data.bookTitle || data.proceedingsTitle`
- `publisher`: `data.publisher`
- `place`: `data.place`
- `volume`: `data.volume`
- `issue`: `data.issue || data.number`
- `pages`: `data.pages`
- `doi`: `data.doi`
- `isbn`: `data.isbn`
- `issn`: `data.issn`
- `url`: `data.url`
- `date`: `data.date`
- `edition`: `data.edition`

Valores de texto são sanitizados (aspas duplas escapadas adequadamente). Campos vazios ou nulos são omitidos para evitar poluição da nota.

## 3. Critérios de Aceitação
- Uma referência de artigo contendo volume, páginas, periódico e DOI deve ter todos esses campos expressos no frontmatter YAML.
- Valores contendo aspas são devidamente escapados.
- Testes unitários validando a geração dos campos bibliográficos e a omissão de campos nulos.
