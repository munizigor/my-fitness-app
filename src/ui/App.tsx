import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { EstadoSemPlano } from './comum/EstadoSemPlano'

/**
 * Casca do app: as quatro rotas da arquitetura de informação (docs/interface.md).
 * Sem plano importado, todas caem no mesmo estado vazio — é o que o aluno vê
 * antes de receber a prescrição do profissional.
 */
const ROTAS = [
  { caminho: '/hoje', chave: 'navegacao.hoje' },
  { caminho: '/evolucao', chave: 'navegacao.evolucao' },
  { caminho: '/perfil', chave: 'navegacao.perfil' },
  { caminho: '/plano', chave: 'navegacao.plano' },
] as const

export function App() {
  const { t } = useTranslation()

  return (
    <HashRouter>
      <div className="app">
        <main className="app__conteudo">
          <Routes>
            <Route path="/" element={<Navigate to="/hoje" replace />} />
            {ROTAS.map(({ caminho }) => (
              <Route key={caminho} path={caminho} element={<EstadoSemPlano />} />
            ))}
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
