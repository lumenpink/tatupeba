# Especificação - Ticket #13: Download e Transclusão de Recortes de Área (Image)

## 1. Contexto e Motivação
Quando o usuário seleciona uma área retangular no leitor do Zotero (ferramenta de recorte de imagem), o Zotero gera uma anotação com `annotationType === 'image'`. Para que essa imagem seja visualizada no Obsidian em qualquer dispositivo (desktop ou mobile offline), o Tatupeba deve baixar o PNG gerado da Zotero API e salvá-lo no cofre, injetando a transclusão `![[caminho]]`.

## 2. Contrato de Sincronização (`syncAnnotationImages`)
- Para cada anotação com `annotationType === 'image'`:
  - Caminho de destino: `path.join(obsidianRefsDir, '01_zotero', 'attachments', `${ann.key}.png`)`.
  - Caminho relativo para o Obsidian: `01_zotero/attachments/${ann.key}.png`.
  - Se o arquivo já existir no disco, pula o download para economia de banda e tempo.
  - Se não existir, faz requisição autenticada para `https://api.zotero.org/users/${userId}/items/${ann.key}/file`.
  - Se o download for bem-sucedido (status 200), grava o buffer no arquivo e define `ann.imageRelativePath`.
  - Se a API retornar 404 ou erro, loga discreto sem quebrar a execução global.

## 3. Renderização no Markdown
```markdown
> [!quote] 🖼️ Imagem (p. ${pageLabel}) - ${pdfLink}
> ![[${ann.imageRelativePath}]]
```

## 4. Critérios de Aceitação
- Anotações `image` baixam o arquivo PNG para a pasta de anexos do cofre.
- Notas Markdown recebem a sintaxe de transclusão do Obsidian.
- Pulos automáticos para imagens já cacheadas no disco.
- Falhas de download tratadas de forma resiliente.
