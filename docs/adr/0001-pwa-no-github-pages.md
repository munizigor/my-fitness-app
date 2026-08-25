# ADR 0001 — PWA no GitHub Pages, não app nativo

**Status:** aceito · **Data:** 2026-08-25

## Contexto

As anotações de concepção recomendam explicitamente o caminho oposto: para um time bootstrapped de 2–5 pessoas, app nativo (Electron/Capacitor) com vault de arquivos Markdown em disco, "exatamente pelo motivo pelo qual o Obsidian venceu". Menor custo de suporte, confiança máxima, monetização de sync clara.

Mesmo assim, o v0 será um PWA servido pelo GitHub Pages.

## Decisão

PWA estático no GitHub Pages para o Ciclo 1.

## Razões

- **Custo de infra zero** e distribuição instantânea, sem app store, sem revisão, sem certificado de assinatura.
- O objetivo do v0 é **validar a tese de produto** (o aluno continua quando sente evolução), não maximizar confiança de armazenamento.
- As próprias anotações prescrevem o caminho web quando ele é escolhido: OPFS + motor local para persistência, File System Access API para escrever numa pasta real do usuário, e **nunca localStorage**. Estamos seguindo essa prescrição, não contrariando-a.

## Consequências

**Aceitas:**

- **Não há backend.** "Acompanhamento e atualização em tempo real entre profissionais e alunos" — a funcionalidade prevista para o plano pago — é impossível neste ciclo. O intercâmbio é por arquivo, que é exatamente o fluxo descrito nas anotações: profissional manda o arquivo inicial, aluno carrega, executa, registra e devolve.
- **Risco de despejo de armazenamento.** Ver ADR 0002.
- Sem integração nativa com Apple Health / Google Health neste ciclo.

**Gatilhos para revisitar:**

- Quando o plano pago exigir sincronização real, entra backend — e aí a decisão nativo vs web volta à mesa.
- Se o despejo de dados se mostrar problema real em campo (Safari), o app nativo com vault de arquivos passa a ser a resposta certa, como as anotações já apontavam.
