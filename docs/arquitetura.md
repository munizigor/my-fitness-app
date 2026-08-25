# Arquitetura

## Visão geral

PWA estático, servido pelo GitHub Pages, sem backend. Todo o estado do aluno vive no aparelho, em OPFS. O intercâmbio com o profissional é por arquivo: o profissional envia um plano, o aluno importa, executa, registra e devolve um `.fitvault.json`.

```
┌────────────────────────────────────────────────────────┐
│  ui/          Hoje · ExecuçãoTreino · Evolução ·        │
│               Perfil · Plano          (React, i18n)     │
├────────────────────────────────────────────────────────┤
│  application/ casos de uso: ImportarPlano,              │
│               RegistrarSerie, RegistrarAgua,            │
│               RegistrarConsumo, RegistrarMedida,        │
│               SalvarPerfil, CarregarHistorico,          │
│               CarregarAluno, …                          │
├────────────────────────────────────────────────────────┤
│  domain/      regras puras + portas (interfaces)        │
└────────────────────────────────────────────────────────┘
                          ▲ implementa as portas
┌────────────────────────────────────────────────────────┐
│  infrastructure/  OpfsVaultStorage · FileSystemAccess   │
│                   InMemoryVaultStorage (testes) · PWA   │
└────────────────────────────────────────────────────────┘
```

Dependências apontam para dentro: `ui → application → domain`. `domain` não importa nada das outras camadas. A regra não depende de disciplina: está codificada em `eslint.config.js` como `no-restricted-imports` por diretório, e o lint quebra o build se alguém violar.

## Camadas

**`domain/`** — puro, sem I/O. Entidades, regras e cálculos derivados. Aqui vive o parser de prescrição (`3x10a12`, `2x60'`), a montagem da linha do tempo do dia, e todo o cálculo de progresso. Testável sem browser, sem mock, sem setup. Meta de cobertura: 95%.

**`domain/ports/`** — interfaces que o domínio precisa mas não implementa: `VaultStorage`, que guarda dentro, e `FileTransfer`, que entrega para fora. É a inversão que permite testar `application` sem tocar em OPFS nem abrir diálogo de sistema.

As duas portas são deliberadamente burras — texto em caminhos, texto num arquivo com nome. É o que garante que o conteúdo no disco seja **exatamente** o que o aluno recebe ao exportar: um motor que traduzisse para colunas próprias quebraria "arquivo acima do app".

**`application/`** — casos de uso que orquestram domínio e portas. Um caso de uso por intenção do aluno. Testado com `InMemoryVaultStorage`. Meta: 90%.

Três deles escrevem no **mesmo arquivo do dia** — séries, água e refeições — e por isso compartilham `registroDoDia.ts`: carregar o que já existe antes de mexer, ou registrar água apagaria o treino da manhã. Do lado da UI, o mesmo motivo faz existir um `registroStore` só: dois stores sobre o mesmo arquivo se sobrescreveriam.

Os documentos do aluno — perfil e medidas — têm caso de uso e store próprios (`CarregarAluno`, `RegistrarMedida`, `SalvarPerfil`, `alunoStore`). A separação em memória espelha a do disco (`vault/aluno/` vs `vault/planos/`) e é a mesma que faz o histórico do corpo sobreviver à troca de profissional. Também é por isso que a aba Perfil não passa pelo estado "sem plano" das demais: ela não lê o plano.

`CarregarAluno` lê o histórico **inteiro**, sem a janela de 90 dias de `CarregarHistorico`: aquela alimenta a sugestão de carga da próxima série, esta é a evidência de longo prazo — e são poucos arquivos por ano.

**`domain/progresso/`** não tem caso de uso próprio, e é de propósito: tudo ali é função pura sobre o que os outros já carregaram. A tela de Evolução e o recorde em Hoje leem `historico` e `medidas` dos stores que já existem, e derivam trajetória, delta e marco em memória. Um `CarregarProgresso` só acrescentaria uma leitura de disco para calcular o que já estava na mão.

Duas agregações convivem ali, com critérios opostos e ambos corretos: `sugerirCarga` casa pelo **item prescrito** (os dois lados da Prancha Lateral não podem se contaminar, porque a sugestão vai para o campo de um lado só), e `progressoPorExercicio` agrega pelo **exercício** (o supino do Treino A e o do Treino B são a mesma trajetória). É o motivo de o registro guardar o item, e não o exercício: dá para ir de um ao outro, mas não de volta.

**Importar, exportar e restaurar** são três casos de uso e um só caminho de entrada. `ExportarVault` lê o vault inteiro e o embrulha; `RestaurarVault` desembrulha de volta; `ImportarPlano` continua sendo o que aceita o arquivo do profissional. Quem decide qual dos dois roda é o campo `formato` do arquivo escolhido, e não o aluno: ele tem um arquivo na mão e um lugar para carregá-lo. O que os três compartilham é a garantia de validar o documento inteiro antes de escrever o primeiro byte — um arquivo pela metade não deixa o vault pela metade.

`ehCaminhoDoVault` (em `domain/vault/caminhos.ts`) é o que torna restaurar seguro: um envelope é conteúdo de fora, e um documento chamado `../../outra-coisa.json` sairia da pasta do aluno. A regra mora junto dos caminhos que descreve, e não em quem restaura.

**`domain/plano/`** também não tem caso de uso: `resumoDoPlano` e `prescricaoCompleta` são dois ângulos do arquivo que o `vaultStore` já carregou. `prescricaoCompleta` é a contrapartida de `montarDia` — lá o plano é fatiado no momento de agir, aqui é apresentado por inteiro para quem veio consultar — e é onde **todo join por id acontece**: agenda→treino, item→exercício, posologia→refeição. Se o JSX fizesse essas buscas, o formato do arquivo estaria espalhado por quatro componentes, e mudá-lo custaria quatro lugares para lembrar.

**`infrastructure/`** — as implementações concretas: OPFS, File System Access API, i18n, service worker. Verificada por Playwright em Chromium real, porque OPFS não existe em jsdom.

`SalvarArquivo` tem dois caminhos, na ordem que o ADR 0003 decidiu: pasta escolhida pelo aluno onde o navegador oferece File System Access, download em todo o resto. O primeiro não tem como ser exercitado por automação — nenhum driver responde ao diálogo do sistema —, então ele é o mais curto possível, e o E2E do round-trip remove a API na inicialização da página para rodar pelo segundo, que é o mesmo caminho do Firefox e do iOS.

**`ui/`** — React. Não contém regra de negócio: chama caso de uso e renderiza. Toda string sai do dicionário `pt-BR`.

## Persistência

Ver `modelo-dados.md` para o layout do vault e ADR 0002 para a escolha do motor.

Em resumo: um arquivo JSON por documento em OPFS, atrás da porta `VaultStorage`. `localStorage` só guarda preferência de UI — nunca dado do aluno (cota de ~5 MB, API síncrona, e o Safari apaga após 7 dias de inatividade).

## PWA e deploy

- `vite-plugin-pwa` com Workbox, `registerType: 'autoUpdate'`, precache do app shell.
- O vault **nunca** entra no cache do service worker: ele vive em OPFS, que tem outro ciclo de vida.
- `base: '/my-fitness-app/'` — o Pages serve sob o nome do repositório.
- `HashRouter` em vez de rotas de histórico (ADR 0004): o Pages não oferece fallback de rota no servidor.
- `navigator.storage.persist()` é pedido na inicialização, como primeira defesa contra despejo.

## Testes

| Camada           | Ferramenta                       | Meta          |
| ---------------- | -------------------------------- | ------------- |
| `domain`         | Vitest, unit puro                | 95%           |
| `application`    | Vitest + `InMemoryVaultStorage`  | 90%           |
| `infrastructure` | Playwright (Chromium real, OPFS) | integração    |
| `ui`             | Vitest + Testing Library         | componente    |
| fluxo do aluno   | Playwright, perfil de celular    | ponta a ponta |

O gate `npm run check` roda lint, formatação, tipos e testes com cobertura. Falha em qualquer um bloqueia o commit.
