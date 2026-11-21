# Especificação do Ticket #20: Delegar Entregas e Reset de Container do Tatupeba ao Kombinat

## 1. Contexto e Motivação
O workflow `.forgejo/workflows/ci.yml` enviava artefatos para o Cloudflare R2, clonava a Banca e executava SSH direto no nó `obitwo`. Com o Kombinat, a CI publica artefatos nos Generic Packages via `cccp package upload` e mantém apenas o build/push da imagem Docker.
