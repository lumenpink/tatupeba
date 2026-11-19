# Especificação Técnica #16: Salvar SVG Standalone, Preservar Transparência e Padronizar Callouts

- **Ticket:** [#16](https://gambi.2lp.in/lumen/tatupeba/issues/16)
- **Branch:** `fix/16-salvar-svg-standalone-e-preservar-transparencia-em-imagem`
- **Norma:** GOST 1.5.0 (DD-TDD)
- **Status:** Fase 3 (Spec)
- **Responsável:** Lumen Pink & Antigravity

---

## 1. Contexto e Motivação
Na integração do Zotero com o Obsidian através do `tatupeba`, foram identificados dois problemas visuais e uma inconsistência de formatação:
1. Os desenhos vetoriais (*ink*) eram injetados como tags HTML brutas `<svg>...</svg>` no corpo Markdown, as quais o parser do Obsidian não renderiza visualmente (permanecendo código puro).
2. O corte de anotações de imagem contendo desenhos sobrepostos (como na p. 138 de Caliman 2009) perdia todo o texto subjacente do PDF, exibindo apenas o traço colorido sobre uma folha branca lisa.
3. As imagens tinham formato despadronizado em relação aos demais itens (grifo e reflexão), exibindo a referência embaixo em vez de manter o cabeçalho padrão com link do PDF no topo.

---

## 2. Árvore de Decisões (Contexto para Natasha)
- **Por que salvar arquivos `.svg` separados em vez de renderizar via HTML sanitizado?**
  A Natasha ao inspecionar o cofre Obsidian notará que o parser CommonMark do Obsidian não avalia nós HTML `<svg>` inseridos em citações/callouts por isolamento de estilo e segurança. Por outro lado, o Obsidian possui suporte nativo integral a transclusão de imagens vetoriais via `![[arquivo.svg]]`. Ao salvar cada anotação `ink` em `01_zotero/attachments/${ann.key}.svg`, o vetor é renderizado perfeitamente em modo Leitura e Live Preview, sem perda de resolução ao aplicar zoom.
- **Por que o texto do PDF desaparecia sob o desenho sobreposto?**
  O comando `magick composite` no Alpine Linux utiliza o delegate `librsvg` para converter o SVG de sobreposição em bitmap antes de mesclá-lo à página renderizada pelo `pdftoppm`. Sem o parâmetro `-background none`, o delegate assume fundo branco sólido `#ffffff`, cobrindo toda a folha original e destruindo os caracteres de texto do PDF. A injeção compulsória de `-background none` instrui o rasterizador a manter o canal alfa 100% transparente fora dos traços da caneta.
- **Por que unificar o formato em callouts `[!quote]` no topo?**
  Manter o padrão de `[!quote]` para grifos, imagens e desenhos livres traz coerência ergonômica à leitura no Obsidian. O cabeçalho no topo com o número da página e o link direto `zotero://open-pdf/library/items/${pdfKey}?page=${pageLabel}` permite navegar com um clique para a passagem original antes de analisar a imagem ou o trecho destacado.

---

## 3. Critérios de Aceite
1. Em `src/extractor.js`:
   - A invocação do `magick composite` para sobrepor `overlay.svg` na folha do PDF deve incluir obrigatoriamente a opção `-background none`.
   - Adicionar função `saveInkAsSvg(ann, outputDir)` que persiste o SVG gerado em `${ann.key}.svg` no diretório de anexos.
2. Em `src/zotero.js`:
   - A sincronização de anexos visuais (`syncAnnotationImages`) deve processar anotações do tipo `image` e também anotações do tipo `ink`, gerando os respectivos arquivos em `01_zotero/attachments/` e preenchendo `ann.imageRelativePath`.
3. Em `src/markdown.js`:
   - Para anotações `image`: formatar como:
     ```markdown
     > [!quote] 📷 Imagem (p. ${pageLabel}) - ${pdfLink}
     > ![[${ann.imageRelativePath}]]
     ```
   - Para anotações `ink`: formatar como:
     ```markdown
     > [!quote] ✍️ Desenho Livre (p. ${pageLabel}) - ${pdfLink}
     > ![[${ann.imageRelativePath}]]
     ```
   - Se `ann.imageRelativePath` não estiver disponível para `ink`, manter fallback gracioso.
4. Testes unitários cobrindo a presença de `-background none`, a geração de SVG standalone e o formato dos callouts.
