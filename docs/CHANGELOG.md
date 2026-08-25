# CHANGELOG

## [Não lançado]

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
