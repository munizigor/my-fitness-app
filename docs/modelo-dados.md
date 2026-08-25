# Modelo de dados

Derivado da planilha real usada por um profissional em atendimento. A planilha tem três abas; o modelo abaixo preserva os dados e descarta a organização (ver `interface.md`).

## Layout do vault

```
vault/manifest.json                      { schemaVersion, appVersion, criadoEm, atualizadoEm }
vault/aluno/perfil.json                  { nome, idade, altura, dataAvaliacao }
vault/aluno/medidas/<AAAA-MM-DD>.json    aferição datada (série temporal)
vault/planos/<id>.json                   { treino, nutricional, suplementacao, vigenteDe }
vault/registros/<AAAA-MM-DD>.json        séries, refeições, suplementos, aeróbico, água
```

## Três separações que sustentam o desenho

**Plano vs registro.** O plano é do profissional (read-mostly); o registro é do aluno (write-heavy), sempre por dia. É o que torna o export de volta ao profissional trivial: basta enviar os registros.

**Aluno vs plano.** Perfil e medidas sobrevivem à troca de plano. Trocar de nutricionista não pode apagar o histórico corporal do aluno. Isso é _data ownership_ na prática, não no marketing — e tem teste próprio.

**Prescrito vs derivado.** Agenda do dia, carga sugerida, macros consumidos, aderência e sequência **nunca são persistidos**. São funções puras sobre plano + registros (ADR 0006).

## Origem: treino

Da aba de assessoria esportiva.

- Agenda semanal em duas trilhas paralelas: musculação (Seg–A, Ter–B, Qua–C, Qui–DESCANSO, Sex–D, Sáb–E, Dom–DESCANSO) e aeróbico (20 min HIIT nos dias de treino).
- Sessões A–F, cada uma marcada `UPPER` ou `LOWER`, com `INTERVALO ENTRE SÉRIES E EXERCÍCIOS: 60 a 70 s`.
- Cada sessão é uma tabela `Exercícios | SxR | Técnica Avançada`.

**Regra de domínio: `SxR` não tem forma única.**

| Forma na planilha | Significado                         |
| ----------------- | ----------------------------------- |
| `3x10a12`         | 3 séries de 10 a 12 repetições      |
| `4x10a12`         | 4 séries de 10 a 12 repetições      |
| `2x60'`           | 2 séries de 60 segundos (isometria) |
| `3x60'`           | 3 séries de 60 segundos             |
| `2 cada lado`     | qualificador: repetir por lado      |

Isso pede um parser puro em `domain/treino`. Entrada desconhecida falha com erro tipado, nunca em silêncio.

`Técnica Avançada` é texto livre do profissional (`DESCER ATÉ O TALO`, `BARRA TOCAR NO CHÃO EM TODAS REPS`, `REMAR CORPO TOTALMENTE 90 GRAUS`) e fica sempre visível junto ao exercício durante a execução.

## Origem: nutrição

Da aba de planejamento nutricional.

- Macros-alvo do dia: proteína, carboidrato, gordura.
- Refeições 1 a 5.
- **Cada item de refeição é um conjunto de alternativas separadas por "OU"**, com macros próprios: `100 GRAMAS DE ARROZ OU 200 DE BATATA` → duas alternativas, um slot. Escolher a alternativa é a interação central da tela de dieta.
- Hidratação (4 L/dia) e lista de vegetais sugeridos.

## Origem: suplementos

Da aba de suplementos.

- Agrupados em fórmulas nomeadas pelo prescritor: Colesterol, Qualidade de Sono, Melhora de Testosterona, Saúde e Bem-Estar, Suplementos.
- Cada item tem nome, dose (`500 MG`), posologia e, às vezes, duração (`por 60 dias`).

**Regra de domínio: posologia é âncora temporal, não rótulo.** `após o café`, `antes do treino`, `após o jantar` mapeiam para pontos da linha do tempo do dia. É o que permite dissolver a aba de suplementos dentro de Hoje. O agrupamento por fórmula continua existindo — mas na consulta ao plano, onde reflete o raciocínio clínico do profissional.

## Origem: aluno

Da planilha, onde está espremido no cabeçalho da aba de nutrição. No modelo é agregado próprio.

- Identificação: nome, idade, data da avaliação.
- Medidas: peso, abdômen, cintura, peitoral/ombro, braços D/E, glúteos, pescoço, panturrilhas D/E, coxas D/E.
- **Medida é série temporal**, não campo de cadastro: cada aferição é ponto datado, e a evolução é a diferença entre pontos.
- **Altura é a exceção**: atributo estável do perfil, não aferição.

## Versionamento e migração

`schemaVersion` vive no manifest. Migrações são funções puras em `domain/schema/migrations`, cada uma com teste. Import de versão desconhecida falha explicitamente, nunca em silêncio.

## Formato de intercâmbio

Export gera um único `.fitvault.json`: envelope com o manifest e todos os documentos, JSON indentado, legível e editável em qualquer editor de texto. Quando o navegador oferece a File System Access API (Chrome/Edge), o export escreve numa pasta real escolhida pelo usuário; caso contrário, cai para download.

Se o arquivo exportado não abrir legível num editor qualquer, o posicionamento de _data ownership_ falhou.

## Dado pessoal

O modelo carrega dado sensível de saúde: medidas corporais e medicamentos prescritos. Repositório e GitHub Pages são públicos. Nenhum dado real entra no repo — fixtures são sintéticos (ADR 0005).
