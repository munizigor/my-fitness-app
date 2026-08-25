# Arquitetura

## Visão geral

PWA estático, servido pelo GitHub Pages, sem backend. Todo o estado do aluno vive no aparelho, em OPFS. O intercâmbio com o profissional é por arquivo: o profissional envia um plano, o aluno importa, executa, registra e devolve um `.fitvault.json`.

```
┌────────────────────────────────────────────────────────┐
│  ui/          Hoje · ExecuçãoTreino · Evolução ·        │
│               Perfil · Plano          (React, i18n)     │
├────────────────────────────────────────────────────────┤
│  application/ casos de uso: ImportarPlano,              │
│               RegistrarSerie, MontarDia, …              │
├────────────────────────────────────────────────────────┤
│  domain/      regras puras + portas (interfaces)        │
└────────────────────────────────────────────────────────┘
                          ▲ implementa as portas
┌────────────────────────────────────────────────────────┐
│  infrastructure/  OpfsVaultStorage · FileSystemAccess   │
│                   InMemoryVaultStorage (testes) · PWA   │
└────────────────────────────────────────────────────────┘
```

Dependências apontam para dentro: `ui → application → domain`. `domain` não importa nada das outras camadas. A regra não depende de disciplina: está codificada em `eslint.config.js` como `no-restricted-imports` por diretório, e o lint quebra o build se alguém violar.

## Camadas

**`domain/`** — puro, sem I/O. Entidades, regras e cálculos derivados. Aqui vive o parser de prescrição (`3x10a12`, `2x60'`), a montagem da linha do tempo do dia, e todo o cálculo de progresso. Testável sem browser, sem mock, sem setup. Meta de cobertura: 95%.

**`domain/ports/`** — interfaces que o domínio precisa mas não implementa: `VaultStorage`, `FileTransfer`. É a inversão que permite testar `application` sem tocar em OPFS.

**`application/`** — casos de uso que orquestram domínio e portas. Um caso de uso por intenção do aluno. Testado com `InMemoryVaultStorage`. Meta: 90%.

**`infrastructure/`** — as implementações concretas: OPFS, File System Access API, i18n, service worker. Verificada por Playwright em Chromium real, porque OPFS não existe em jsdom.

**`ui/`** — React. Não contém regra de negócio: chama caso de uso e renderiza. Toda string sai do dicionário `pt-BR`.

## Persistência

Ver `modelo-dados.md` para o layout do vault e ADR 0002 para a escolha do motor.

Em resumo: um arquivo JSON por documento em OPFS, atrás da porta `VaultStorage`. `localStorage` só guarda preferência de UI — nunca dado do aluno (cota de ~5 MB, API síncrona, e o Safari apaga após 7 dias de inatividade).

## PWA e deploy

- `vite-plugin-pwa` com Workbox, `registerType: 'autoUpdate'`, precache do app shell.
- O vault **nunca** entra no cache do service worker: ele vive em OPFS, que tem outro ciclo de vida.
- `base: '/my-fitness-app/'` — o Pages serve sob o nome do repositório.
- `HashRouter` em vez de rotas de histórico (ADR 0004): o Pages não oferece fallback de rota no servidor.
- `navigator.storage.persist()` é pedido na inicialização, como primeira defesa contra despejo.

## Testes

| Camada           | Ferramenta                       | Meta          |
| ---------------- | -------------------------------- | ------------- |
| `domain`         | Vitest, unit puro                | 95%           |
| `application`    | Vitest + `InMemoryVaultStorage`  | 90%           |
| `infrastructure` | Playwright (Chromium real, OPFS) | integração    |
| `ui`             | Vitest + Testing Library         | componente    |
| fluxo do aluno   | Playwright, perfil de celular    | ponta a ponta |

O gate `npm run check` roda lint, formatação, tipos e testes com cobertura. Falha em qualquer um bloqueia o commit.
