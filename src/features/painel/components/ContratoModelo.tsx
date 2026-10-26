'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, FileSignature } from 'lucide-react'
import { TermosDocumento } from '@/components/TermosDocumento'
import { CAMPOS_CONTRATO, DADOS_EXEMPLO, preencherContrato, type ContratoModelo as Modelo } from '@/lib/contratos'
import { publicarModeloContrato } from '../actions/contratos'

interface Props {
  escola: string
  modelo: Modelo | null
  podeEditar: boolean
}

const TEXTO_INICIAL = `**Contratante:** {{nome}}, CPF/CNH {{documento}}.

**Contratada:** {{autoescola}}.

## Cláusula 1 — Objeto
Prestação de serviços de formação de condutores, conforme as categorias contratadas.

## Cláusula 2 — Obrigações do aluno
- Comparecer às aulas nos horários agendados;
- Avisar com antecedência em caso de cancelamento ou reagendamento.

Data: {{data}}.`

export function ContratoModelo({ escola, modelo, podeEditar }: Props) {
  const [titulo, setTitulo] = useState(modelo?.titulo ?? 'Contrato de prestação de serviços')
  const [texto, setTexto] = useState(modelo?.texto ?? '')
  const [vigente, setVigente] = useState(modelo)
  const [isPending, startTransition] = useTransition()
  const [erro, setErro] = useState<string | null>(null)
  const [publicado, setPublicado] = useState(false)

  const alterado = titulo.trim() !== (vigente?.titulo ?? '') || texto.trim() !== (vigente?.texto ?? '')

  function publicar() {
    setErro(null)
    setPublicado(false)
    startTransition(async () => {
      const r = await publicarModeloContrato({ titulo, texto }, escola)
      if (!r.success) { setErro(r.error); return }
      setVigente(r.data)
      setPublicado(true)
    })
  }

  function inserir(chave: string) {
    setPublicado(false)
    setTexto((t) => `${t}${t && !t.endsWith(' ') && !t.endsWith('\n') ? ' ' : ''}{{${chave}}}`)
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[--p-accent]/10 flex items-center justify-center">
          <FileSignature className="w-5 h-5 text-[--p-accent]" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-[--p-text-1]">Modelo de contrato</h1>
          <p className="text-sm text-[--p-text-3]">
            {vigente ? `Versão ${vigente.versao} publicada` : 'Nenhuma versão publicada'} · é o texto enviado ao aluno para assinar
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-[--p-text-2] mb-1.5">Título</span>
            <input
              value={titulo}
              onChange={(e) => { setTitulo(e.target.value); setPublicado(false) }}
              disabled={!podeEditar}
              className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] focus:outline-none focus:ring-2 focus:ring-[--p-accent]/30"
            />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-[--p-text-2] mb-1.5">Texto do contrato</span>
            <textarea
              value={texto}
              onChange={(e) => { setTexto(e.target.value); setPublicado(false) }}
              disabled={!podeEditar}
              rows={18}
              placeholder="Escreva o contrato. Use # para título, ## para subtítulo, - para listas e **negrito**."
              className="w-full px-3 py-2.5 rounded-xl bg-[--p-bg-input] border border-[--p-border] text-sm text-[--p-text-1] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[--p-accent]/30"
            />
          </label>

          {podeEditar && !texto.trim() && (
            <button onClick={() => setTexto(TEXTO_INICIAL)} className="text-xs font-medium text-[--p-accent] hover:underline">
              Começar com um exemplo
            </button>
          )}

          <div>
            <p className="text-xs font-medium text-[--p-text-2] mb-1.5">Campos automáticos (preenchidos com os dados do aluno no envio)</p>
            <div className="flex flex-wrap gap-1.5">
              {CAMPOS_CONTRATO.map((c) => (
                <button
                  key={c.chave}
                  type="button"
                  title={c.descricao}
                  disabled={!podeEditar}
                  onClick={() => inserir(c.chave)}
                  className="px-2.5 py-1 text-xs font-mono rounded-lg border border-[--p-border] text-[--p-text-2] hover:text-[--p-accent] hover:bg-[--p-hover] disabled:opacity-50"
                >
                  {`{{${c.chave}}}`}
                </button>
              ))}
            </div>
          </div>

          {podeEditar && (
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={publicar}
                disabled={isPending || !alterado || !texto.trim()}
                className="px-5 py-2.5 rounded-xl bg-[--p-accent] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? 'Publicando…' : `Publicar versão ${(vigente?.versao ?? 0) + 1}`}
              </button>
              {publicado && (
                <span className="text-sm text-emerald-500 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Publicado!
                </span>
              )}
              {erro && <span className="text-sm text-red-400">{erro}</span>}
            </div>
          )}
          <p className="text-xs text-[--p-text-3]">
            Cada publicação cria uma nova versão. Contratos já enviados mantêm o texto que o aluno recebeu.
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-[--p-text-2] mb-1.5">Pré-visualização (com dados de exemplo)</p>
          <div className="rounded-2xl border border-[--p-border] bg-[--p-bg-card] p-5 max-h-[34rem] overflow-y-auto">
            <h2 className="text-lg font-bold text-[--p-text-1] mb-3">{titulo || 'Título do contrato'}</h2>
            {texto.trim() ? (
              <TermosDocumento texto={preencherContrato(texto, DADOS_EXEMPLO)} />
            ) : (
              <p className="text-sm text-[--p-text-3]">O texto aparece aqui enquanto você escreve.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
