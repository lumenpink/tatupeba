# Especificação do Ticket #19: Instalar Dependências com npm ci Antes do Biome Check

## 1. Contexto e Motivação
O repositório `tatupeba` utiliza `@biomejs/biome` v1.9.4 fixado em `package-lock.json` e configurado em `biome.json`.
Na esteira `.forgejo/workflows/ci.yml`, o step `Format Check` invocava `npx @biomejs/biome check . || npx prettier --check .` sem instalar previamente as dependências via `npm ci`.
Sem `node_modules/`, o `npx` baixava a versão `latest` do Biome (`2.6.8`), incompatível com o schema de `biome.json` (`files.include`), disparando erro de desserialização e caindo no fallback `prettier --check .`, que diverge do estilo configurado e falhava o build.

## 2. Requisitos da Correção
1. Em `.forgejo/workflows/ci.yml`:
   - Executar `npm ci` antes da checagem de formatação.
   - Executar `npm run lint` (`biome check .`) diretamente com a versão pinada do lockfile, removendo o fallback inconsistente para Prettier.
   - Invocar `cccp hook -i || true` antes do `cccp check --strict`.
2. Em `.gost/rules.toml`:
   - Incluir o bypass de ambiente hermético de CI na regra `KOLLONTAI-018`.
3. Validar `npm run lint`, `npm test`, `bash test/audit_cd_workflow.sh` e `cccp check --strict`.

## 3. Árvore de Decisões e Registro Arquitetural (para a Natasha)
1. **`npm ci` + `npm run lint` vs Atualizar `biome.json` para v2.6:**
   - *Decisão:* Instalar determinísticamente via `npm ci` respeita o `package-lock.json` (build reprodutível) e impede que releases futuros do Biome quebrem a CI silenciosamente ao usar `npx` sem pinagem.
