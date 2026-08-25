import { useEffect } from 'react'
import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { TelaEvolucao } from './evolucao/TelaEvolucao'
import { TelaHoje } from './hoje/TelaHoje'
import { TelaRefeicao } from './nutricao/TelaRefeicao'
import { TelaPerfil } from './perfil/TelaPerfil'
import { TelaPlano } from './plano/TelaPlano'
import { ExecucaoTreino } from './treino/ExecucaoTreino'
import { useVault } from './estado/vaultStore'

/**
 * Casca do app: as quatro rotas da arquitetura de informação (docs/interface.md).
 */
const ROTAS = [
  { caminho: '/hoje', chave: 'navegacao.hoje' },
  { caminho: '/evolucao', chave: 'navegacao.evolucao' },
  { caminho: '/perfil', chave: 'navegacao.perfil' },
  { caminho: '/plano', chave: 'navegacao.plano' },
] as const

export function App() {
  const { t } = useTranslation()
  const carregarDoVault = useVault((e) => e.carregarDoVault)

  useEffect(() => {
    void carregarDoVault()
  }, [carregarDoVault])

  return (
    <HashRouter>
      <div className="app">
        <main className="app__conteudo">
          <Routes>
            <Route path="/" element={<Navigate to="/hoje" replace />} />
            <Route path="/hoje" element={<TelaHoje />} />
            <Route path="/evolucao" element={<TelaEvolucao />} />
            {/* Perfil não passa por `DependeDoPlano`: lê `vault/aluno/`, que
                sobrevive à troca de plano — é a separação aluno vs plano. */}
            <Route path="/perfil" element={<TelaPerfil />} />
            <Route path="/treino" element={<ExecucaoTreino />} />
            <Route path="/refeicao/:refeicaoId" element={<TelaRefeicao />} />
            <Route path="/plano" element={<TelaPlano />} />
            <Route path="*" element={<Navigate to="/hoje" replace />} />
          </Routes>
        </main>

        <nav className="abas" aria-label={t('app.nome')}>
          {ROTAS.map(({ caminho, chave }) => (
            <NavLink
              key={caminho}
              to={caminho}
              className={({ isActive }) =>
                isActive ? 'abas__item abas__item--ativo' : 'abas__item'
              }
            >
              {t(chave)}
            </NavLink>
          ))}
        </nav>
      </div>
    </HashRouter>
  )
}
