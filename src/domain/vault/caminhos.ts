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
} as const
