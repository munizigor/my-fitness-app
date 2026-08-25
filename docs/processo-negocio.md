# Processo de negócio suportado

## O processo hoje, sem o app

1. O aluno procura um nutricionista ou treinador.
2. O profissional avalia, mede e monta a prescrição **numa planilha**.
3. Envia a planilha (ou um PDF dela) por mensagem.
4. O aluno abre a planilha no celular, tenta interpretá-la na academia, desiste de consultar.
5. Executa de memória, aproximadamente. Não registra nada — ou registra em outro caderno que ninguém lê.
6. Na consulta seguinte, o profissional pergunta como foi. A resposta é impressão, não dado.
7. Sem evidência de progresso, o aluno para. O profissional perde o cliente sem saber por quê.

Os pontos 4 a 7 são onde o processo quebra, e são todos o mesmo problema: **o veículo da prescrição não serve à execução**.

## O processo com o app (Ciclo 1)

1. O profissional monta a prescrição (ainda na planilha; o editor é o Ciclo 2) e gera o arquivo do aluno.
2. Envia o arquivo por qualquer canal — mensagem, e-mail, nuvem. Não há cadastro, não há conta, não há servidor no meio.
3. O aluno **importa** o arquivo no app. A prescrição passa a ser read-only e atribuída ao profissional.
4. Todo dia o app mostra **só o que fazer hoje**: refeições, treino, aeróbico, suplementos ancorados nos momentos certos.
5. Na academia, o aluno **executa e registra** — carga já pré-preenchida da última sessão, cronômetro de descanso automático, funciona offline.
6. O app mostra **evidência de evolução no momento em que ela acontece**, sem o aluno ir procurar.
7. O aluno **exporta** e devolve ao profissional um registro estruturado do que de fato executou.
8. O profissional ajusta a prescrição com base em dado, não em impressão. Volta ao passo 1.

## Onde o valor aparece

| Passo quebrado                       | O que o app faz                                             |
| ------------------------------------ | ----------------------------------------------------------- |
| Interpretar a planilha na academia   | Mostra um exercício por vez, com a técnica avançada visível |
| Lembrar a carga da última vez        | Já vem preenchida; o aluno confirma                         |
| Respeitar o intervalo prescrito      | O cronômetro dispara sozinho                                |
| Escolher entre alternativas da dieta | Um slot, um toque, macros somam sozinhos                    |
| Lembrar de tomar o suplemento        | Aparece ancorado na refeição a que pertence                 |
| Perceber que evoluiu                 | O marco vai até o aluno na tela inicial                     |
| Devolver informação ao profissional  | Export reimportável, legível, completo                      |

## Modelo de negócio

Contexto de produto, fora do escopo deste repositório como código. Registrado aqui para não se perder.

- **Universalidade.** O processo acima não tem nada de específico do Brasil. O modelo serve qualquer mercado onde exista prescrição de treino e dieta — daí a decisão de manter o app com i18n preparado desde o primeiro commit, mesmo com um só dicionário.
- **Vento a favor.** O crescimento do número de academias puxa a base de alunos e de profissionais junto.
- **Hipótese de monetização.** Plano gratuito com o ciclo completo por arquivo (o que o Ciclo 1 entrega) e plano pago com acompanhamento e atualização em tempo real entre profissional e aluno. O plano pago exige backend e está fora do v0 por decisão arquitetural (ADR 0001).
- **Propaganda dentro do app: nunca.** Decisão de posicionamento, registrada nas anotações de concepção.
- **Crescimento.** Materiais compartilháveis gerados a partir de marcos reais do aluno, não de gráficos de vaidade.
- **Pendente.** Plano de negócio formal (template SEBRAE) e precificação. Não bloqueia o Ciclo 1.
