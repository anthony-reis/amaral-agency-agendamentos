import type { MetadataRoute } from 'next'

// Necessário para instalar na tela de início (no iPhone, notificações só funcionam assim).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AmaralPro',
    short_name: 'AmaralPro',
    description: 'Agendamento de aulas da sua autoescola',
    start_url: '/',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [{ src: '/logo.png', sizes: 'any', type: 'image/png', purpose: 'any' }],
  }
}
