import { Bricolage_Grotesque } from 'next/font/google'

/** Fonte dos títulos da landing (exposta como --font-display). */
export const fonteTitulos = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
})
