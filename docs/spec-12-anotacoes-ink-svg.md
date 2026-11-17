# Especificação - Ticket #12: Renderização de Anotações Ink como SVG Nativo

## 1. Contexto e Motivação
Anotações à mão livre feitas com caneta/stylus no leitor do Zotero possuem o tipo `annotationType === 'ink'`. Atualmente são ignoradas pelo Tatupeba porque não possuem texto (`annotationText`). O objetivo é transformar os traços vetoriais em elementos SVG puros renderizados diretamente na nota Markdown no Obsidian, com deep link para a página exata do PDF.

## 2. Contrato de Conversão (`renderInkSvg`)
- Entrada:
  - `ann`: objeto de anotação contendo `annotationType: 'ink'`, `annotationPosition` (com `paths` ou array de traços), `annotationColor`.
- Processamento:
  - Extrai os pontos `[x, y]` de cada traço.
  - Se `annotationPosition` for string JSON, faz parse seguro.
  - Determina o bounding box mínimo e máximo `[minX, minY, maxX, maxY]` com margem de folga (padding de 10 unidades).
  - Constrói o comando de caminho `d="M x y L x y ..."` para cada traço.
  - Gera um `<svg viewBox="..." fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">`.
- Saída no Markdown:
  ```markdown
  > [!quote] ✍️ Desenho Livre (p. ${pageLabel}) - ${pdfLink}
  > <svg ...>...</svg>
  ```
  Se houver `annotationComment`, embutir também o comentário.

## 3. Critérios de Aceitação
- Anotações `ink` válidas geram SVG vetorial válido.
- O link direto `zotero://open-pdf/...` para a página do PDF é preservado.
- Caso os pontos de `ink` estejam malformados ou vazios, fazer fallback seguro para o callout com link sem quebrar o processo.
- Testes unitários cobrindo traço único, múltiplos traços, cálculo de viewBox e parsing de JSON.
