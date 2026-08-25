# ADR 0002 — JSON em OPFS como motor, atrás de uma porta

**Status:** aceito · **Data:** 2026-08-25

## Contexto

O app precisa guardar o plano do profissional e todo o registro diário do aluno, offline, no aparelho. Três candidatos foram considerados: SQLite compilado para wasm sobre OPFS (o que as anotações de concepção sugeriam), IndexedDB, e arquivos JSON em OPFS.

`localStorage` está descartado por decisão anterior e não foi considerado: cota prática de ~5 MB por origem (metade em conteúdo real por causa do UTF-16), API síncrona que trava a thread principal, só guarda strings, sem índice nem busca, e o navegador pode apagar os dados.

## Decisão

Um arquivo JSON por documento em OPFS, atrás da porta `VaultStorage` definida em `domain/ports`.

## Razões

- **O volume de dados do v0 é pequeno**: um plano, um perfil, uma aferição por semana, um registro por dia. Nenhuma consulta precisa de índice; tudo cabe em memória.
- **SQLite wasm custa ~1 MB de download**, mais complexidade de migração de esquema e de teste, desde o primeiro dia. O contrato de trabalho é explícito: simplicidade vence, complexidade exige justificativa — e não há justificativa hoje.
- **IndexedDB é um banco opaco do navegador**, o que atrita com o posicionamento de "arquivo acima do app". JSON em OPFS mapeia um-para-um com o formato de export: o que está no disco é o que o usuário recebe ao exportar.
- **A porta protege a decisão.** Trocar o motor depois é implementar outra classe, não reescrever o app. `InMemoryVaultStorage` já existe para os testes de `application`.

## Consequências

**Aceitas:**

- Sem consulta indexada. Filtrar registros por período é varredura em memória — irrelevante nesta escala, revisitar se deixar de ser.
- **OPFS pode ser despejado.** O Safari apaga todo o script-writable storage após 7 dias de inatividade. Mitigações: `navigator.storage.persist()` na inicialização, e convite explícito a exportar o vault. O usuário nunca depende só do navegador para não perder o histórico.
- OPFS não existe em jsdom: toda integração de armazenamento é verificada por Playwright em Chromium real.

**Gatilho para revisitar:** quando surgir necessidade real de consulta indexada — histórico de anos, busca por exercício em milhares de sessões — SQLite wasm entra por trás da mesma porta, com ADR próprio.
