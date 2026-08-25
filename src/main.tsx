import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './infrastructure/i18n'
import { App } from './ui/App'
import './ui/estilos/global.css'

// OPFS pode ser despejado pelo navegador após período de inatividade
// (Safari: 7 dias). Pedir persistência é a primeira defesa; a segunda é o
// convite explícito a exportar o vault. Ver ADR 0002.
void navigator.storage?.persist?.()

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Elemento #root não encontrado')

createRoot(raiz).render(
  <StrictMode>
    <App />
  </StrictMode>
)
