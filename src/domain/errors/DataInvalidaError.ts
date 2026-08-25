import { ErroDeDominio } from './ErroDeDominio'

/**
 * Uma data de domínio não está em `AAAA-MM-DD` ou não existe no calendário.
 *
 * Datas atravessam o vault como texto (nomes de arquivo de registro e de
 * medida). Uma data malformada corromperia o índice do vault em silêncio, então
 * ela para aqui.
 */
export class DataInvalidaError extends ErroDeDominio {
  readonly codigo = 'DATA_INVALIDA'

  constructor(readonly valor: string) {
    super(`Data inválida ${JSON.stringify(valor)}: esperado AAAA-MM-DD`)
  }
}
