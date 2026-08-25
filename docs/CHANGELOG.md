# CHANGELOG

## [Não lançado]

### Story 8 — Consultar o plano completo

A prescrição inteira, read-only, na aba que já era dela.

- **A exceção deliberada ao princípio 1**, e a exceção é ver o plano todo, não
  ter que rolar por ele: a semana fica à vista, porque é o mapa e cabe na
  primeira dobra; cada treino e cada refeição ficam atrás de um toque. Seis
  treinos de dez exercícios abertos de uma vez são a planilha rolando na tela —
  o artefato que o app existe para substituir
- **O dia sem nada diz "Descanso".** Linha vazia se lê como informação que
  faltou. E sábado, que tem aeróbico sem musculação, não é descanso: chamá-lo
  assim mandaria o aluno para casa num dia de trabalho
- **Cada treino aparece uma vez, com os dias em que cai** ("Cai em Segunda-feira
  e Quarta-feira"). O arquivo diz "segunda tem o treino A"; quem consulta
  pergunta "quando eu faço o treino A?". Repetir a lista de exercícios por dia
  seria a planilha de volta
- **Treino escrito e não agendado continua na lista.** É comum em plano de
  semana A/B — o profissional deixa o treino C pronto para quando o aluno puder
  ir três vezes — e omiti-lo seria esconder prescrição do aluno
- **O suplemento diz quando tomar pelo nome da refeição.** O artigo concorda com
  "refeição" e não com o nome que o profissional deu a ela: "Depois da refeição
  3 · Ceia" está certo em qualquer plano, "Depois do Ceia" estaria errado na
  metade deles
- **É o único lugar do app onde a fórmula aparece.** No dia, o suplemento é
  dissolvido dentro da refeição a que pertence, porque de manhã o que importa é
  o que tomar agora; aqui o agrupamento é o raciocínio clínico de quem prescreveu
- **A observação do profissional viaja junto.** É ela que distingue os dois usos
  da Prancha Lateral no mesmo treino; sem ela o aluno faria um lado e acharia
  que terminou
- **Nada é editável** (princípio 5). Em Hoje, tocar numa alternativa registra o
  consumo, e por isso ela é um botão. Aqui a mesma alternativa é texto —
  consultar o plano não é comer, e há um teste ponta a ponta que fica vermelho
  se um botão aparecer nesta tela
- Nada disto vai ao disco (ADR 0006): é o mesmo arquivo do profissional lido de
  outro ângulo, com as referências por id resolvidas em `prescricaoCompleta` —
  a contrapartida de `montarDia`
- O export do vault, que também mora nesta aba, é a story 9

### Story 7 — Evolução

A tela que ataca a causa-raiz: o aluno abandona porque **não sente evolução**.

- **Primeiro a frase, o gráfico depois** (princípio 4). A aba abre com uma
  manchete em português — "Você levantou 20% mais na Remada Cavalinho em 4
  semanas" — e só abaixo dela vem a evidência que a sustenta
- A manchete é **o melhor fato verdadeiro**, nunca um inventado: a maior subida
  de carga em percentual (mais 10 kg no agachamento é menos evolução que mais
  6 kg na rosca) e, quando nada subiu na barra, a maior mudança do corpo. Se
  nada mudou, a manchete some — "+0%" em letra grande é o oposto de evidência
- **Carga e volume por exercício**, com duas ou mais sessões registradas. A
  unidade é a sessão, não a série: comparar séries soltas mediria fadiga dentro
  do treino, não evolução entre treinos
- **A queda aparece como é.** Esconder seria mentir para quem está voltando de
  uma lesão. Só a subida ganha cor; a queda é informação, não erro
- **Delta corporal** entre a primeira e a última aferição de cada medida, cada
  uma como série independente: quem pesou três vezes e mediu a cintura uma tem
  trajetória de peso e não tem de cintura
- **O recorde pessoal aparece em Hoje, no dia em que acontece** (princípio 3).
  O eu afetivo não vai abrir a aba Evolução para procurar prova de progresso; a
  prova tem que chegar até ele. Empatar não é recorde, a primeira vez não é
  recorde, e a comparação é com a melhor marca de todas — marco que acontece
  toda semana deixa de ser marco
- Exercício com uma sessão só aparece como **ponto de partida**, não some: ver
  onde se começou já é mais do que a planilha mostrava
- Nada disso vai ao disco (ADR 0006): trajetória, delta, manchete e recorde são
  funções puras sobre os registros e as aferições que já estavam no vault
- O aceite roda de ponta a ponta em Chromium, com passado gravado no OPFS: o
  aluno treina por cima de uma sessão de quatro semanas atrás, vê o recorde em
  Hoje e a frase na Evolução, e tudo sobrevive a recarregar
- A tela provisória `EmConstrucao` sai do app: os quatro destinos da
  arquitetura de informação existem de verdade

### Story 6 — Perfil e medidas

O corpo do aluno deixa de ser uma célula que se sobrescreve.

- **Cada aferição é um arquivo datado** (`vault/aluno/medidas/<data>.json`): a de
  agosto não encosta na de junho. Era exatamente isso que a planilha perdia — o
  peso novo apagava a prova do progresso junto com o número velho
- Medir de novo no mesmo dia reescreve aquele ponto: é correção, não segunda
  aferição
- **A aferição vem pré-preenchida com a última** — princípio 2, o mesmo da carga
  na academia: o aluno confirma, não digita de novo
- Peso, percentual de gordura e sete circunferências de vocabulário controlado,
  porque Evolução vai agregar por elas. A fita métrica fica atrás de um toque, já
  aberta para quem mediu da última vez
- **Campo em branco some do arquivo; não vira zero.** Não medir a cintura é
  diferente de medir zero centímetros, e o segundo apareceria em Evolução como
  uma queda vertical que nunca aconteceu
- A identificação abre em uma linha e vira formulário só quando o aluno pede:
  altura e idade mudam uma vez por ano
- **Perfil é a única aba que não depende do plano.** Lê `vault/aluno/`, que
  sobrevive à troca de profissional — a separação do disco, visível na tela
- O aceite da story roda de ponta a ponta em Chromium: o histórico atravessa um
  recarregamento e a importação do plano de outro profissional, no OPFS de
  verdade. Em jsdom isso seria asserção sobre um `Map`
- `formatarData` evita, do lado da UI, a armadilha que `dataLocal` evita do lado
  do domínio: `new Date('2026-06-10')` é meia-noite UTC, e o histórico inteiro
  apareceria um dia atrasado a oeste de Greenwich

### Story 5 — Refeição com alternativas

A dieta deixa de ser um número de itens e passa a ser uma escolha.

- Tela própria por refeição (`/refeicao/:numero`), aberta pelo cartão inteiro em
  Hoje — mirar num "ver mais" de 12 px com uma mão só é atrito que faz não abrir
- **Escolher a alternativa é registrar o consumo**: um toque, não dois. Perguntar
  "qual das opções" e depois "você comeu?" cobraria duas decisões onde existe uma
- O "ou" entre as alternativas fica visível: sem ele a lista se lê como coisas a
  comer todas, que é o oposto do que o profissional prescreveu
- Tocar de novo desmarca; trocar de alternativa substitui — ninguém comeu as duas
- Macros do item aparecem uma vez, acima das opções, porque valem para qualquer
  uma: as quantidades foram escolhidas para serem equivalentes
- **Total do dia** soma conforme o aluno marca, contra o alvo do plano
  (`macrosDoDia`, função pura, nunca persistida)
- A escolha é guardada pelo **nome do alimento**, não pelo índice da opção:
  reordenar as alternativas no plano seguinte não pode mudar o que o aluno comeu
  ontem — e quem abrir o arquivo num editor lê "Arroz", não "1"

### Ajustes vindos do uso

Quatro coisas que só aparecem quando se usa o app de verdade.

- **Água ajusta para os dois lados.** Só havia um botão, e ele somava: um toque a
  mais e o número ficava errado até a meia-noite. E o total ia para `useState`,
  então trocar de aba apagava o dia. Agora são dois alvos grandes e o total vai
  para o registro do dia
- Passar do alvo deixou de ser travado: gravar 4 L quando o aluno bebeu 4,5 seria
  mentir no arquivo que o profissional vai ler. Quem enche até 100% é a barra
- **Suplementos moram dentro da refeição** e **o aeróbico dentro do treino.**
  Suplemento não é compromisso próprio — é parte de tomar o café. Aeróbico não é
  uma segunda ida à academia. A segunda-feira do fixture caiu de 8 cartões para 4
- O aeróbico avulso (dia sem musculação) mantém cartão próprio: dentro de um
  treino que não existe, ele sumiria do dia

### Formato do vault

- **O registro do aluno ganhou versão própria** (`SCHEMA_VERSION_REGISTRO`),
  separada da do plano. As duas coisas mudam por motivos diferentes: compartilhar
  o número obrigaria todo profissional a reemitir o arquivo porque o app aprendeu
  a contar copos de água. Migração da v2 escrita e testada — o treino de ontem
  sobrevive. A numeração continua de onde a compartilhada parou, para que nenhum
  número em disco tenha dois sentidos

### Story 4 — Modo execução de treino

A tela que decide o produto, e a primeira que **escreve** no vault.

- Um exercício por vez, tipografia grande, alvos de toque de 48 px: o aluno está
  de pé, com uma mão livre, com 60 s entre séries
- **Carga pré-preenchida** por cascata — última que ele levantou → carga que o
  profissional prescreveu → vazio. O histórico vence a prescrição: se ele já
  levanta mais do que foi prescrito há dois meses, o número honesto é o dele
- **Cronômetro dispara sozinho** ao concluir a série, com o intervalo do plano.
  Conta a partir de um instante gravado e não somando ticks, porque o navegador
  estrangula `setInterval` em aba de fundo — somar daria 40 s onde se passaram 70
- **Grava a cada série**, não ao fim do treino: um treino dura 50 minutos e o app
  pode ser fechado a qualquer momento
- Reregistrar a mesma série substitui em vez de duplicar — quem toca de novo está
  corrigindo a carga, não fazendo outra série
- A carga da série 1 se propaga para as seguintes ainda não feitas: quem sobe de
  60 para 80 não pode ter que corrigir três linhas à mão, entre séries
- Técnica avançada sempre visível, nunca atrás de um toque
- Registro ilegível devolve `null` em vez de lançar — diferente do plano, que é
  erro do profissional e precisa ser reportado. Aqui o aluno está segurando a
  barra, e recomeçar o dia é melhor que ver o app quebrar

### Story 3 — Hoje

A tela inicial deixa de ser o convite a importar e passa a ser o dia.

- `montarDia` (`domain/dia`) cruza as três abas do plano numa linha do tempo:
  a agenda semanal escolhe o treino, e **a posologia de cada suplemento o coloca
  junto da refeição ou do treino a que pertence**. Função pura, derivada, nunca
  persistida (ADR 0006)
- `dataLocal` resolve a armadilha de fuso: `new Date('2026-08-25')` é meia-noite
  **UTC**, o que em São Paulo é 21h do dia anterior — um aluno que abrisse o app
  à noite veria o treino de ontem. Testado de UTC+14 a UTC−11
- Dia de descanso tem estado próprio; as refeições continuam, e o pré-treino
  some — lembrar de tomá-lo num dia sem treino é ruído
- Contador de água fixo no cabeçalho: hidratação acompanha o dia inteiro, não
  acontece num momento da lista
- `formatarMedida` traduz o código da unidade para o rótulo que uma pessoa lê —
  "4 cápsulas", não "4 capsula"
- **Onde o treino cai no dia virou parâmetro explícito.** O plano diz o dia,
  nunca a hora; a posição é do aluno. Fica em `PreferenciasDoDia` em vez de ser
  adivinhada dentro da função

### Remodelagem: significado em vez de notação (schemaVersion 2)

O modelo anterior fossilizava a **notação** da planilha: guardava `"4x10a12"` e
`"100 g de arroz"` como texto. Isso obrigaria o profissional a digitar naquele
formato e impediria o app de calcular com o dado.

- `series`, `execucao` (`repeticoes {min,max}` ou `tempo {segundos}`), `quantidade`
  e `unidade` viram campos estruturados
- **Exercício e prescrição viram entidades separadas.** É assim que o profissional
  prescreve unilateral: repete o exercício na sessão e escreve o lado na observação.
  Prancha Lateral aparece uma vez no catálogo e duas na sessão
- **Grupos musculares** por exercício, com vocabulário controlado — destrava
  "volume de costas subiu 15%" em Evolução
- **Carga alvo opcional**: o profissional pode prescrever, e o aluno registra a real
- `foco` do treino vira rótulo livre: cada profissional usa Upper/Lower, Push/Pull, ABC
- O parser `4x10a12` deixa de ser o formato de armazenamento e vira
  `interpretarAtalhoDePrescricao`: atalho de digitação para o editor do
  profissional (Ciclo 2). Acelera a entrada sem fossilizar a saída
- Sem migração de 1 para 2 — a versão 1 esteve no ar menos de uma hora, sem
  usuários, e parte da conversão só teria como ser adivinhada. Razão registrada
  em `docs/modelo-dados.md`

### Mensagens de erro para o usuário, não para o desenvolvedor

- `descreverProblema` traduz cada problema para `onde` (`Treino A · Prancha Lateral
(Lado esquerdo)`), `oQue` (`Séries`) e `mensagem` (`precisa ser maior que zero`)
- O caminho técnico continua disponível, recolhido em "Detalhes técnicos"
- A tela ganha "Copiar para enviar ao profissional": o aluno não montou o arquivo
  e não pode corrigi-lo — o que ele pode fazer é passá-lo adiante
- Quando o arquivo está tão quebrado que nem os nomes existem, a localização cai
  para a posição em vez de imprimir `undefined`. Com testes próprios

### Story 2 — Importar plano

- Schema Zod do arquivo do profissional em `domain/schema`, com mensagens em pt-BR
  (`z.config(z.locales.pt())`) — quem lê o diagnóstico é quem vai corrigir o arquivo
- Integridade referencial entre campos: agenda apontando para sessão inexistente,
  suplemento ancorado em refeição ausente, identificador de sessão repetido
- Porta `VaultStorage` em `domain/ports`, com `InMemoryVaultStorage` para testes e
  `OpfsVaultStorage` para produção
- Caso de uso `ImportarPlano`: valida antes de escrever, e preserva medidas, registros
  diários e o perfil já existente na troca de plano
- Tela de plano com import e erro que aponta o caminho exato de cada campo
- **Correção durante o desenvolvimento:** o vault gravava a leitura transformada do
  plano, que o próprio schema não conseguia reler — o plano sumia ao recarregar a
  página. Passa a gravar o documento original do profissional, o que também é a forma
  mais forte de _data ownership_. Achado pelo E2E, agora coberto por teste unitário
- `DOM.AsyncIterable` na lib do TypeScript, para `FileSystemDirectoryHandle.entries()`

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
