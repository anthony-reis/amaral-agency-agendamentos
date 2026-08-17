'use client'

import { useState, useTransition } from 'react'
import { AlertTriangle, Check, Copy, CreditCard, ShieldCheck } from 'lucide-react'
import {
  salvarCredenciaisMP,
  type CredenciaisMPMascaradas,
} from '../actions/pagamentos'

interface Props {
  autoescola_id: string
  credenciais: CredenciaisMPMascaradas
  webhookUrl: string
}

export function PagamentosMPForm({ autoescola_id, credenciais: initial, webhookUrl }: Props) {
  const [cred, setCred] = useState(initial)
  const [accessToken, setAccessToken] = useState('')
  const [publicKey, setPublicKey] = useState(initial.mp_public_key ?? '')
  const [webhookSecret, setWebhookSecret] = useState('')
  const [ativo, setAtivo] = useState(initial.configurado ? initial.ativo : true)
  const [sandbox, setSandbox] = useState(initial.configurado ? initial.sandbox : true)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaved(false)
    startTransition(async () => {
      const result = await salvarCredenciaisMP(autoescola_id, {
        mp_access_token: accessToken || undefined,
        mp_public_key: publicKey,
        mp_webhook_secret: webhookSecret || undefined,
        ativo,
        sandbox,
      })
      if (!result.success) { setError(result.error); return }
      setCred(result.data)
      setAccessToken('')
      setWebhookSecret('')
      setSaved(true)
    })
  }

  function copyWebhookUrl() {
    navigator.clipboard.writeText(webhookUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cred.configurado ? 'bg-emerald-50' : 'bg-slate-100'}`}>
            <ShieldCheck className={`w-5 h-5 ${cred.configurado ? 'text-emerald-600' : 'text-slate-400'}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">
              {cred.configurado ? 'Mercado Pago configurado' : 'Não configurado'}
            </p>
            <p className="text-xs text-slate-500">
              {cred.configurado
                ? `Token •••• ${cred.token_ultimos4} · ${cred.sandbox ? 'Sandbox (teste)' : 'Produção'} · ${cred.ativo ? 'Ativo' : 'Desativado'}`
                : 'Cadastre as credenciais da conta Mercado Pago da autoescola.'}
            </p>
          </div>
        </div>
      </div>

      {/* Checklist de onboarding — Pix */}
      <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Antes de ativar: confirme a chave Pix</p>
            <p className="text-xs text-amber-700 mt-1">
              A opção de Pix só aparece no checkout se a conta Mercado Pago da autoescola tiver uma
              chave Pix cadastrada. Isso é configurado direto no painel do Mercado Pago dela (Seu
              negócio → Pix), não tem como habilitar por aqui. Confirme com a autoescola antes de
              marcar &quot;Pagamentos ativos&quot;.
            </p>
          </div>
        </div>
      </div>

      {/* URL do webhook */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-sm font-semibold text-slate-800 mb-1">URL do webhook</p>
        <p className="text-xs text-slate-500 mb-3">
          Configure esta URL na aplicação do Mercado Pago (evento: Pagamentos) para gerar o webhook secret.
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-slate-700 break-all">
            {webhookUrl}
          </code>
          <button
            type="button"
            onClick={copyWebhookUrl}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-500 hover:text-brand-teal hover:border-brand-teal transition-colors shrink-0"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="w-4 h-4 text-brand-teal" />
          <h2 className="font-semibold text-slate-800 text-sm">Credenciais</h2>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Access Token {cred.configurado && <span className="text-slate-400">(deixe vazio para manter o atual)</span>}
          </label>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder={cred.configurado ? `•••• ${cred.token_ultimos4}` : 'APP_USR-... ou TEST-...'}
            autoComplete="off"
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-teal/40"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">Public Key</label>
          <input
            type="text"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="APP_USR-... ou TEST-..."
            autoComplete="off"
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-teal/40"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Webhook Secret {cred.configurado && cred.secret_configurado && <span className="text-slate-400">(deixe vazio para manter o atual)</span>}
          </label>
          <input
            type="password"
            value={webhookSecret}
            onChange={(e) => setWebhookSecret(e.target.value)}
            placeholder={cred.secret_configurado ? 'configurado ✓' : 'assinatura secreta do webhook'}
            autoComplete="off"
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-teal/40"
          />
        </div>

        <div className="flex items-center gap-6 pt-1">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="rounded" />
            Pagamentos ativos
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" checked={sandbox} onChange={(e) => setSandbox(e.target.checked)} className="rounded" />
            Sandbox (teste)
          </label>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
        {saved && <p className="text-sm text-emerald-600">Credenciais salvas.</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 rounded-xl bg-brand-teal text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? 'Salvando...' : 'Salvar credenciais'}
        </button>
      </form>
    </div>
  )
}
