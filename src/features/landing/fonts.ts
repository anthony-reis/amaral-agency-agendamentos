import { Plus_Jakarta_Sans } from 'next/font/google'

/** Fonte da landing (títulos e texto), exposta como --font-landing. */
export const fonteLanding = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-landing',
  display: 'swap',
})
