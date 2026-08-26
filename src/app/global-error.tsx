'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <section
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#ffffff',
            padding: '24px',
          }}
        >
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                background: 'rgba(20,184,166,0.1)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 32,
                fontSize: 28,
              }}
            >
              ⚠️
            </div>
            <p
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#14B8A6',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Erro crítico
            </p>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: '#0f172a',
                marginBottom: 16,
                letterSpacing: '-0.02em',
              }}
            >
              A aplicação encontrou um problema
            </h1>
            <p style={{ fontSize: 16, color: '#64748b', lineHeight: 1.6, marginBottom: 32 }}>
              Não foi possível carregar a página. Tente novamente — se o erro continuar, entre em contato com o suporte.
            </p>
            <button
              onClick={() => reset()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '14px 24px',
                background: '#14B8A6',
                color: '#ffffff',
                fontWeight: 600,
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontSize: 15,
              }}
            >
              Tentar novamente
            </button>
          </div>
        </section>
      </body>
    </html>
  )
}
