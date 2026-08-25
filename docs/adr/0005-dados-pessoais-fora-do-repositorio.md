# ADR 0005 — Dado pessoal de saúde nunca entra no repositório

**Status:** aceito · **Data:** 2026-08-25

## Contexto

O modelo de dados foi derivado de uma planilha real de atendimento, que contém nome, idade, medidas corporais completas e medicamentos prescritos (entre eles estatina e moduladores hormonais). Isso é dado pessoal sensível de saúde sob a LGPD.

O repositório e o site publicado pelo GitHub Pages são públicos. Um commit com esse conteúdo permanece no histórico do git mesmo após remoção do arquivo, e pode ter sido clonado e indexado antes disso.

## Decisão

Nenhum dado pessoal real entra no repositório, em nenhuma forma — nem como fixture, nem como exemplo em documentação, nem como captura de tela.

Implementação:

- `.gitignore` bloqueia `dados-reais/`, `*.xlsx`, `*.pdf` e `*.fitvault.json`, com exceção explícita para `src/test/fixtures/**` e `e2e/fixtures/**`.
- `.claude/settings.json` nega leitura de `./dados-reais/**`.
- Fixtures de teste são **sintéticos**: nomes inventados, medidas plausíveis mas fictícias, suplementos genéricos sem prescrição controlada.
- A documentação cita a _estrutura_ da planilha (colunas, formatos, regras), nunca os _valores_ de uma pessoa.

## Consequências

- Os testes não exercitam o arquivo real. Aceito: o que precisa ser fiel é a **forma** do dado, e a forma está documentada em `modelo-dados.md`.
- Se algum dado real vazar para um commit, a correção não é apagar o arquivo: é reescrever o histórico e considerar o dado comprometido.
- Quando o produto tiver usuários reais, esta decisão vira requisito de arquitetura, não só de repositório — nenhum dado do aluno sai do aparelho sem ação explícita dele.
