import { create } from 'zustand'
import { CarregarHistorico } from '../../application/CarregarHistorico'
import { RegistrarSerie, type SerieConcluida } from '../../application/RegistrarSerie'
import type { RegistroDiario } from '../../domain/registro/registroDiario'
import { vaultAtual } from './vaultStore'

export interface EstadoDoTreino {
  historico: readonly RegistroDiario[]
  hoje: RegistroDiario | null
  carregando: boolean
  carregar: (data: string) => Promise<void>
  registrar: (data: string, serie: SerieConcluida) => Promise<void>
}

/**
 * O histórico alimenta a sugestão de carga; o registro de hoje alimenta o que
 * já foi feito. Os dois vêm do mesmo vault, por casos de uso — a UI nunca fala
 * com o armazenamento.
 */
export const useTreino = create<EstadoDoTreino>((set, get) => ({
  historico: [],
  hoje: null,
  carregando: true,

  carregar: async (data: string) => {
    set({ carregando: true })
    const historico = await new CarregarHistorico(vaultAtual()).executar()
    set({
      historico,
      hoje: historico.find((r) => r.data === data) ?? null,
      carregando: false,
    })
  },

  registrar: async (data: string, serie: SerieConcluida) => {
    const atualizado = await new RegistrarSerie(vaultAtual()).executar(data, serie)

    // O registro do dia entra também no histórico em memória, para a sugestão
    // da próxima série já refletir o que acabou de ser levantado.
    const semHoje = get().historico.filter((r) => r.data !== data)
    set({ hoje: atualizado, historico: [...semHoje, atualizado] })
  },
}))
