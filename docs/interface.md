# Interface

## A planilha é o artefato errado para o aluno

A planilha do profissional é um **artefato de autoria**: organizada por seções de documento (nutrição, suplementos, treino), otimizada para prescrever tudo de uma vez. O app do aluno é um **artefato de execução**: organizado por momentos do dia, otimizado para fazer uma coisa agora.

Copiar as abas da planilha para dentro do app seria repetir a planilha com CSS melhor. O valor está em transformar dado prescrito em ação no momento certo.

## O que o dado gera

Informação derivada, calculada sob demanda, nunca persistida (ADR 0006).

| Dado da prescrição                           | Informação que ele gera                                         |
| -------------------------------------------- | --------------------------------------------------------------- |
| Agenda semanal + data de hoje                | **A sessão de hoje** — o aluno nunca escolhe "treino C"         |
| Prescrição `SxR` + registros anteriores      | **Carga sugerida já preenchida**, progressão, recorde pessoal   |
| `INTERVALO: 60 a 70s`                        | **Cronômetro que dispara sozinho** ao concluir a série          |
| Itens de refeição com alternativas "OU"      | **Uma escolha por slot**, não uma tabela para interpretar       |
| Alternativa escolhida + macros do item       | **Macros consumidos vs alvo do dia**, somados sozinhos          |
| Posologia (`após o café`, `antes do treino`) | **Ancoragem temporal** — o suplemento aparece junto da refeição |
| Registros ao longo do tempo                  | **Aderência e sequência**                                       |
| Medidas datadas                              | **Delta corporal entre aferições**                              |

## Princípios

Cada princípio responde à causa-raiz: quem decide na hora é o eu afetivo e automático, não o reflexivo.

1. **Um momento por vez, nunca o documento inteiro.** A planilha mostra tudo; o app mostra agora. Ver o plano completo é ação deliberada, não tela inicial.
2. **O padrão já é a resposta certa.** Carga e repetições vêm pré-preenchidas com a última sessão. Na academia o aluno confirma, não digita. Zero decisões sob esforço.
3. **O app age; o usuário não precisa lembrar.** O cronômetro dispara sozinho. O suplemento aparece ancorado na refeição. A evidência de progresso vai até o aluno.
4. **Evidência em frase, gráfico depois.** "Você levantou 12% mais no supino que há 4 semanas" antes de qualquer eixo cartesiano.
5. **A prescrição é do profissional e é imutável no app do aluno.** Read-only e claramente atribuída — é o que faz o profissional confiar em mandar o aluno para cá.

## Arquitetura de informação

Quatro destinos. **Suplementos e Dieta não são abas** — são eventos ancorados no dia, que é quando o aluno precisa deles.

### 1. Hoje — a linha do tempo do dia

Tela inicial, ~90% do uso. Uma coluna cronológica que funde as três abas da planilha em eventos:

```
[ Água  1,2 / 4 L ]                    ← contador fixo, sempre visível

 ☐ Refeição 1        3 itens · escolher
 ☐ Suplementos       Ginkgo, Ômega 3, Multi      ← "após o café", ancorado aqui
 ☐ Treino A · UPPER  9 exercícios · ~50 min      → abre modo execução
 ☐ Aeróbico          20 min HIIT
 ☐ Refeição 2        1 item
 …
 ☐ Refeição 5
 ☐ Suplementos       Melatonina, chá             ← "após o jantar"
```

O dia tem forma e fecha. A barra de progresso é a própria lista se preenchendo — espírito do Duolingo sem gamificação postiça.

**Refeição** abre uma folha com um slot por item: `Arroz 100 g ⟷ Batata 200 g`, escolha única, um toque. Os macros do dia somam sozinhos e aparecem como linha discreta, não como planilha.

### 2. Modo execução de treino

Tela cheia sobre Hoje — não é aba. A tela mais crítica do produto. Restrições reais: 60–70 s de descanso, mão suada, celular no bolso, uma mão livre.

```
        Supino Inclinado com Barra
                4 × 10–12
   ⚠ DESCER ATÉ O TALO                 ← técnica avançada, fixa e visível

   Série 1    60 kg    12 reps    ✓
   Série 2    60 kg    11 reps    ✓
 ▸ Série 3    60 kg    12 reps    [ CONCLUIR ]   ← pré-preenchido da última sessão

   ●●●○○○○○○                          ← progresso da sessão
```

Ao concluir, **o cronômetro dispara sozinho**, largura total, impossível de ignorar. Na planilha o intervalo é uma linha de texto que ninguém obedece; aqui é comportamento automático do sistema. É a conversão de uma instrução para o eu reflexivo em um recurso para o eu automático.

### 3. Evolução

Não é painel de gráficos. Responde a uma pergunta: **eu evoluí?**

- **Primeiro a frase.** "Supino: +12% de carga em 4 semanas." "Você treinou 5 de 5 dias."
- Depois a evidência: progressão de carga por exercício, volume semanal, aderência, delta das medidas.
- Gerar imagem compartilhável a partir de um marco real, não de gráfico de vaidade.

**O marco vai até o aluno.** Um recorde pessoal aparece em Hoje no instante em que acontece. O eu afetivo não vai procurar prova de progresso; a prova tem que chegar.

### 4. Perfil

Identificação, altura, e o histórico de aferições como série temporal: cada medição é ponto datado que nunca sobrescreve o anterior. Não é destino diário — é consulta e marco periódico.

### Consultar o plano completo

Acessível a partir de Hoje e do Perfil. Prescrição inteira read-only: treinos A–F, protocolo alimentar completo, fórmulas de suplemento **agrupadas como o profissional as pensou** (Colesterol, Sono, Testosterona), agenda semanal. É o único lugar onde a estrutura da planilha é a estrutura certa, porque aqui o aluno está em modo reflexivo, consultando. Import e export do vault vivem aqui.

## Decisões visuais

- **Fundo escuro.** Menos ofuscamento sob luz de academia e menos bateria em OLED.
- **Área de toque mínima de 48 px.** Mão suada, movimento sob esforço.
- **`overscroll-behavior-y: contain`.** Impede que um "puxar para atualizar" acidental apague um registro em andamento no meio da série.
- **Safe area respeitada.** O app é instalado na tela inicial e roda em `standalone`.
