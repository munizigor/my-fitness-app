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

Tela inicial, ~90% do uso. Uma coluna cronológica que funde as três abas da planilha em **blocos**:

```
[ −   Água  1,25 de 4 L   + ]          ← contador fixo, ajusta para os dois lados

 ┃ Café da manhã                  2 itens
 ┃   SUPLEMENTOS                          ← "após o café", dentro do bloco
 ┃   Magnésio dimalato  200 mg
 ┃   Ômega 3            4 cápsulas

 ┃ Treino A · Superior            9 exercícios · descanso de 60 a 70 s
 ┃   ANTES DE TREINAR
 ┃   Pré-treino         2 scoops
 ┃   Puxada Frontal Pronada   4 × 10–12
 ┃   …
 ┃   Aeróbico  HIIT na esteira · 20 min    ← mesma ida à academia
 ┃   [ Começar treino ]

 ┃ Lanche da manhã                1 de 1 escolhido
 ┃ Almoço                         3 itens
```

**Poucos blocos grandes, não muitos cartões pequenos.** Suplemento não é compromisso próprio — é parte de tomar o café da manhã. Aeróbico não é uma segunda ida à academia — é parte de ir treinar. Ambos moram _dentro_ do momento a que pertencem; o aluno não deveria ter que perceber que três cartões seguidos são a mesma hora. Aeróbico em dia sem musculação é a exceção: ganha cartão próprio, senão sumiria do dia.

O dia tem forma e fecha. A barra de progresso é a própria lista se preenchendo — espírito do Duolingo sem gamificação postiça.

### 1b. Refeição — a escolha, não a tabela

O cartão inteiro é o alvo de toque; mirar num "ver mais" de 12 px com uma mão só é atrito que faz não abrir.

```
←  Almoço

  45 g de proteína · 0 g de carboidrato · 5 g de gordura
  [ Filé de frango grelhado          150 g ]
     ou
  [ Tilápia grelhada                 150 g ]   ← marcada

  TOTAL DO DIA
  Proteína      47,5 de 170 g
  Carboidrato     28 de 180 g
  Gordura        5,2 de 55 g
```

**Escolher a alternativa é registrar o consumo** — um toque, não dois. Perguntar "qual das opções?" e depois "você comeu?" cobraria duas decisões onde existe uma, e o dobro de atrito mata o registro na segunda semana. Tocar de novo desmarca; trocar de alternativa substitui.

O **"ou"** fica visível entre as opções: sem ele a lista se lê como coisas a comer todas, que é o oposto do que o profissional prescreveu. Os macros aparecem **uma vez, acima das alternativas**, porque valem para qualquer uma — as quantidades foram escolhidas para serem equivalentes.

O total é do **dia**, não desta refeição: a pergunta que o aluno faz de verdade é "quanto ainda falta hoje?".

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

```
 Sua evolução

 ┃ Você levantou 20% mais na Remada Cavalinho
 ┃ em 4 semanas.                                  ← a manchete, e só uma

 EXERCÍCIO POR EXERCÍCIO
 ┃ Remada Cavalinho com Triângulo    4 sessões
 ┃   Carga    30 → 36 kg                  +20%
 ┃   Volume  300 → 432 kg                 +44%

 ┃ Agachamento Livre                 1 sessão
 ┃   Seu ponto de partida                        ← não some por ser um ponto só

 SEU CORPO
 ┃   Peso      85 → 81,6 kg                −4%
 ┃   Cintura     92 → 89 cm                −3,3%
```

- **Primeiro a frase**, uma só. Escolher qual é escolher **o melhor fato verdadeiro**: a maior subida de carga em percentual — mais 10 kg no agachamento pesado é menos evolução que mais 6 kg na rosca — e, quando nada subiu na barra, a maior mudança do corpo. Se nada mudou, a manchete some: dizer "+0%" em letra grande é fingir uma evidência que ainda não existe.
- Depois a evidência: carga e volume por exercício, delta das medidas. Aderência e volume semanal ficam para depois.
- **A queda aparece como é.** Esconder seria mentir para quem está voltando de uma lesão. Só a subida ganha cor — a queda é informação, não erro.
- No corpo, a maior mudança em **qualquer direção**: sem saber o objetivo do aluno — e o plano não diz qual é —, perder 3 cm de cintura e ganhar 3 cm de braço são igualmente evolução.
- Gerar imagem compartilhável a partir de um marco real, não de gráfico de vaidade, continua no backlog.

**O marco vai até o aluno.** Um recorde pessoal aparece em Hoje no dia em que acontece, acima da linha do tempo — é o único bloco do dia que não é compromisso, e sim prova de que valeu. O eu afetivo não vai procurar prova de progresso; a prova tem que chegar.

Três regras protegem o marco de virar confete: **empatar não é recorde** (marco que acontece toda semana deixa de ser marco), **a primeira vez não é recorde** (sem passado não há o que superar, e o primeiro treino marcaria todos os exercícios de uma vez), e a comparação é com **a melhor marca de todas** — voltar de uma pausa e superar a semana passada ainda é estar abaixo de si mesmo.

### 4. Perfil

Identificação, altura, e o histórico de aferições como série temporal: cada medição é ponto datado que nunca sobrescreve o anterior. Não é destino diário — é consulta e marco periódico.

```
 Perfil
 Aluno Exemplo · 30 anos · 1,75 m
 [ Corrigir meus dados ]

 ┃ Como você está hoje
 ┃  Peso (kg) [ 82,4 ]   Gordura (%) [    ]
 ┃  [ Fita métrica ]                              ← 7 campos atrás de um toque
 ┃  [ Registrar aferição ]

 HISTÓRICO DE AFERIÇÕES
 10/06/2026   85 kg · Cintura 88 cm
```

Três decisões desta tela:

- **A aferição vem pré-preenchida com a última** — princípio 2, o mesmo da carga na academia. Quem se pesa de novo confirma ou ajusta um número que já está na tela, em vez de ter que lembrar o anterior.
- **A identificação abre em uma linha, não em formulário.** Altura e idade mudam uma vez por ano; três campos abertos competiriam por atenção com o que o aluno veio ver (princípio 1). O formulário aparece quando ele pede.
- **A fita métrica fica atrás de um toque**, já aberta para quem mediu da última vez: o peso é o número de toda aferição, as circunferências são de quem tem fita na gaveta.

Aqui não há gráfico. A frase de evidência ("você perdeu 3 cm de cintura desde junho") é a tela de Evolução; esta mostra os pontos datados que a alimentam — e é o único lugar do app onde a prescrição não aparece, porque nada disto é do profissional.

### Consultar o plano completo

Acessível a partir de Hoje e do Perfil. Prescrição inteira read-only: treinos A–F, protocolo alimentar completo, fórmulas de suplemento **agrupadas como o profissional as pensou** (Colesterol, Sono, Testosterona), agenda semanal. É o único lugar onde a estrutura da planilha é a estrutura certa, porque aqui o aluno está em modo reflexivo, consultando. Import e export do vault vivem aqui.

## Decisões visuais

- **Fundo escuro.** Menos ofuscamento sob luz de academia e menos bateria em OLED.
- **Área de toque mínima de 48 px.** Mão suada, movimento sob esforço.
- **`overscroll-behavior-y: contain`.** Impede que um "puxar para atualizar" acidental apague um registro em andamento no meio da série.
- **Safe area respeitada.** O app é instalado na tela inicial e roda em `standalone`.
- **Todo contador ajusta para os dois lados.** A primeira versão da água só somava, e um toque a mais deixava o número errado até a meia-noite. Registrar é diferente de contar para cima: se dá para pôr, tem que dar para tirar.
- **Nenhum contador trava no alvo.** Gravar 4 L quando o aluno bebeu 4,5 seria mentir no arquivo que o profissional vai ler. Quem enche até 100% é a barra, não o número.
