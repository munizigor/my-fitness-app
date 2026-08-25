# ADR 0003 — Formato do vault: JSON estruturado, versionado, legível

**Status:** aceito · **Data:** 2026-08-25

## Contexto

O posicionamento do produto é _data ownership_ no espírito do Obsidian: "você é o dono dos seus dados, se quiser importá-los, exportá-los, passar para outro local, fica do seu acordo". As anotações de concepção definem o formato como "proprietário, mas nada além de um json estruturado".

O Obsidian venceu com Markdown em disco. Markdown foi considerado aqui e recusado: o conteúdo deste app é estruturado (séries, cargas, macros, datas), não prosa. Markdown com frontmatter YAML para representar 4 séries de um exercício seria menos legível que JSON, não mais.

## Decisão

Um arquivo JSON por documento, e um envelope `.fitvault.json` para intercâmbio.

```
vault/manifest.json                      { schemaVersion, appVersion, criadoEm, atualizadoEm }
vault/aluno/perfil.json
vault/aluno/medidas/<AAAA-MM-DD>.json
vault/planos/<id>.json
vault/registros/<AAAA-MM-DD>.json
```

Regras:

- JSON indentado, sempre. O arquivo é feito para ser lido por gente, não só por máquina.
- Nomes de campo em pt-BR no domínio, coerentes com o resto do código.
- Um documento por dia nos registros — o caminho do arquivo já é um índice legível.
- `schemaVersion` no manifest. Migrações são funções puras testadas; versão desconhecida falha explicitamente.
- Zod é a fonte única da verdade sobre o formato: o mesmo schema valida import e descreve o tipo.

## Consequências

- Export escreve numa pasta real via File System Access API quando o navegador oferece (Chrome/Edge); caso contrário, baixa o `.fitvault.json`.
- Nenhum campo derivado é gravado (ADR 0006): o arquivo contém o que foi prescrito e o que foi feito, nunca o que foi calculado.
- **Critério de aceitação do posicionamento:** abrir o arquivo exportado num editor de texto qualquer e entender o que está lá. Se não for legível, a decisão falhou.
