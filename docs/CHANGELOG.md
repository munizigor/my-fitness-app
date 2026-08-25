# CHANGELOG

## [Não lançado]

### Correções da revisão do PR #1

- `typecheck` deixa de ser um comando contraditório (`--noEmit false` sobre tsconfigs
  com `noEmit: true`, mais um fallback `|| tsc -b`) e passa a checar cada projeto
  explicitamente com `--noEmit`
- Build mode (`tsc -b`) sai de `check` e `build`. Ele exige `composite: true`, que
  implica emissão de declarações — e aqui nada é emitido, quem faz o build é o Vite.
  Funcionava por tolerância do TypeScript 5.9; agora não depende disso
- `playwright.config.ts` não fixa mais o caminho do Chromium. O padrão é o Playwright
  resolver o próprio browser; `PLAYWRIGHT_CHROMIUM_PATH` sobrepõe para contêineres que
  trazem o browser pré-instalado fora do cache
- CI ganha job de E2E com `playwright install`, fechando a distância entre a estratégia
  de testes documentada e o que o pipeline de fato executava

### Story 1 — Parser de prescrição

- `analisarPrescricao` em `domain/treino` entende as duas formas da coluna `SxR`:
  faixa de repetições (`3x10a12`) e tempo sob tensão (`2x60'`)
- Tolera o que um humano varia sem querer numa planilha — espaços, caixa e o
  apóstrofo tipográfico — e nada além disso
- Falha com `PrescricaoInvalidaError`, que carrega o texto ofensivo para o import
  poder apontar o campo errado do arquivo do profissional
- `ErroDeDominio` como base de erro de negócio, distinguindo "o dado está errado"
  de "o app quebrou"
- **Correção de modelo:** `2 cada lado` estava documentado como forma de `SxR`.
  A extração da planilha mostra que ocupa a coluna de Técnica Avançada — é
  qualificador de execução, não prescrição, e não passa pelo parser

### Etapa 0 — Fundação

- Documentos de método: `CLAUDE.md`, `.claude/PROBLEMA.md`, `.claude/PLANO.md`, `.claude/settings.json`
- Stack travada: Vite 7 + React 19 + TypeScript 5 (`strict`), Zod, Zustand, react-i18next, Vitest, Playwright, `vite-plugin-pwa`
- Regra de camadas codificada no ESLint: `domain` não importa UI, infraestrutura nem `application`; o lint quebra o build se alguém violar
- Metas de cobertura por camada configuradas no Vitest: `domain` 95%, `application` 90%, global 85%
- Casca do app com as quatro rotas da arquitetura de informação (Hoje, Evolução, Perfil, Plano) e estado vazio
- PWA: manifest, ícones, service worker com `autoUpdate`, `navigator.storage.persist()` na inicialização
- Pipeline CI/CD para GitHub Pages sob `base: '/my-fitness-app/'`
- Documentação: `arquitetura.md`, `modelo-dados.md`, `interface.md`, `processo-negocio.md`
- ADRs 0001 a 0006
