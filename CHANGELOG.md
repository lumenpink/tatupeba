# Changelog

## [Unreleased]

### Changed
  - (ci) remover campo permissions incompativel com forgejo actions (closes #7)

### Fixes
  - (render) desinverter ink svg e ordenar anotacoes por leitura (closes #17)
  - (render) salvar svg standalone, preservar transparencia e padronizar callouts (closes #16)
  - (ci) tornar caminhos de auditoria de CI relativos (closes #6)

### Features
  - (annotations) suporte a paths lineares do Zotero Web API no ink svg (closes #14)
  - (annotations) baixar e transcluir recortes de area do tipo image (closes #13)
  - (annotations) extrair e renderizar anotacoes ink como svg nativo (closes #12)
  - (markdown) enriquecer frontmatter com metadados bibliograficos completos (closes #11)
  - (markdown) mapear arvore de colecoes e tags zotero prefixadas com zot_ (closes #10)
  - (citekey) gerar citekey no formato Better BibTeX autorTituloAno e eliminar fallback para hashes zotero (closes #9)
  - (ci) padronizar ci.yml unico e safe mount de chave ssh (closes #5)
  - (ci) fallback de chave ssh e connect timeout na esteira de cd (closes #4)
  - (ci) continuous deployment no obitwo via Tailscale/SSH, healthcheck ativo de 15s, rollback e descomissionamento do Watchtower (closes #3)
  - (auth) adicionar autenticacao por chave Bearer e X-Api-Key no servidor HTTP
  - (core) initial scaffolding and implementation of zotero sync daemon

## Previous Releases

