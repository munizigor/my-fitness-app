# ADR 0006 — Valor derivado nunca é persistido

**Status:** aceito · **Data:** 2026-08-25

## Contexto

Boa parte do valor do produto está em informação que a planilha não contém: qual é o treino de hoje, qual carga sugerir, quantos macros já foram consumidos, qual a aderência da semana, houve recorde pessoal. Todos esses valores são função de dois insumos que já estão no vault: o plano prescrito e os registros do aluno.

A tentação é gravá-los junto com o registro — é mais rápido de renderizar.

## Decisão

Nada derivado é gravado. Agenda do dia, carga sugerida, macros consumidos, aderência, sequência e recorde são funções puras em `domain`, calculadas sob demanda.

O vault contém apenas duas classes de fato: **o que foi prescrito** e **o que foi feito**.

## Razões

- **Derivado gravado apodrece.** Corrigir uma série registrada errado, importar um plano revisado ou consertar um bug de cálculo deixaria todo valor derivado antigo inconsistente, sem nada avisando.
- **É como a planilha erra.** Célula com valor colado que ninguém sabe mais de onde veio é o sintoma clássico. O produto existe para corrigir isso, não para reproduzi-lo em JSON.
- **O export fica honesto.** O profissional recebe fatos, não conclusões do app. Ele tira as próprias conclusões — que é o trabalho dele.
- **Função pura é barata de testar.** Todo o cálculo de progresso fica coberto por unit tests sem I/O, com meta de 95%.

## Consequências

- Cálculo a cada render. Irrelevante nesta escala; se deixar de ser, a resposta é memoização em memória, nunca gravação em disco.
- Uma mudança de regra de cálculo se aplica retroativamente a todo o histórico — o que é o comportamento desejado.
- Recorde pessoal não é um evento armazenado: é uma comparação recalculada. Por isso ele pode aparecer em Hoje no instante em que a série é concluída, sem nenhuma escrita extra.
