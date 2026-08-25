/**
 * Os caminhos do vault, num lugar só.
 *
 * O caminho **é** o índice: um arquivo por dia nos registros e nas medidas
 * significa que listar um período é listar um prefixo, sem banco e sem índice
 * secundário (ADR 0002). Também é o que faz o vault exportado ser navegável
 * por quem abrir a pasta num explorador de arquivos.
 */
export const CAMINHOS = {
  manifest: 'vault/manifest.json',
  perfil: 'vault/aluno/perfil.json',
  planoAtual: 'vault/planos/atual.json',

  medidas: 'vault/aluno/medidas/',
  medida: (data: string) => `vault/aluno/medidas/${data}.json`,

  registros: 'vault/registros/',
  registro: (data: string) => `vault/registros/${data}.json`,

  planos: 'vault/planos/',
  raiz: 'vault/',
} as const

/** Um dia, exatamente como o caminho de uma medida ou de um registro o escreve. */
const DIA_JSON = /^\d{4}-\d{2}-\d{2}\.json$/

/**
 * Nome de arquivo sem travessia: letras, dígitos, hífen e um ponto só, o da
 * extensão. É o que barra `..` sem precisar normalizar caminho.
 */
const NOME_JSON = /^[a-z0-9][a-z0-9-]*\.json$/i

/**
 * Este caminho pode existir dentro do vault?
 *
 * A pergunta só ficou necessária quando o vault virou formato de intercâmbio:
 * restaurar um export é escrever caminhos que vieram de fora, e um documento
 * chamado `../../outra-coisa.json` sairia da pasta do aluno. A regra vive aqui,
 * junto dos caminhos que ela descreve, e não em quem restaura — quem escreve o
 * vault amanhã herda a defesa sem saber que ela existe.
 */
export function ehCaminhoDoVault(caminho: string): boolean {
  if (caminho === CAMINHOS.manifest) return true
  if (caminho === CAMINHOS.perfil) return true

  // Datados: o caminho é o índice, então nome livre aqui quebraria listar por
  // prefixo e ordenar por data — que é o histórico inteiro, sem banco.
  for (const prefixo of [CAMINHOS.medidas, CAMINHOS.registros]) {
    if (caminho.startsWith(prefixo)) return DIA_JSON.test(caminho.slice(prefixo.length))
  }

  // ADR 0003 prevê `vault/planos/<id>.json`; hoje só `atual` é escrito.
  if (caminho.startsWith(CAMINHOS.planos))
    return NOME_JSON.test(caminho.slice(CAMINHOS.planos.length))

  return false
}
