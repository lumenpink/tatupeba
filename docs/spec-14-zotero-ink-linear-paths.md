# Especificação - Ticket #14: Suporte a Paths Lineares da Zotero API no Ink SVG

## 1. Diagnóstico do Problema
A Zotero Web API serializa as anotações do tipo `ink` com um array linear alternado de coordenadas em `annotationPosition.paths`:
```json
"paths": [
  [192.364, 208.835, 193.606, 208.695, 194.816, 208.6, ...]
]
```
A implementação anterior esperava arrays aninhados `[[x, y], [x, y]]`, descartando os pontos reais como inválidos e resultando em SVGs vazios.

## 2. Contrato de Correção (`renderInkSvg`)
A rotina de extração de pontos deve suportar ambos os formatos:
1. **Formato linear (Zotero Nativo):** Se o primeiro elemento do array for numérico, agrupar de 2 em 2 (`[path[i], path[i+1]]`).
2. **Formato aninhado:** Se os elementos forem arrays `[x, y]`.
3. Para cada traço resultante, calcular bounding box, viewBox e renderizar elementos `<path d="M x y L x y ..." />`.

## 3. Critérios de Aceitação
- Anotações com `paths: [[x0, y0, x1, y1, ...]]` devem gerar `<svg>` válido com `<path d="M x0 y0 L x1 y1..." />`.
- Anotações com o formato legado aninhado continuam funcionando.
- Teste unitário reproduzindo o payload real do Zotero (ex.: chave `YKYMR2NY`).
