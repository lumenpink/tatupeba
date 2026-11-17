# Especificação - Ticket #9: Geração e Unificação de Citekey no Padrão Better BibTeX

## 1. Contexto e Problema
Itens na biblioteca Zotero que não foram sincronizados pelo plugin Better BibTeX (BBT) no cliente desktop não possuem a linha `Citation Key: ...` no campo `extra`. Quando o Tatupeba gerava a nota Markdown, recorria ao fallback `data.key` (hash interno do Zotero de 8 caracteres, como `4H65RQTM`), resultando em notas com nomes ilegíveis e quebra de referências no cofre Obsidian e Joaju.

## 2. Contrato de Extração e Geração (`extractCitekey`)
A função `extractCitekey(data)` deve obedecer à seguinte precedência estrita:
1. **Chave explícita direta:** Se `data.citationKey` existir e for não-vazia, retornar o valor sanitizado.
2. **Chave do Better BibTeX no `extra`:** Se `data.extra` contiver `Citation Key:\s*([^\r\n]+)`, retornar essa chave.
3. **Gerador determinístico alinhado ao Better BibTeX:**
   Caso nenhuma chave esteja presente, derivar a chave no padrão BBT (`autorTituloAno`):
   - **Autor:** Sobrenome do primeiro autor (`lastName` ou `name`), sanitizado para ASCII (sem diacríticos/acentos), primeira letra minúscula ou normalizada (ex.: `frigotto`).
   - **Título:** Palavras significativas do título em CamelCase/TitleCase (ignorando stopwords comuns como *a, o, de, da, do, em, para, com, the, of, in, on, and*), até 3 palavras significativas.
   - **Ano:** 4 dígitos extraídos do campo `date` (ex.: `2007`). Se ausente, usar `nodate`.
   - Se nem autor nem título existirem, usar fallback seguro `semChave`.
4. **Garantia:** O hash interno de 8 caracteres do Zotero (`data.key`) **nunca** deve ser usado como nome de citekey.

## 3. Critérios de Aceitação
- Itens sem `Citation Key` no `extra` devem gerar chaves legíveis no formato BBT (ex.: `frigottoRelacaoEducacao2007`).
- Remoção total de hashes tipo `4H65RQTM` como identificador de arquivo e citekey.
- Preservação total de chaves existentes no campo `extra`.
- Testes cobrindo autores simples, múltiplos autores, organizações (`creator.name`), stopwords e ausência de data.
