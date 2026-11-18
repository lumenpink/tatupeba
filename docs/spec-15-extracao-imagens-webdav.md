# Especificação Técnica #15: Extração de Recortes de Imagem com Sobreposição SVG a partir de PDFs WebDAV

## 1. Contexto e Motivação
No Zotero, as anotações de seleção de área (`annotationType === 'image'`) não possuem arquivos PNG independentes disponíveis para download na Zotero Web API (a requisição `GET /items/{key}/file` retorna `400: Item is not an attachment`). O Zotero armazena apenas as coordenadas da seleção na página do PDF pai (`parentItem`).

Com a stack WebDAV operacional no `obitwo` e montada como volume no container do `tatupeba` em `/zotero_storage`, os PDFs originais encontram-se disponíveis em arquivos compactados (`${parentItem}.zip`).

## 2. Árvore de Decisões (Contexto para Natasha)
- **Por que extrair do volume local em vez da API Web?**
  A Zotero Web API não armazena nem rasteriza os recortes de imagem nos seus servidores de metadados. Ela delega o arquivo ao armazenamento WebDAV sincronizado pelo cliente. Portanto, o `tatupeba` precisa ler o PDF localmente a partir de `/zotero_storage/**/${parentItem}.zip`.
- **Por que sobrepor o SVG na página inteira antes do corte?**
  Quando uma anotação de imagem possui desenhos livres (*ink*) sobrepostos ou interceptando a área, fazer o recorte primeiro e tentar alinhar o desenho vetorizado depois causa perda de pontos de ancoragem e erros de offset nas margens. Ao compor o SVG na página inteira com `pdftoppm` e `magick composite` e só então executar o `-crop`, o alinhamento cartesiano e a continuidade dos traços são 100% garantidos.
- **Por que a transformação de coordenadas `crop_y = (pdf_height - y2) * scale`?**
  A especificação PDF e o Zotero utilizam coordenadas em pontos (72 DPI) com origem no canto inferior esquerdo (*bottom-left*). As imagens rasterizadas geradas pelo `pdftoppm` e a renderização em tela utilizam origem no canto superior esquerdo (*top-left*). A escala padrão adotada é 150 DPI (`scale = 150 / 72 ≈ 2.0833`). A altura total da página `pdf_height` obtida via `pdfinfo` ou medição da folha converte com precisão cirúrgica a posição do retângulo e a orientação dos traços.

## 3. Arquitetura e Fluxo de Execução

1. **Localização do Anexo PDF**:
   - Para cada anotação `image` com `parentItem`:
   - Varrer recursivamente o diretório `${ZOTERO_STORAGE_DIR:-/zotero_storage}` procurando `${parentItem}.zip`.
   - Se não encontrado no volume WebDAV, emitir aviso de diagnóstico e manter o fallback gracioso (sem quebrar a geração da nota).
2. **Extração e Renderização**:
   - Descompactar o arquivo PDF para diretório temporário (`/tmp/tatupeba/...`).
   - Obter altura e largura da página via `pdfinfo` ou medição do PDF.
   - Renderizar a página indicada por `pageIndex + 1` em PNG (150 DPI) usando `pdftoppm -png -r 150 -f <pag> -l <pag>`.
3. **Composição dos Desenhos Livres (*Ink*)**:
   - Filtrar todas as anotações do tipo `ink` com o mesmo `parentItem` e mesmo `pageIndex`.
   - Se houver desenhos, gerar um arquivo SVG de página inteira (`viewBox="0 0 pdf_w pdf_h"` e dimensões em pixels na escala de 150 DPI), aplicando a inversão vertical nos pontos `(x, pdf_h - y)`.
   - Sobrepor o SVG na página inteira: `magick composite -compose over <svg> <page.png> <composed.png>`.
4. **Recorte Cartesiano**:
   - Extrair `rects: [[x1, y1, x2, y2]]` do JSON `annotationPosition`.
   - Calcular:
     - `crop_x = Math.round(x1 * scale)`
     - `crop_y = Math.round((pdf_h - y2) * scale)`
     - `crop_w = Math.round((x2 - x1) * scale)`
     - `crop_h = Math.round((y2 - y1) * scale)`
   - Executar: `magick <composed.png> -crop <w>x<h>+<x>+<y> +repage <target.png>`.
   - Gravar o arquivo final em `<obsidian_dir>/01_zotero/attachments/${ann.key}.png`.
   - Atribuir `ann.imageRelativePath = "01_zotero/attachments/${ann.key}.png"`.

## 4. Critérios de Aceitação
- Módulo `src/extractor.js` exporta `extractAnnotationImage(ann, parentInks, options)` e funções auxiliares de cálculo de coordenadas.
- Testes unitários em `test/extractor.test.js` cobrem:
  - Cálculo correto de dimensões de crop e escala (72 DPI -> 150 DPI).
  - Geração do SVG de sobreposição de página inteira com inversão de eixo vertical.
  - Composição e recorte chamando executáveis ou mocks de comando sem erro.
- Dockerfile inclui `poppler-utils` e `imagemagick`.
- Todas as suítes de teste de `npm test` passam 100% GREEN.
- Linter `npx biome check .` passa com zero violações.
