# CHANGELOG

## [Não lançado]

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
