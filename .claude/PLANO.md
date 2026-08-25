# PLANO

## Ciclo 1 — Módulo Aluno

Uma story por vez: completar, verificar, só então iniciar a próxima.

### Etapa 0 — Fundação (gate de design)

- [x] `CLAUDE.md` na raiz, preenchido do template `tipos/software`
- [x] `.claude/PROBLEMA.md` — causa-raiz, POV, personas, restrições, outcomes
- [x] `.claude/PLANO.md` — este arquivo
- [x] `.claude/settings.json` — permissões do projeto
- [x] `docs/` — arquitetura, modelo de dados, interface, processo de negócio, ADRs
- [x] Bootstrap da stack travada (Vite, TS strict, ESLint/Prettier, Vitest, Playwright, PWA)
- [x] `.github/workflows/deploy.yml` — pipeline para GitHub Pages
- [ ] Primeiro deploy verde publicando o app shell — prova o pipeline antes de existir produto

### Stories

- [x] **1. Parser de prescrição** — o app entende `3x10a12` (faixa de repetições) e `2x60'` (tempo sob tensão).
      _Aceite:_ casos reais da planilha parseados; entrada desconhecida falha com erro tipado, nunca em silêncio.
      _Puro `domain`, TDD sem infraestrutura. Primeira story do projeto._

- [ ] **2. Importar plano** — o aluno carrega o arquivo que o profissional enviou.
      _Aceite:_ arquivo válido persiste no vault; inválido mostra erro apontando o campo, sem corromper o vault existente.

- [ ] **3. Hoje** — como aluno, quero abrir o app e ver só o que tenho que fazer hoje.
      _Aceite:_ linha do tempo cronológica com refeições, treino, aeróbico e suplementos ancorados por posologia; dia de DESCANSO tem estado próprio; contador de água fixo; a montagem é função pura testável sem UI.

- [ ] **4. Modo execução de treino** — a tela que decide o produto.
      _Aceite:_ um exercício por vez; séries pré-preenchidas com a última sessão registrada; cronômetro de descanso dispara sozinho com o intervalo do plano; técnica avançada sempre visível; registro sobrevive a recarregar e a ficar offline.

- [ ] **5. Refeição com alternativas** — escolher entre as opções "OU" do item.
      _Aceite:_ um slot por item, escolha única; macros do dia somam conforme a escolha; sobrevive a recarregar e offline.

- [ ] **6. Perfil e medidas** — aba própria, histórico como série temporal.
      _Aceite:_ cada aferição é ponto datado que não sobrescreve o anterior; trocar o plano importado preserva todo o histórico (teste explícito).

- [ ] **7. Evolução** — a story que ataca a causa-raiz.
      _Aceite:_ frase em linguagem natural antes de qualquer gráfico; com ≥2 sessões do mesmo exercício mostra variação de carga e volume; com ≥2 aferições mostra delta corporal; recorde pessoal aparece em Hoje no momento em que acontece, sem o aluno visitar a aba.

- [ ] **8. Consultar o plano completo** — prescrição inteira read-only.
      _Aceite:_ suplementos agrupados por fórmula como o profissional prescreveu; import e export vivem aqui.

- [ ] **9. Exportar vault** — data ownership na prática.
      _Aceite:_ o arquivo gerado reimporta em instalação limpa e reproduz o mesmo estado, histórico de medidas incluído (round-trip).

- [ ] **10. Instalar e usar offline** — PWA de verdade.
      _Aceite:_ Playwright com rede desligada abre o app e registra uma série.

## Backlog (não é Ciclo 1)

- Módulo do profissional: editor que substitui a planilha e gera o arquivo do aluno
- Imagem compartilhável a partir de um marco real
- Geração de `.ics` para a agenda
- Ingestão de Google Health / Apple Health como diário de saúde
- Mecânica de sequência (streak) mais elaborada

## Dívida técnica assumida

- Nenhuma até o momento.

## Decisões pendentes

- Nenhuma até o momento.
