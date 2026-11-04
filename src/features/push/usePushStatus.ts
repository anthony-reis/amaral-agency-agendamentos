'use client'

import { useCallback, useEffect, useState } from 'react'
import { salvarInscricaoPush, removerInscricaoPush, enviarNotificacaoTeste } from './actions'

export const CHAVE_DISPENSA = 'amaralpro-push-dispensado'
export const CHAVE_DESLIGADO = 'amaralpro-push-desligado'

export type EstadoPush =
  | 'carregando'
  | 'nao-suportado'
  | 'instalar-ios'
  | 'sem-chave'
  | 'bloqueado'
  | 'pedir'
  | 'desativado'
  | 'ativado'
  | 'erro'

export type Plataforma = 'ios' | 'android' | 'desktop'

export interface ErroPush {
  titulo: string
  passos: string[]
}

function urlBase64ParaUint8(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function ler(chave: string): boolean {
  try { return !!localStorage.getItem(chave) } catch { return false }
}
function gravar(chave: string, ligado: boolean) {
  try { ligado ? localStorage.setItem(chave, '1') : localStorage.removeItem(chave) } catch {}
}

export function detectarPlataforma(): Plataforma {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'desktop'
}

/** Passos para liberar as notificações quando o navegador está bloqueando. */
export function passosDesbloqueio(p: Plataforma): string[] {
  if (p === 'ios') {
    return [
      'Abra Ajustes do iPhone e procure por "AmaralPro" (ou pelo nome do app instalado na tela de início).',
      'Toque em Notificações e ative "Permitir Notificações".',
      'Volte ao app e toque em "Verificar de novo".',
    ]
  }
  if (p === 'android') {
    return [
      'Toque no cadeado (ou nos três pontinhos) ao lado do endereço do site.',
      'Entre em Permissões (ou Configurações do site) → Notificações e escolha "Permitir".',
      'Se instalou o app na tela inicial: Ajustes do Android → Apps → AmaralPro → Notificações → ative.',
      'Volte aqui e toque em "Verificar de novo".',
    ]
  }
  return [
    'Clique no cadeado ao lado do endereço do site, no topo do navegador.',
    'Em "Notificações", troque para "Permitir".',
    'Recarregue a página (ou toque em "Verificar de novo").',
    'No Windows/macOS, confirme também que as notificações do navegador não estão silenciadas (Não Perturbe / Foco).',
  ]
}

/** Traduz a falha técnica em um motivo provável e o que fazer. */
export function explicarErro(e: unknown, p: Plataforma): ErroPush {
  const nome = e instanceof Error ? e.name : ''
  const msg = e instanceof Error ? e.message : String(e)

  if (/demorou|timeout/i.test(msg)) {
    return {
      titulo: 'O navegador demorou para ativar o serviço de notificações',
      passos: [
        'Feche o app/aba completamente e abra de novo.',
        'Confira se a internet está estável (evite VPN ou bloqueadores de anúncio neste site).',
        'Toque em "Tentar de novo".',
      ],
    }
  }
  if (/salvar este aparelho/i.test(msg)) {
    return {
      titulo: 'Seu aparelho permitiu, mas não conseguimos registrá-lo',
      passos: [
        'Sua sessão pode ter expirado: saia do app, entre novamente e ative de novo.',
        'Confira a conexão com a internet e toque em "Tentar de novo".',
      ],
    }
  }
  if (nome === 'NotAllowedError') {
    return {
      titulo: 'O navegador negou a permissão',
      passos: passosDesbloqueio(p),
    }
  }
  if (nome === 'AbortError' || /push service|registration failed|storage/i.test(msg)) {
    return {
      titulo: 'O serviço de push do navegador não respondeu',
      passos: [
        'Saia do modo anônimo/privado: nele o push não funciona.',
        'No Brave: abra brave://settings/privacy e ative "Usar o Google Services para mensagens push". Depois reinicie o navegador.',
        'No Android, o Chrome precisa do Google Play Services atualizado e com internet liberada em segundo plano.',
        'Desative VPN, DNS filtrado ou bloqueadores que impeçam conexão com o Google/Apple (push depende deles).',
        'Se nada resolver, apague os dados do site (cadeado → Configurações do site → Limpar dados) e ative de novo.',
      ],
    }
  }
  if (nome === 'InvalidStateError' || nome === 'SecurityError') {
    return {
      titulo: 'O navegador não deixou registrar as notificações neste site',
      passos: [
        'Abra o site pelo endereço seguro (https) e fora de janelas incorporadas.',
        'Limpe os dados do site (cadeado → Configurações do site → Limpar dados) e entre de novo.',
        'Atualize o navegador para a versão mais recente.',
      ],
    }
  }
  return {
    titulo: 'Não foi possível ativar as notificações',
    passos: [
      'Recarregue a página e toque em "Tentar de novo".',
      'Atualize o navegador para a versão mais recente.',
      p === 'ios' ? 'No iPhone, abra o app pelo ícone da tela de início (não pelo Safari) e use iOS 16.4 ou superior.' : 'Teste em outro navegador compatível (Chrome, Edge, Firefox ou Safari atualizado).',
      msg ? `Detalhe técnico: ${msg}` : '',
    ].filter(Boolean),
  }
}

async function inscreverAparelho(perfil: 'aluno' | 'instrutor', escola: string) {
  const reg = await navigator.serviceWorker.register('/sw.js')
  await Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, rej) => setTimeout(() => rej(new Error('O navegador demorou para ativar o serviço de notificações.')), 10000)),
  ])
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ParaUint8(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
    })
  }
  const j = sub.toJSON()
  const r = await salvarInscricaoPush(
    perfil, escola,
    { endpoint: sub.endpoint, p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '' },
    navigator.userAgent
  )
  if (!r.ok) throw new Error('Não foi possível salvar este aparelho.')
}

/** Estado das notificações push deste aparelho e as ações para mudá-lo. */
export function usePushStatus(perfil: 'aluno' | 'instrutor', escola: string) {
  const [estado, setEstado] = useState<EstadoPush>('carregando')
  const [erro, setErro] = useState<ErroPush | null>(null)
  const [plataforma, setPlataforma] = useState<Plataforma>('desktop')
  const [ocupado, setOcupado] = useState(false)
  const [teste, setTeste] = useState<'' | 'enviado' | 'nenhum' | 'falhou'>('')

  const verificar = useCallback(async () => {
    const plat = detectarPlataforma()
    setPlataforma(plat)
    const instalado = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
    if (plat === 'ios' && !instalado) return setEstado('instalar-ios')
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return setEstado('nao-suportado')
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return setEstado('sem-chave')
    if (Notification.permission === 'denied') return setEstado('bloqueado')
    if (Notification.permission === 'default') return setEstado('pedir')
    if (ler(CHAVE_DESLIGADO)) return setEstado('desativado')
    // permitido: confirma de ponta a ponta (assinatura no navegador + registro no servidor)
    try {
      await inscreverAparelho(perfil, escola)
      setErro(null)
      setEstado('ativado')
    } catch (e) {
      setErro(explicarErro(e, plat))
      setEstado('erro')
    }
  }, [perfil, escola])

  useEffect(() => { void verificar() }, [verificar])

  const ativar = useCallback(async () => {
    setOcupado(true)
    setTeste('')
    try {
      if (Notification.permission !== 'granted') {
        const perm = await Notification.requestPermission()
        if (perm === 'denied') return setEstado('bloqueado')
        if (perm !== 'granted') return setEstado('pedir')
      }
      gravar(CHAVE_DESLIGADO, false)
      await inscreverAparelho(perfil, escola)
      setErro(null)
      setEstado('ativado')
    } catch (e) {
      setErro(explicarErro(e, detectarPlataforma()))
      setEstado('erro')
    } finally {
      setOcupado(false)
    }
  }, [perfil, escola])

  const desativar = useCallback(async () => {
    setOcupado(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await removerInscricaoPush(perfil, escola, sub.endpoint)
        await sub.unsubscribe()
      }
      gravar(CHAVE_DESLIGADO, true)
      setTeste('')
      setEstado('desativado')
    } catch (e) {
      setErro(explicarErro(e, detectarPlataforma()))
      setEstado('erro')
    } finally {
      setOcupado(false)
    }
  }, [perfil, escola])

  const testar = useCallback(async () => {
    setOcupado(true)
    setTeste('')
    try {
      const { enviados } = await enviarNotificacaoTeste(perfil, escola)
      setTeste(enviados > 0 ? 'enviado' : 'nenhum')
    } catch {
      setTeste('falhou')
    } finally {
      setOcupado(false)
    }
  }, [perfil, escola])

  return { estado, erro, plataforma, ocupado, teste, ativar, desativar, testar, verificar }
}
