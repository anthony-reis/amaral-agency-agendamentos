import { Fragment } from 'react'
import { parseTermos } from '@/lib/termos'

/** **negrito** → <strong>. Todo o resto vira texto (sem HTML da autoescola). */
function Inline({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') && p.length > 4 ? (
          <strong key={i} className="font-semibold text-[--p-text-1]">{p.slice(2, -2)}</strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  )
}

/** Renderiza o texto dos termos com títulos, listas e parágrafos. */
export function TermosDocumento({ texto }: { texto: string }) {
  const blocos = parseTermos(texto)

  return (
    <div className="space-y-4 text-[15px] leading-7 text-[--p-text-2] break-words">
      {blocos.map((b, i) => {
        switch (b.tipo) {
          case 'h1':
            return (
              <h2 key={i} className="text-lg sm:text-xl font-bold text-[--p-text-1] tracking-tight pt-4 first:pt-0">
                <Inline texto={b.texto} />
              </h2>
            )
          case 'h2':
            return (
              <h3 key={i} className="text-base font-semibold text-[--p-text-1] pt-2">
                <Inline texto={b.texto} />
              </h3>
            )
          case 'ul':
            return (
              <ul key={i} className="space-y-1.5 pl-1">
                {b.itens.map((item, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="mt-[11px] w-1.5 h-1.5 rounded-full bg-[--p-accent] shrink-0" />
                    <span className="min-w-0"><Inline texto={item} /></span>
                  </li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={i} className="space-y-1.5 pl-1">
                {b.itens.map((item, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="shrink-0 min-w-[1.5rem] text-sm font-semibold text-[--p-accent] tabular-nums">{j + 1}.</span>
                    <span className="min-w-0"><Inline texto={item} /></span>
                  </li>
                ))}
              </ol>
            )
          default:
            return (
              <p key={i}>
                <Inline texto={b.texto} />
              </p>
            )
        }
      })}
    </div>
  )
}
