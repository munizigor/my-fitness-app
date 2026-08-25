# PROBLEMA

## Causa-raiz

As pessoas e os programas de saúde desenham a solução para o sistema errado: apostam no eu reflexivo, consciente e disciplinado, quando quem decide na hora é o eu afetivo e automático, operando dentro de um ambiente projetado contra ele. **Não falta querer; falta design.**

Duas manifestações concretas:

1. **O aluno abandona porque não sente evolução.** O registro do que ele fez ou não existe, ou está numa planilha que ele não abre. Sem registro não há evidência; sem evidência não há sensação de progresso; sem sensação de progresso o eu afetivo desiste — e o eu reflexivo não está presente no momento da decisão para impedir.
2. **O profissional trabalha em planilha.** A prescrição é boa; o veículo é péssimo. A planilha é ótima para autoria e terrível para execução: mostra tudo de uma vez, exige interpretação, e não devolve nada ao profissional.

## POV

> **O aluno** precisa de **evidência de que está evoluindo, entregue no momento em que ele age** — porque a decisão de continuar é tomada pelo eu automático, sob esforço, e não por um eu reflexivo disposto a ir procurar prova de progresso numa planilha.

## Personas

**Aluno em execução.** Recebeu um plano do profissional. Está na academia, uma mão livre, celular no bolso, 60–70 s de descanso entre séries. Não quer decidir nada: quer saber o que fazer agora e registrar o que fez com o mínimo de atrito. Fora da academia, come 5 vezes ao dia seguindo um protocolo com alternativas, e toma suplementos ancorados em momentos ("após o café", "antes do treino").

**Profissional prescritor.** Nutricionista ou treinador com dezenas de alunos. Monta o plano numa planilha porque é o que existe. Não tem retorno estruturado do que o aluno de fato executou — o acompanhamento é por mensagem solta e memória do aluno. (Persona do Ciclo 2.)

## Restrições

- **LGPD / dado sensível de saúde.** O sistema lida com medidas corporais e medicamentos prescritos. Repositório e GitHub Pages são públicos: nenhum dado real entra no repo; fixtures são sintéticos.
- **Sem backend.** GitHub Pages serve arquivos estáticos. O intercâmbio profissional ↔ aluno no v0 é por arquivo, não por sincronização. "Acompanhamento em tempo real" não existe neste ciclo.
- **Offline-first.** A academia tem sinal ruim. Registrar série sem rede é requisito, não bônus.
- **Data ownership.** O dado é do aluno, em formato aberto e legível, sem lock-in — o usuário exporta e abre em qualquer editor. `localStorage` está descartado por decisão arquitetural (cota de ~5 MB, síncrono, e o Safari apaga após 7 dias de inatividade).

## Critérios de sucesso (outcomes, não outputs)

| Outcome                                                | Como se mede                                                                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| O aluno enxerga a própria evolução **sem ir procurar** | Um marco (recorde de carga, semana completa) aparece na tela inicial no momento em que acontece                    |
| O registro sobrevive ao mundo real                     | Registrar uma série offline, com uma mão, em menos de 5 s, e o dado persiste após recarregar                       |
| O profissional recebe o que hoje não recebe            | Export reimportável que reproduz integralmente o que o aluno executou                                              |
| O dado é mesmo do aluno                                | O arquivo exportado abre legível em qualquer editor de texto; trocar de profissional preserva o histórico corporal |

## O que este documento não cobre

Modelo de negócio, precificação, plano SEBRAE e estratégia de crescimento são contexto de produto, não requisito de software. Ficam em `docs/processo-negocio.md`.
