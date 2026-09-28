# Tatupeba (🐾)

> *"Assim se constrói."*

Extrator e sincronizador contínuo do acervo Zotero para o cofre Obsidian e para o compilador acadêmico Joaju.

O **Tatupeba** escava o acervo do Zotero (via API v3), extrai referências bibliográficas com chaves Better BibTeX, puxa anotações e grifos de leitura em PDFs, gera notas de literatura Markdown com metadados relacionais e mantém o arquivo `referencias.bib` do Joaju sincronizado para compilação acadêmica direta.

---

## 📋 Conformidade GOST

Este projeto adota a norma **[GOST](https://codeberg.org/lumenpink/gost)** (Gosplan Standard for Technical Software).
- **Versão GOST:** `1.1.0`
- **Linguagens declaradas:** `javascript`
- **Licença:** `Apache-2.0`
- **Zero dependências de runtime:** construído sobre as APIs nativas do Node.js 24 (`fetch`, `node:http`, `node:test`).

---

## 🚀 Como Usar

### 1. Linha de Comando (CLI)

```bash
# Sincronização completa (notas no Obsidian + BibTeX no Joaju)
tatupeba sync

# Sincronização rápida apenas do arquivo BibTeX
tatupeba bib

# Sincronização apenas das notas Markdown
tatupeba notes

# Iniciar servidor HTTP para gatilhos remotos (Obsidian / Mobile)
tatupeba serve --port 3001

# Diagnóstico de caminhos e credenciais
tatupeba status
```

### 2. Automação no Baquara (Systemd)

O Tatupeba opera no `baquara` através de duas unidades `systemd --user`:
- `tatupeba-sync.timer`: executa a sincronização em segundo plano a cada 2 horas de forma silenciosa.
- `tatupeba-web.service`: expõe a API HTTP local na porta `3001` (`http://baquara:3001/sync`) para acionamento a 1 clique.

### 3. Disparo pelo Obsidian (Desktop & Mobile)

Através do template Templater `98_modelo/Sincronizar Zotero.md`:
1. Abra o Obsidian no Desktop, celular (`mclovin`) ou tablet (`trinity`).
2. Dispare o Templater (`Alt+E`) e selecione `Sincronizar Zotero`.
3. Uma notificação visual exibe o total de notas e referências atualizadas.

---

## 🧪 Testes e Qualidade

```bash
# Executar suíte de testes unitários
npm test

# Verificação estrita de estilo e linter (Biome)
npm run lint

# Auditoria de conformidade GOST
cccp check
```

---

## 📄 Licença

Distribuído sob a licença [Apache-2.0](./LICENSE).
