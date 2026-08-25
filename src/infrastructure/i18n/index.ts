import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { ptBR } from './pt-BR'

export const IDIOMA_PADRAO = 'pt-BR'

void i18n.use(initReactI18next).init({
  resources: { 'pt-BR': { translation: ptBR } },
  lng: IDIOMA_PADRAO,
  fallbackLng: IDIOMA_PADRAO,
  interpolation: { escapeValue: false },
})

export default i18n
