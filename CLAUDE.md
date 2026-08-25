# CLAUDE.md — App de Treino e Dieta

## Contexto de Negócio

PWA de execução de treino e dieta com _data ownership_ no espírito do Obsidian. O profissional (nutricionista/treinador) prescreve e envia um arquivo; o aluno importa, executa, registra e devolve. Usuários: alunos (Ciclo 1) e profissionais (Ciclo 2). Restrições: LGPD (dado de saúde), GitHub Pages sem backend, offline-first.

A causa-raiz que o produto ataca: o aluno abandona porque **não sente evolução**, e os programas apostam no eu reflexivo quando quem decide na hora é o eu afetivo e automático. Detalhes em `.claude/PROBLEMA.md`.

## Método — o que cada etapa do ciclo significa aqui

### Planejar

- Incrementos são **user stories**: "Como [papel], quero [ação] para [valor]", com critérios de aceitação verificáveis. Stories vivas em `.claude/PLANO.md`.

### Gate de design (antes da primeira linha de código)

- Arquitetura em texto curto: componentes, fluxo de dados, contratos. Só o necessário para as stories da iteração.
- Incerteza técnica → **spike**: protótipo descartável, com tempo limitado.

### Produzir — TDD obrigatório

- Escreva o teste que falha → **mostre a saída falhando** → implemente o mínimo para passar → refatore. Nessa ordem.
- Commits pequenos e frequentes, Conventional Commits em português (`feat:`, `fix:`, `test:`, `refactor:`).
- Refatoração contínua, em commit separado da funcionalidade.

### Verificar

- Além dos unitários: teste ponta a ponta, como um aluno faria.
- Suíte completa verde antes de declarar qualquer story concluída. Teste quebrado bloqueia tudo.
- Nunca desative, pule ou enfraqueça um teste para "fazer passar".

### Entregar

- Releases pequenos e frequentes. `./docs/` faz parte da release: atualizar o que mudou + `./docs/CHANGELOG.md`.

## Princípios de interface (não negociáveis)

Cada um responde à causa-raiz. Violá-los é regressão de produto, não de estilo.

1. **Um momento por vez, nunca o documento inteiro.** A tela inicial é o dia, não o plano.
2. **O padrão já é a resposta certa.** Carga e reps vêm pré-preenchidas da última sessão. Na academia o aluno confirma, não digita.
3. **O app age; o usuário não precisa lembrar.** O cronômetro de descanso dispara sozinho; o suplemento aparece ancorado na refeição; a evidência de progresso vai até o aluno.
4. **Evidência em frase, gráfico depois.**
5. **A prescrição é do profissional e é imutável no app do aluno.**

Desenho completo em `./docs/interface.md`.

## Stack Travada (decidida no gate de design)

- Runtime/build: Vite 7 + React 19 + TypeScript 5, `strict: true`
- PWA: `vite-plugin-pwa` (Workbox), `registerType: 'autoUpdate'`, offline-first
- Rotas: React Router em `HashRouter` (ADR 0004)
- Schema/validação: Zod — fonte única do formato do vault e de todo import
- Estado de UI: Zustand (regra de negócio fica em `domain`)
- i18n: `react-i18next`, só dicionário `pt-BR`
- Testes: Vitest + Testing Library; Playwright para E2E e integração OPFS
- Lint/format: ESLint + Prettier
- Deploy: GitHub Actions → GitHub Pages, `base: '/my-fitness-app/'`

Desvio desta stack = parar e consultar o Navegador. Não sugerir troca.

## Comandos

- `npm run dev` — ambiente local
- `npm run test` — suíte completa com cobertura
- `npm run test:watch` — TDD loop
- `npm run test:e2e` — Playwright
- `npm run check` — lint + type-check + testes (gate antes de commit)
- `npm run build` / `npm run preview`

## Arquitetura e Estrutura

```
src/
├── domain/          # puro, sem I/O
│   ├── aluno/       # Perfil, Medida (série temporal)
│   ├── treino/      # SessaoTreino, ExercicioPrescrito, parser de SxR
│   ├── nutricao/    # Refeicao, ItemRefeicao (alternativas "OU"), macros
│   ├── suplemento/  # Formula, Suplemento, ancoragem por posologia
│   ├── dia/         # monta a linha do tempo de Hoje
│   ├── progresso/   # carga, volume, recorde, aderência (derivado)
│   ├── schema/      # Zod + schemaVersion + migrações
│   └── ports/       # VaultStorage, FileTransfer
├── application/     # casos de uso; orquestram domain + ports
├── infrastructure/  # OPFS, File System Access, i18n, PWA
└── ui/              # Hoje, ExecucaoTreino, Evolucao, Perfil, Plano
```

- Dependências apontam para dentro: `ui → application → domain`. `domain` não importa nada das outras camadas.
- Detalhes: `./docs/arquitetura.md` e `./docs/modelo-dados.md`.

## Convenções Específicas do Projeto

- Nomes de domínio em pt-BR (`SessaoTreino`, `Refeicao`, `Aferição`); infraestrutura e utilitários em inglês.
- Datas de domínio são `AAAA-MM-DD` no fuso local do aluno; nunca `Date` cru atravessando camadas.
- Erros de negócio: classes tipadas em `src/domain/errors/`; nunca `throw new Error(string)`.
- Todo import externo passa por Zod antes de entrar em `application`.
- **Derivado nunca é persistido** (ADR 0006): agenda do dia, carga sugerida, macros consumidos, aderência e streak são funções puras sobre plano + registros.
- Nenhuma string de UI solta em JSX — tudo via `react-i18next`, mesmo com um só idioma.
- `localStorage` só para preferências de UI. Dado do aluno é sempre OPFS (ADR 0002).

## Estratégia de Testes (metas deste projeto)

- `domain`: unit puros, sem I/O — cobertura mínima 95%
- `application`: unit com `InMemoryVaultStorage` — 90%
- `infrastructure`: integração OPFS via Playwright (OPFS não existe em jsdom)
- `ui`: componentes com Testing Library
- `npm run check` falha (e bloqueia o commit) com cobertura global < 85% ou suíte vermelha

## O que NUNCA fazer (específico deste projeto)

- Não commitar dado pessoal de saúde: nome, idade, medidas ou medicamentos reais. Fixtures são sintéticos (ADR 0005). Repo e Pages são públicos.
- Não usar `localStorage` para dado do aluno.
- Não persistir valor derivado.
- Não usar `any` ou `@ts-ignore` sem comentário justificando em uma linha.
- Não alterar o formato do vault sem subir `schemaVersion` e escrever a migração com teste.
- Não deixar o aluno editar a prescrição do profissional.

## Lições Aprendidas

- [vazio no início do projeto]
