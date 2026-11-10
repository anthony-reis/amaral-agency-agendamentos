import type { MetadataRoute } from 'next'

// Necessário para instalar na tela de início (no iPhone, notificações só funcionam assim).
export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AmaralPro',
    short_name: 'AmaralPro',
    description: 'Agendamento de aulas da sua autoescola',
    start_url: '/',
    display: 'standalone',
    background_color: '#1d4a38',
    theme_color: '#1d4a38',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
