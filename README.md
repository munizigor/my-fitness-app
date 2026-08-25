# Treino e Dieta

PWA de execução de treino e dieta com _data ownership_ no espírito do Obsidian. O profissional prescreve e envia um arquivo; o aluno importa, executa, registra e devolve. **Seus dados ficam no seu aparelho, em formato aberto, e são seus.**

## Por que existe

A causa-raiz do abandono não é falta de vontade — é falta de design. Os programas de saúde apostam no eu reflexivo e disciplinado, quando quem decide na hora é o eu afetivo e automático. O aluno para porque **não sente evolução**, e o profissional trabalha numa planilha que é ótima para prescrever e péssima para executar.

Contexto completo em [`.claude/PROBLEMA.md`](.claude/PROBLEMA.md).

## Começando

```bash
npm install
npm run dev        # ambiente local
npm run check      # lint + formatação + tipos + testes com cobertura
npm run test:watch # loop de TDD
npm run test:e2e   # Playwright em Chromium
npm run build      # build de produção
```

`npm run check` é o gate antes de qualquer commit. Falha em qualquer etapa bloqueia.

## Documentação

| Documento                                              | O que responde                                |
| ------------------------------------------------------ | --------------------------------------------- |
| [`docs/interface.md`](docs/interface.md)               | Por que o app não é a planilha com CSS melhor |
| [`docs/arquitetura.md`](docs/arquitetura.md)           | Camadas, portas, testes, PWA                  |
| [`docs/modelo-dados.md`](docs/modelo-dados.md)         | Formato do vault e origem de cada dado        |
| [`docs/processo-negocio.md`](docs/processo-negocio.md) | O processo real que o app suporta             |
| [`docs/adr/`](docs/adr/)                               | Decisões arquiteturais e o que custaram       |
| [`CLAUDE.md`](CLAUDE.md)                               | Método de trabalho e convenções do projeto    |
| [`.claude/PLANO.md`](.claude/PLANO.md)                 | Stories do ciclo atual                        |

## Privacidade

Este repositório e o site publicado são públicos. **Nenhum dado pessoal de saúde entra aqui** — fixtures de teste são sintéticos. Ver [ADR 0005](docs/adr/0005-dados-pessoais-fora-do-repositorio.md).
