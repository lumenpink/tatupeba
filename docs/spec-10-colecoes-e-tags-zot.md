# Especificação - Ticket #10: Coleções e Tags Zotero com Prefixo zot_

## 1. Contexto e Motivação
Hoje o Tatupeba gera todas as notas com apenas uma tag estática (`tags: [referencia_zotero]`), ignorando todas as tags temáticas catalogadas pelo usuário no Zotero. Além disso, a informação das coleções às quais o documento pertence no Zotero é descartada.

## 2. Contrato de Tags (`formatTags`)
- A tag base `referencia_zotero` é sempre mantida.
- Para cada objeto `{ tag: "Nome da Tag" }` em `data.tags`:
  - Normaliza para minúsculas e remove acentos/diacríticos.
  - Substitui espaços por underscores (`_`) e remove caracteres não alfanuméricos.
  - Adiciona o prefixo `zot_` (ex.: `"Educação Popular"` -> `"zot_educacao_popular"`).
  - Deduplica tags preservando a ordem.

## 3. Contrato de Coleções (`formatCollections` e `fetchAllCollections`)
- `fetchAllCollections(config)`:
  - Consulta `https://api.zotero.org/users/${userId}/collections`.
  - Constrói um mapa `key -> hierarchicalPath` (resolvendo recursivamente o caminho `parentCollection`, ex.: `"Educação/Ensino Médio"`).
- Injeção no Frontmatter:
  - Se `data.collections` contiver chaves associadas, injetar no YAML:
    ```yaml
    collections:
      - "Educação"
      - "Educação/Ensino Médio"
    ```
  - Se não houver coleções, não renderizar a chave `collections` no YAML.

## 4. Critérios de Aceitação
- Todas as tags do Zotero aparecem no frontmatter prefixadas com `zot_`.
- As coleções aparecem estruturadas em lista no frontmatter.
- Testes unitários para hierarquia de coleções e sanitização de tags com acentos e símbolos.
