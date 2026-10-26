import { TermosDocumento } from '@/components/TermosDocumento'
import type { ContratoComUrls } from '@/lib/contratos'

function dataHora(iso: string, soData = false) {
  return new Date(iso).toLocaleString('pt-BR', {
    dateStyle: 'long',
    ...(soData ? {} : { timeStyle: 'short' }),
    timeZone: 'America/Sao_Paulo',
  })
}

/**
 * Contrato (texto enviado ao aluno) + comprovação da assinatura: assinatura
 * desenhada, foto do rosto, data/hora, IP e aparelho. Usado no painel (página
 * de impressão) e no app do aluno.
 */
export function ContratoDocumento({ contrato }: { contrato: ContratoComUrls }) {
  const assinadoDigital = contrato.origem === 'digital' && contrato.status === 'assinado'

  return (
    <article className="space-y-6">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold text-[--p-text-1] tracking-tight">{contrato.titulo}</h1>
        {contrato.modelo_versao && <p className="text-xs text-[--p-text-3] mt-1">Modelo versão {contrato.modelo_versao}</p>}
      </header>

      {contrato.texto ? (
        <TermosDocumento texto={contrato.texto} />
      ) : (
        <p className="text-sm text-[--p-text-2]">Contrato assinado presencialmente na autoescola.</p>
      )}

      {contrato.status === 'assinado' && contrato.assinado_em && (
        <section className="rounded-2xl border border-[--p-border] bg-[--p-bg-card] p-5 space-y-4 break-inside-avoid">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[--p-text-3]">
            {assinadoDigital ? 'Assinatura digital' : 'Assinatura'}
          </h2>

          {assinadoDigital && (
            <div className="grid sm:grid-cols-2 gap-4">
              <figure>
                <div className="rounded-xl border border-[--p-border] bg-white h-36 flex items-center justify-center overflow-hidden">
                  {contrato.assinaturaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={contrato.assinaturaUrl} alt="Assinatura do aluno" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-slate-400">Indisponível</span>
                  )}
                </div>
                <figcaption className="text-xs text-[--p-text-3] mt-1.5">Assinatura</figcaption>
              </figure>
              <figure>
                <div className="rounded-xl border border-[--p-border] bg-[--p-bg-input] h-36 flex items-center justify-center overflow-hidden">
                  {contrato.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={contrato.fotoUrl} alt="Foto do aluno no momento da assinatura" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-[--p-text-3]">Indisponível</span>
                  )}
                </div>
                <figcaption className="text-xs text-[--p-text-3] mt-1.5">Foto no momento da assinatura</figcaption>
              </figure>
            </div>
          )}

          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-[--p-text-3]">Assinado em</dt>
            <dd className="text-[--p-text-1]">{dataHora(contrato.assinado_em, contrato.origem === 'anexado')}</dd>
            {assinadoDigital && contrato.ip && (
              <>
                <dt className="text-[--p-text-3]">IP</dt>
                <dd className="text-[--p-text-1] font-mono text-xs self-center">{contrato.ip}</dd>
              </>
            )}
            {assinadoDigital && contrato.user_agent && (
              <>
                <dt className="text-[--p-text-3]">Aparelho</dt>
                <dd className="text-[--p-text-2] text-xs break-all self-center">{contrato.user_agent}</dd>
              </>
            )}
            {assinadoDigital && contrato.texto_hash && (
              <>
                <dt className="text-[--p-text-3]">Código do texto</dt>
                <dd className="text-[--p-text-2] font-mono text-[11px] break-all self-center">{contrato.texto_hash}</dd>
              </>
            )}
          </dl>

          {contrato.origem === 'anexado' && contrato.anexoUrl && (
            <a href={contrato.anexoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex text-sm font-semibold text-[--p-accent] hover:underline print:hidden">
              Abrir contrato assinado ({contrato.anexoNome ?? 'arquivo'})
            </a>
          )}
        </section>
      )}
    </article>
  )
}
