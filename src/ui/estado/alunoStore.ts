import { create } from 'zustand'
import { CarregarAluno } from '../../application/CarregarAluno'
import { RegistrarMedida } from '../../application/RegistrarMedida'
import { SalvarPerfil } from '../../application/SalvarPerfil'
import { ordenarMedidas } from '../../domain/aluno/historicoDeMedidas'
import type { Medida, ValoresAferidos } from '../../domain/aluno/medida'
import type { Perfil } from '../../domain/aluno/perfil'
import { vaultAtual } from './vaultStore'

export interface EstadoDoAluno {
  perfil: Perfil | null
  medidas: readonly Medida[]
  carregando: boolean
  carregar: () => Promise<void>
  registrarMedida: (data: string, valores: ValoresAferidos) => Promise<void>
  salvarPerfil: (valores: unknown) => Promise<void>
}

/**
 * O aluno e o histórico do corpo dele.
 *
 * Store separado do vault e do registro diário de propósito: são os documentos
 * que **sobrevivem à troca de plano**, e a separação em memória espelha a
 * separação no disco (`vault/aluno/` vs `vault/planos/`).
 */
export const useAluno = create<EstadoDoAluno>((set, get) => ({
  perfil: null,
  medidas: [],
  carregando: true,

  carregar: async () => {
    set({ carregando: true })
    const { perfil, medidas } = await new CarregarAluno(vaultAtual()).executar()
    set({ perfil, medidas, carregando: false })
  },

  registrarMedida: async (data: string, valores: ValoresAferidos) => {
    const medida = await new RegistrarMedida(vaultAtual()).executar(data, valores)
    // A aferição do dia substitui a daquele dia — nunca as outras. É a mesma
    // regra do arquivo no vault, refletida em memória para a tela não precisar
    // reler o histórico inteiro.
    const outras = get().medidas.filter((m) => m.data !== medida.data)
    set({ medidas: ordenarMedidas([...outras, medida]) })
  },

  salvarPerfil: async (valores: unknown) => {
    set({ perfil: await new SalvarPerfil(vaultAtual()).executar(valores) })
  },
}))
