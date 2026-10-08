// Placas de trânsito no padrão brasileiro (CTB), desenhadas em SVG.
// As placas que ficam nas estradas são desenhadas dentro do SVG (Estrada.tsx).

const VERMELHO = '#C8102E'

function Poste({ altura = 56 }: { altura?: number }) {
  return <div aria-hidden className="mx-auto w-[5px] rounded-b-sm bg-slate-400" style={{ height: altura }} />
}

/** R-1 "Parada obrigatória": octógono vermelho com borda branca. */
export function PlacaPare({ tamanho = 88, poste = true, className = '' }: { tamanho?: number; poste?: boolean; className?: string }) {
  return (
    <div className={className} aria-hidden>
      <svg width={tamanho} height={tamanho} viewBox="0 0 100 100" className="drop-shadow-[0_8px_16px_rgba(0,0,0,0.25)]">
        <polygon points="29.3,0 70.7,0 100,29.3 100,70.7 70.7,100 29.3,100 0,70.7 0,29.3" fill="#fff" />
        <polygon points="31.4,5 68.6,5 95,31.4 95,68.6 68.6,95 31.4,95 5,68.6 5,31.4" fill={VERMELHO} />
        <text x="50" y="61" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="27" fill="#fff" letterSpacing="1">
          PARE
        </text>
      </svg>
      {poste && <Poste />}
    </div>
  )
}
