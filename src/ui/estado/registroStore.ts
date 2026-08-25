import { create } from 'zustand'
import { CarregarHistorico } from '../../application/CarregarHistorico'
import { RegistrarAgua } from '../../application/RegistrarAgua'
import { RegistrarConsumo, type Consumo } from '../../application/RegistrarConsumo'
import { RegistrarSerie, type SerieConcluida } from '../../application/RegistrarSerie'
import type { RegistroDiario } from '../../domain/registro/registroDiario'
import { vaultAtual } from './vaultStore'

export interface EstadoDoRegistro {
  historico: readonly RegistroDiario[]
  hoje: RegistroDiario | null
  carregando: boolean
  carregar: (data: string) => Promise<void>
  registrarSerie: (data: string, serie: SerieConcluida) => Promise<void>
  registrarAgua: (data: string, litros: number) => Promise<void>
  registrarConsumo: (data: string, consumo: Consumo) => Promise<void>
}

/**
 * O registro do dia, que três telas escrevem: séries no modo execução, água no
 * cabeçalho de Hoje, refeições nos cartões. É um arquivo só por dia, então é
 * um store só — dois stores sobre o mesmo arquivo se sobrescreveriam.
 *
 * O histórico alimenta a sugestão de carga. Tudo vem do vault por casos de
 * uso; a UI nunca fala com o armazenamento.
 */
export const useRegistro = create<EstadoDoRegistro>((set, get) => ({
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

  registrarSerie: async (data: string, serie: SerieConcluida) => {
    aplicar(set, get, data, await new RegistrarSerie(vaultAtual()).executar(data, serie))
  },

  registrarAgua: async (data: string, litros: number) => {
    aplicar(set, get, data, await new RegistrarAgua(vaultAtual()).executar(data, litros))
  },

  registrarConsumo: async (data: string, consumo: Consumo) => {
    aplicar(set, get, data, await new RegistrarConsumo(vaultAtual()).executar(data, consumo))
  },
}))

type Set = (parcial: Partial<EstadoDoRegistro>) => void
type Get = () => EstadoDoRegistro

/**
 * O registro do dia entra também no histórico em memória, para a sugestão da
 * próxima série já refletir o que acabou de ser levantado.
 */
function aplicar(set: Set, get: Get, data: string, atualizado: RegistroDiario): void {
  const semHoje = get().historico.filter((r) => r.data !== data)
  set({ hoje: atualizado, historico: [...semHoje, atualizado] })
}
