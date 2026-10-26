'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence } from 'framer-motion'
import { Camera, CheckCircle2, FileSignature, Loader2, PenLine, Printer, RotateCcw } from 'lucide-react'
import { ContratoDocumento } from '@/components/ContratoDocumento'
import { compressImage } from '@/lib/compressImage'
import type { ContratoComUrls } from '@/lib/contratos'
import { SignatureFullscreen } from '@/features/shared/components/SignatureFullscreen'
import { assinarContrato } from '../actions/contrato'

interface Props {
  escola: string
  contratos: ContratoComUrls[]
}

export function ContratoAluno({ escola, contratos }: Props) {
  const router = useRouter()
  const assinado = contratos.find((c) => c.status === 'assinado')
  const pendente = contratos.find((c) => c.status === 'pendente')

  const [aceite, setAceite] = useState(false)
  const [fotoFile, setFotoFile] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [processandoFoto, setProcessandoFoto] = useState(false)
  const [assinatura, setAssinatura] = useState<string | null>(null)
  const [desenhando, setDesenhando] = useState(false)
  const [erro, setErro] = useState('')
  const [isPending, startTransition] = useTransition()
  const previewRef = useRef<string | null>(null)

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current) }, [])

  async function onFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErro('')
    setProcessandoFoto(true)
    try {
      const comprimida = await compressImage(file)
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
      const url = URL.createObjectURL(comprimida)
      previewRef.current = url
      setFotoPreview(url)
      setFotoFile(comprimida)
    } catch {
      setErro('Não foi possível processar a foto. Tente novamente.')
    } finally {
      setProcessandoFoto(false)
    }
  }

  const podeAssinar = aceite && !!fotoFile && !!assinatura && !processandoFoto

  function assinar() {
    if (!pendente || !podeAssinar || !fotoFile || !assinatura) return
    setErro('')
    const fd = new FormData()
    fd.append('escola', escola)
    fd.append('contrato_id', pendente.id)
    fd.append('aceite', 'true')
    fd.append('foto', fotoFile)
    fd.append('assinatura', assinatura)
    startTransition(async () => {
      const r = await assinarContrato(fd)
      if (!r.success) { setErro(r.error); return }
      router.refresh()
    })
  }

  const moldura = 'max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-28 lg:pb-10 space-y-6'

  // ── Já assinado ──
  if (assinado) {
    return (
      <div className={moldura}>
        <div className="flex items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 text-emerald-500 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5" /> Contrato assinado
          </div>
          {assinado.origem === 'digital' && (
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border border-[--p-border] text-[--p-text-2] hover:bg-[--p-hover]">
              <Printer className="w-4 h-4" /> Imprimir / salvar PDF
            </button>
          )}
        </div>
        <ContratoDocumento contrato={assinado} />
      </div>
    )
  }

  // ── Nenhum contrato ──
  if (!pendente) {
    return (
      <div className={moldura}>
        <div className="text-center py-16 rounded-2xl border border-[--p-border] bg-[--p-bg-card]">
          <FileSignature className="w-10 h-10 text-[--p-text-3] mx-auto mb-3" />
          <p className="font-medium text-[--p-text-1]">Nenhum contrato para assinar</p>
          <p className="text-sm text-[--p-text-3] mt-1">Quando a autoescola enviar um contrato, ele aparece aqui.</p>
        </div>
      </div>
    )
  }

  // ── Para assinar ──
  return (
    <div className={moldura}>
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-[--p-text-1]">
        Leia o contrato com atenção. Para assinar, você vai marcar que concorda, <strong>tirar uma foto do seu rosto</strong> e <strong>assinar com o dedo</strong> na tela.
      </div>

      <div className="rounded-2xl border border-[--p-border] bg-[--p-bg-card] p-5 sm:p-7">
        <ContratoDocumento contrato={pendente} />
      </div>

      <section className="rounded-2xl border border-[--p-border] bg-[--p-bg-card] p-5 space-y-5">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} className="mt-1 w-5 h-5 accent-[#0ea5e9]" />
          <span className="text-sm text-[--p-text-1]">Li o contrato acima e concordo com os seus termos.</span>
        </label>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-[--p-text-2] mb-1.5">1. Foto do seu rosto *</p>
            {fotoPreview ? (
              <div className="relative h-40 rounded-xl overflow-hidden border border-[--p-border]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fotoPreview} alt="Sua foto" className="h-full w-full object-cover" />
                <label className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-black/60 text-white cursor-pointer">
                  <RotateCcw className="w-3.5 h-3.5" /> Refazer
                  <input type="file" accept="image/*" capture="user" className="sr-only" onChange={onFoto} />
                </label>
              </div>
            ) : (
              <label className="h-40 rounded-xl border-2 border-dashed border-[--p-border] flex flex-col items-center justify-center gap-2 text-sm text-[--p-text-2] hover:bg-[--p-hover] cursor-pointer">
                {processandoFoto ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                {processandoFoto ? 'Processando…' : 'Tirar foto'}
                <input type="file" accept="image/*" capture="user" className="sr-only" onChange={onFoto} />
              </label>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-[--p-text-2] mb-1.5">2. Sua assinatura *</p>
            {assinatura ? (
              <div className="relative h-40 rounded-xl border border-[--p-border] bg-white overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assinatura} alt="Sua assinatura" className="h-full w-full object-contain" />
                <button onClick={() => setDesenhando(true)} className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-black/60 text-white">
                  <RotateCcw className="w-3.5 h-3.5" /> Refazer
                </button>
              </div>
            ) : (
              <button onClick={() => setDesenhando(true)} className="w-full h-40 rounded-xl border-2 border-dashed border-[--p-border] flex flex-col items-center justify-center gap-2 text-sm text-[--p-text-2] hover:bg-[--p-hover]">
                <PenLine className="w-6 h-6" /> Assinar na tela
              </button>
            )}
          </div>
        </div>

        {erro && <p className="text-sm text-red-400">{erro}</p>}

        <button
          onClick={assinar}
          disabled={!podeAssinar || isPending}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0ea5e9] text-white font-semibold hover:bg-[#0284c7] disabled:opacity-50 transition-colors"
        >
          {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSignature className="w-5 h-5" />}
          Assinar contrato
        </button>
        {!podeAssinar && <p className="text-xs text-[--p-text-3] text-center">Marque a concordância, tire a foto e faça a assinatura para liberar o botão.</p>}
      </section>

      <AnimatePresence>
        {desenhando && (
          <SignatureFullscreen
            onConfirm={(url) => { setAssinatura(url); setDesenhando(false) }}
            onCancel={() => setDesenhando(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
