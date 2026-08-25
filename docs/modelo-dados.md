# Modelo de dados

Derivado da planilha real usada por um profissional em atendimento — mas **derivado do significado dela, não da sua notação**.

## O princípio: significado, não notação

Numa célula da planilha lê-se `4x10a12`. Isso é uma **forma de escrever**, não o dado. O que aquilo significa é: quatro séries, de dez a doze repetições. O arquivo do plano guarda o significado, em campos separados.

A regra para decidir se um campo vira estrutura ou fica texto livre:

> **O app precisa calcular com isso, ou é instrução para uma pessoa ler?**

| Dado                | Decisão                                       | Por quê                                                      |
| ------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| `4x10a12`           | `series: 4`, `execucao: {repeticoes, 10, 12}` | O app renderiza uma linha por série e acompanha progressão   |
| `3x60'`             | `series: 3`, `execucao: {tempo, 60}`          | O cronômetro precisa do número                               |
| `100 g de arroz`    | `{alimento, quantidade: 100, unidade: 'g'}`   | A quantidade é o que o aluno confere e o que soma macro      |
| `200 mg`            | `{quantidade: 200, unidade: 'mg'}`            | Dose é exibida e comparada                                   |
| `HIIT`              | rótulo livre + `duracaoMinutos`               | O app não calcula com o nome da modalidade                   |
| `Descer até o talo` | texto livre                                   | É instrução para o aluno ler. Estruturar não acrescenta nada |
| `Upper` / `Push`    | rótulo livre                                  | Cada profissional usa seu vocabulário; o app só exibe        |

A notação não desaparece: `interpretarAtalhoDePrescricao` a converte em campos estruturados, como **atalho de digitação** no editor do profissional (Ciclo 2). Ele digita `4x10a12` e vê os campos preenchidos. Acelera a entrada sem fossilizar a saída.

## Exercício e prescrição são coisas diferentes

Esta separação vem de como o profissional realmente prescreve exercício unilateral: ele **repete o exercício** na sessão e escreve o lado na observação. Não existe "Prancha Lateral Direita" como exercício.

```
plano.treino.exercicios[]     catálogo do plano: { id, nome, gruposMusculares }
plano.treino.sessoes[].itens[]  o uso: { id, exercicioId, series, execucao,
                                          cargaAlvoKg?, observacao? }
```

Assim, Prancha Lateral aparece **uma vez** no catálogo e **duas** na sessão, distinguidas pela observação (`Lado direito` / `Lado esquerdo`). Cada item tem `id` próprio, que é a chave usada para pré-preencher a carga da última sessão — sem isso, os dois lados se misturariam no histórico.

**Grupos musculares** ficam no exercício, com vocabulário controlado (`costas`, `quadriceps`, …). Vocabulário livre viraria "Costas", "costas" e "dorsais" como três grupos, e a soma perderia sentido. É o que destrava, em Evolução, mostrar "volume de costas subiu 15% em 4 semanas" — coisa que a planilha nunca conseguiu.

**Carga é opcional.** O profissional pode prescrever `cargaAlvoKg`, e o aluno registra a que de fato usou. Isso permite comparar prescrito × executado, que é informação nova para o profissional.

## Layout do vault

```
vault/manifest.json                      { schemaVersion, appVersion, criadoEm, atualizadoEm }
vault/aluno/perfil.json                  { nome, idade, alturaMetros }
vault/aluno/medidas/<AAAA-MM-DD>.json    aferição datada (série temporal)
vault/planos/atual.json                  o documento que o profissional emitiu
vault/registros/<AAAA-MM-DD>.json        séries, refeições, suplementos, aeróbico, água
```

## Três separações que sustentam o desenho

**Plano vs registro.** Plano é do profissional (read-mostly); registro é do aluno (write-heavy), sempre por dia. É o que torna o export de volta trivial.

**Aluno vs plano.** Perfil e medidas sobrevivem à troca de plano — trocar de nutricionista não pode apagar o histórico corporal. Tem teste próprio.

**Prescrito vs derivado.** Agenda do dia, carga sugerida, macros consumidos, aderência e sequência **nunca são persistidos** — são funções puras sobre plano + registros (ADR 0006).

## Nutrição

- Macros-alvo do dia: proteína, carboidrato, gordura.
- Refeições numeradas, com nome opcional (`Café da manhã`).
- Cada item tem **opções** que o aluno escolhe entre si, cada uma com alimento, quantidade e unidade.
- **Os macros ficam no item, não na opção.** O profissional escolhe as quantidades justamente para que as opções sejam equivalentes (`100 g de arroz` ⟷ `200 g de batata`). Escolher qual foi consumida registra o que o aluno comeu para o profissional ler — não altera a soma do dia.
- Hidratação diária e lista de vegetais sugeridos.

## Suplementação

Agrupados em fórmulas nomeadas pelo prescritor (Colesterol, Sono, Testosterona). Cada item tem nome, dose estruturada e posologia.

**Posologia é âncora temporal, não rótulo:**

```
{ tipo: 'apos-refeicao', refeicao: 1 }   → aparece grudado na Refeição 1
{ tipo: 'antes-do-treino' }              → aparece antes do treino do dia
{ tipo: 'livre' }                        → o aluno encaixa onde couber
```

É o que permite dissolver a lista de suplementos dentro da linha do tempo do dia, em vez de virar uma aba que o aluno nunca abre na hora de tomar. O agrupamento por fórmula continua existindo — na consulta ao plano, onde reflete o raciocínio clínico.

## Erros na linguagem de quem vai resolvê-los

`plano.treino.sessoes.0.itens.2.series` não diz nada a um treinador. `descreverProblema` traduz cada problema para:

| Campo            | Exemplo                                                   |
| ---------------- | --------------------------------------------------------- |
| `onde`           | `Treino A · Prancha Lateral (Lado esquerdo)`              |
| `oQue`           | `Séries`                                                  |
| `mensagem`       | `precisa ser maior que zero`                              |
| `caminhoTecnico` | `plano.treino.sessoes.0.itens.3.series` (recolhido na UI) |

A tela de erro serve a duas pessoas: o **aluno**, que não montou o arquivo e precisa saber que nada quebrou no aparelho dele — e tem um botão para passar o problema adiante; e o **profissional**, que vai corrigir e precisa saber exatamente onde.

Quando o arquivo está tão quebrado que nem os nomes existem, a localização cai para a posição (`Treino 2 · item 1`) em vez de sumir ou imprimir `undefined`. Isso tem testes próprios, porque é justamente aí que a mensagem mais importa.

## Versionamento

`schemaVersion` vive no manifest e no arquivo do plano. Migrações são funções puras em `domain/schema/migrations`, cada uma com teste. Versão desconhecida falha explicitamente.

**Versão atual: 2.** A versão 1 esteve publicada por menos de uma hora, sem nenhum usuário, e guardava a notação da planilha em vez do significado. Não foi escrita migração de 1 para 2: parte da conversão (separar `"2 fatias de pão integral"` em alimento, quantidade e unidade) só teria como ser adivinhada, e uma migração frágil para um formato sem nenhuma instância seria pior engenharia que a substituição. Um vault v1, se existisse, cai no estado vazio e é reimportado — sem corrupção.

## Formato de intercâmbio

Export gera um `.fitvault.json`: envelope com manifest e documentos, JSON indentado, legível em qualquer editor. Quando o navegador oferece a File System Access API, escreve numa pasta real; senão, baixa.

O import grava **o documento do profissional, não a leitura que fizemos dele** — o que está no disco é exatamente o que ele emitiu.

## Dado pessoal

O modelo carrega dado sensível de saúde. Repositório e Pages são públicos: nenhum dado real entra: fixtures são sintéticos (ADR 0005).
