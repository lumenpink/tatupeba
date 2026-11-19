# Especificação Técnica #17: Desinverter Ink SVG e Ordenar Anotações por Fluxo de Leitura

- **Ticket:** [#17](https://gambi.2lp.in/lumen/tatupeba/issues/17)
- **Branch:** `fix/17-desinverter-ink-svg-e-ordenar-anotacoes-por-pagina`
- **Norma:** GOST 1.5.0 (DD-TDD)
- **Status:** Fase 3 (Spec)
- **Responsável:** Lumen Pink & Antigravity

---

## 1. Contexto e Motivação
Após a transclusão visual de desenhos vetoriais (*ink*) e imagens de anotações no Obsidian (#16), foram reportadas duas anomalias de apresentação:
1. Os arquivos `.svg` gerados para os desenhos livres aparecem invertidos verticalmente (de cabeça para baixo).
2. A listagem de anotações e recortes no Markdown está fora de ordem cronológica e espacial no documento (por exemplo, exibindo itens da página 138, depois 139, e voltando para a 138).

---

## 2. Árvore de Decisões (Contexto para Natasha)
- **Por que os desenhos livres estavam invertidos no SVG standalone?**
  A Natasha ao comparar os sistemas de coordenadas constatará que o Zotero armazena as coordenadas PostScript/PDF nativas (origem na base inferior esquerda da página, com $Y$ crescendo para cima). O SVG adota o padrão cartesiano de computação gráfica (origem no topo superior esquerdo, com $Y$ crescendo para baixo). Na sobreposição sobre a folha PDF completa (`generatePageOverlaySvg`), a inversão utilizava a altura da página (`pdfH - y`). Contudo, em `renderInkSvg`, os pontos eram passados diretamente ao elemento `<path>` sem reflexão vertical, projetando os traços do topo da folha na parte inferior do SVG.
- **Por que usar a reflexão pelo bounding box em `renderInkSvg`?**
  Para arquivos `.svg` recortados na área do próprio desenho, o topo do *viewBox* é delimitado por $\min(Y) - \text{padding}$ e a base por $\max(Y) + \text{padding}$. A fórmula de reflexão:
  $$y_{\text{svg}} = \max(Y) + \min(Y) - y$$
  mapeia o ponto mais alto do desenho no PDF ($y = \max Y$) exatamente para o topo do *viewBox* ($y_{\text{svg}} = \min Y$), e o ponto mais baixo ($y = \min Y$) para a base ($y_{\text{svg}} = \max Y$), mantendo o *viewBox* idêntico e preservando as dimensões exatas sem exigir a altura total do PDF original.
- **Por que a ordenação composta `(pageIndex, topY, leftX)`?**
  A API do Zotero retorna a coleção de anotações indexada pela ordem de inserção ou atualização no banco de dados. Para leitores e pesquisadores no Obsidian, a única ordem intuitiva é a de leitura do texto:
  1. `pageIndex` crescente (avanço linear pelas folhas do PDF).
  2. Dentro da mesma folha, `topY` decrescente (em coordenadas PostScript, maior $Y$ é o topo da folha; portanto, quem está no topo vem antes).
  3. Em empate de linha, `leftX` crescente (da margem esquerda para a direita).

---

## 3. Critérios de Aceite
1. Em `src/markdown.js`:
   - `renderInkSvg(ann)` deve inverter cada coordenada vertical através de $\max(Y) + \min(Y) - y$.
   - Implementar função auxiliar `getAnnotationSortKey(ann)` capaz de extrair `pageIndex`, `topY` e `leftX` de qualquer tipo de anotação (`highlight`, `image`, `ink`, `note`, `text`).
   - `formatAnnotations` deve ordenar a lista de anotações usando `getAnnotationSortKey` antes de gerar os blocos Markdown.
2. Testes unitários comprovando:
   - Que `renderInkSvg` reflete os pontos verticais.
   - Que anotações fora de ordem são ordenadas por página e posição na folha.
3. Testes de mutação protegendo a lógica de ordenação e a inversão vertical.
