'use client'

import { AlertTriangle, Bell, BellOff, BellRing, CheckCircle2, Loader2, Share, Smartphone } from 'lucide-react'
import { passosDesbloqueio, usePushStatus } from './usePushStatus'

function Passos({ itens }: { itens: string[] }) {
  return (
    <ol className="mt-2 space-y-1.5 text-xs text-[--p-text-2] list-decimal pl-4 break-words">
      {itens.map((p, i) => <li key={i}>{p}</li>)}
    </ol>
  )
}

const BTN = 'px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50 transition-colors'
const BTN_PRIMARIO = `${BTN} text-white bg-sky-500 hover:bg-sky-400`
const BTN_SECUNDARIO = `${BTN} text-[--p-text-1] border border-[--p-border] hover:bg-[--p-hover]`

/** Cartão fixo da aba Notificações: mostra se o push está ativo neste aparelho e como resolver quando não está. */
export function StatusNotificacoes({ perfil, escola }: { perfil: 'aluno' | 'instrutor'; escola: string }) {
  const { estado, erro, plataforma, ocupado, teste, ativar, desativar, testar, verificar } = usePushStatus(perfil, escola)

  let Icone = Bell
  let cor = 'bg-sky-500/10 text-sky-400'
  let titulo = 'Notificações'
  let corpo: React.ReactNode = null

  switch (estado) {
    case 'carregando':
      titulo = 'Verificando este aparelho…'
      corpo = <Loader2 className="w-4 h-4 animate-spin text-[--p-text-3] mt-2" />
      break
    case 'ativado':
      Icone = CheckCircle2; cor = 'bg-emerald-500/10 text-emerald-400'
      titulo = 'Notificações ativadas neste aparelho'
      corpo = (
        <>
          <p className="text-xs text-[--p-text-2] mt-0.5">Você recebe os avisos mesmo com o app fechado.</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" onClick={testar} disabled={ocupado} className={BTN_SECUNDARIO}>
              {ocupado ? 'Enviando…' : 'Enviar notificação de teste'}
            </button>
            <button type="button" onClick={desativar} disabled={ocupado} className={BTN_SECUNDARIO}>Desativar neste aparelho</button>
          </div>
          {teste === 'enviado' && <p className="text-xs text-emerald-400 mt-2">Teste enviado. Deve chegar em instantes.</p>}
          {teste === 'nenhum' && (
            <p className="text-xs text-amber-400 mt-2">
              O servidor não conseguiu entregar o teste. Toque em &ldquo;Desativar&rdquo; e ative de novo para registrar o aparelho outra vez.
            </p>
          )}
          {teste === 'falhou' && <p className="text-xs text-red-400 mt-2">Não foi possível enviar o teste agora. Tente novamente.</p>}
        </>
      )
      break
    case 'desativado':
      Icone = BellOff; cor = 'bg-zinc-500/10 text-zinc-400'
      titulo = 'Notificações desativadas neste aparelho'
      corpo = (
        <>
          <p className="text-xs text-[--p-text-2] mt-0.5">Você ainda vê tudo aqui na aba, mas não é avisado com o app fechado.</p>
          <button type="button" onClick={ativar} disabled={ocupado} className={`${BTN_PRIMARIO} mt-3`}>
            {ocupado ? 'Ativando…' : 'Ativar notificações'}
          </button>
        </>
      )
      break
    case 'pedir':
      Icone = BellRing
      titulo = 'Ative as notificações'
      corpo = (
        <>
          <p className="text-xs text-[--p-text-2] mt-0.5">Saiba de aulas marcadas, desmarcadas ou remarcadas mesmo com o app fechado.</p>
          <button type="button" onClick={ativar} disabled={ocupado} className={`${BTN_PRIMARIO} mt-3`}>
            {ocupado ? 'Ativando…' : 'Ativar notificações'}
          </button>
        </>
      )
      break
    case 'bloqueado':
      Icone = BellOff; cor = 'bg-red-500/10 text-red-400'
      titulo = 'Notificações bloqueadas pelo navegador'
      corpo = (
        <>
          <p className="text-xs text-[--p-text-2] mt-0.5">Só você pode liberar. Faça o seguinte:</p>
          <Passos itens={passosDesbloqueio(plataforma)} />
          <button type="button" onClick={verificar} className={`${BTN_SECUNDARIO} mt-3`}>Verificar de novo</button>
        </>
      )
      break
    case 'instalar-ios':
      Icone = Share
      titulo = 'Instale o app para receber avisos no iPhone'
      corpo = (
        <Passos itens={[
          'No Safari, toque em Compartilhar.',
          'Escolha "Adicionar à Tela de Início".',
          'Abra o app pelo ícone novo e volte a esta aba para ativar. Requer iOS 16.4 ou superior.',
        ]} />
      )
      break
    case 'nao-suportado':
      Icone = Smartphone; cor = 'bg-amber-500/10 text-amber-400'
      titulo = 'Este navegador não suporta notificações'
      corpo = (
        <Passos itens={[
          'Use o Chrome, Edge, Firefox ou Safari atualizado.',
          'Janelas anônimas/privadas e navegadores embutidos (de apps como Instagram ou WhatsApp) não funcionam: abra o link no navegador normal.',
          'Você continua vendo todos os avisos aqui nesta aba.',
        ]} />
      )
      break
    case 'sem-chave':
      Icone = AlertTriangle; cor = 'bg-amber-500/10 text-amber-400'
      titulo = 'Notificações indisponíveis no momento'
      corpo = <p className="text-xs text-[--p-text-2] mt-0.5">O serviço ainda não foi configurado pela escola. Avise o suporte; os avisos continuam aparecendo nesta aba.</p>
      break
    case 'erro':
      Icone = AlertTriangle; cor = 'bg-red-500/10 text-red-400'
      titulo = erro?.titulo ?? 'Não foi possível ativar'
      corpo = (
        <>
          <p className="text-xs text-[--p-text-2] mt-0.5">Tente isto, na ordem:</p>
          {erro && <Passos itens={erro.passos} />}
          <button type="button" onClick={ativar} disabled={ocupado} className={`${BTN_PRIMARIO} mt-3`}>
            {ocupado ? 'Tentando…' : 'Tentar de novo'}
          </button>
        </>
      )
      break
  }

  return (
    <div className="rounded-2xl border border-[--p-border] bg-[--p-bg-card] p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cor}`}>
        <Icone className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-[--p-text-1]">{titulo}</p>
        {corpo}
      </div>
    </div>
  )
}
