'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { bloqueioFeature } from '@/lib/features.server'
import { bloqueioArea } from '@/lib/permissoes.server'
import { enviarArquivoAnexo, removerArquivoAnexo } from '@/lib/anexosAluno.server'
import { comUrls, getModeloVigente, hashTexto, removerEvidenciasContrato } from '@/lib/contratos.server'
import { preencherContrato, type ContratoAluno, type ContratoComUrls, type ContratoModelo } from '@/lib/contratos'
import { assertPodeEditar, getCurrentUsername, getPainelAutoescolaId } from './authPainel'
import type { ActionResult } from '../types'

const LIMITE_TEXTO = 100_000

function formatarDoc(doc: string) {
  return doc.length === 11 ? doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : doc
}

/** Sessão da escola + módulo ligado + permissão na área. Erro ou null. */
async function bloqueio(autoescola_id: string, area: 'cadastros' | 'sistema', nivel: 'ver' | 'editar'): Promise<string | null> {
  const erroArea = await bloqueioArea(area, nivel)
  if (erroArea) return erroArea
  if ((await getPainelAutoescolaId()) !== autoescola_id) return 'Sessão inválida.'
  return bloqueioFeature(autoescola_id, 'contratos')
}

async function logContrato(autoescola_id: string, descricao: string, metadata?: Record<string, unknown>) {
  const supabase = createServiceClient()
  await supabase.from('activity_logs_painel').insert({
    username: await getCurrentUsername(),
    action_type: 'contrato',
    description: descricao,
    metadata: metadata ?? null,
    autoescola_id,
  })
}

// ─── Modelo (Sistema → Contrato) ─────────────────────────────────────────────

/** Publica uma nova versão do modelo; as anteriores ficam guardadas. */
export async function publicarModeloContrato(
  input: { titulo: string; texto: string },
  escola: string
): Promise<ActionResult<ContratoModelo>> {
  const autoescola_id = await getPainelAutoescolaId()
  if (!autoescola_id) return { success: false, error: 'Sessão expirada.' }
  const erro = await bloqueio(autoescola_id, 'sistema', 'editar')
  if (erro) return { success: false, error: erro }

  const titulo = input.titulo.trim()
  const texto = input.texto.trim()
  if (!titulo) return { success: false, error: 'Informe o título do contrato.' }
  if (!texto) return { success: false, error: 'Escreva o texto do contrato.' }
  if (texto.length > LIMITE_TEXTO) return { success: false, error: 'Texto muito longo (máx. 100 mil caracteres).' }

  const atual = await getModeloVigente(autoescola_id)
  if (atual && atual.titulo === titulo && atual.texto === texto) {
    return { success: false, error: 'Nenhuma alteração para publicar.' }
  }

  const supabase = createServiceClient()
  const versao = (atual?.versao ?? 0) + 1
  const { data, error } = await supabase
    .from('contrato_modelos')
    .insert({ autoescola_id, versao, titulo, texto, publicado_por: await getCurrentUsername() })
    .select('*')
    .single()
  if (error || !data) return { success: false, error: 'Não foi possível publicar. Recarregue a página e tente novamente.' }

  await logContrato(autoescola_id, `Modelo de contrato publicado (versão ${versao}): ${titulo}`, { versao })
  revalidatePath(`/${escola}/painel/contrato`)
  return { success: true, data: data as ContratoModelo }
}

// ─── Contratos do aluno ──────────────────────────────────────────────────────

export interface ContratosDoAluno {
  contratos: ContratoComUrls[]
  /** Existe modelo publicado (sem ele não dá para enviar). */
  temModelo: boolean
}

export async function listarContratosAluno(autoescola_id: string, student_id: string): Promise<ActionResult<ContratosDoAluno>> {
  const erro = await bloqueio(autoescola_id, 'cadastros', 'ver')
  if (erro) return { success: false, error: erro }

  const supabase = createServiceClient()
  const [{ data }, modelo] = await Promise.all([
    supabase
      .from('contratos_aluno')
      .select('*')
      .eq('autoescola_id', autoescola_id)
      .eq('student_id', student_id)
      .order('created_at', { ascending: false }),
    getModeloVigente(autoescola_id),
  ])
  return { success: true, data: { contratos: await comUrls(supabase, (data ?? []) as ContratoAluno[]), temModelo: !!modelo } }
}

/** Mapa aluno → situação do contrato, para o selo na tabela de alunos. */
export async function statusContratosPorAluno(autoescola_id: string): Promise<Record<string, 'pendente' | 'assinado'>> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('contratos_aluno')
    .select('student_id, status')
    .eq('autoescola_id', autoescola_id)
    .in('status', ['pendente', 'assinado'])
  const mapa: Record<string, 'pendente' | 'assinado'> = {}
  for (const { student_id, status } of data ?? []) {
    // assinado vence pendente
    if (status === 'assinado' || !mapa[student_id]) mapa[student_id] = status as 'pendente' | 'assinado'
  }
  return mapa
}

/** Envia o contrato (texto do modelo vigente, já com os dados do aluno) para ele assinar no app. */
export async function enviarContratoAluno(autoescola_id: string, student_id: string): Promise<ActionResult<null>> {
  const erro = await bloqueio(autoescola_id, 'cadastros', 'editar')
  if (erro) return { success: false, error: erro }

  const modelo = await getModeloVigente(autoescola_id)
  if (!modelo) return { success: false, error: 'Publique o modelo de contrato em Sistema → Contrato antes de enviar.' }

  const supabase = createServiceClient()
  const [{ data: aluno }, { data: escola }, { data: abertos }] = await Promise.all([
    supabase.from('students').select('name, document_id, phone, email').eq('id', student_id).eq('autoescola_id', autoescola_id).maybeSingle(),
    supabase.from('autoescolas').select('nome').eq('id', autoescola_id).maybeSingle(),
    supabase.from('contratos_aluno').select('id, status').eq('autoescola_id', autoescola_id).eq('student_id', student_id).in('status', ['pendente', 'assinado']),
  ])
  if (!aluno) return { success: false, error: 'Aluno não encontrado.' }
  if (abertos?.some((c) => c.status === 'assinado')) return { success: false, error: 'Este aluno já tem contrato assinado.' }
  if (abertos?.some((c) => c.status === 'pendente')) return { success: false, error: 'Já existe um contrato aguardando a assinatura deste aluno.' }

  const texto = preencherContrato(modelo.texto, {
    nome: aluno.name,
    documento: formatarDoc(aluno.document_id),
    telefone: aluno.phone ?? '',
    email: aluno.email ?? '',
    data: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    autoescola: escola?.nome ?? '',
  })

  const usuario = await getCurrentUsername()
  const { error } = await supabase.from('contratos_aluno').insert({
    autoescola_id,
    student_id,
    origem: 'digital',
    status: 'pendente',
    titulo: modelo.titulo,
    texto,
    texto_hash: hashTexto(texto),
    modelo_versao: modelo.versao,
    enviado_por: usuario,
  })
  if (error) return { success: false, error: 'Não foi possível enviar o contrato.' }

  await logContrato(autoescola_id, `Contrato enviado para assinatura: ${aluno.name} (Doc: ${aluno.document_id}) — modelo versão ${modelo.versao}`, { student_id })
  return { success: true, data: null }
}

/** Contrato assinado no papel: anexa o arquivo e registra como assinado. */
export async function anexarContratoAssinado(
  autoescola_id: string,
  student_id: string,
  formData: FormData
): Promise<ActionResult<null>> {
  const erro = await bloqueio(autoescola_id, 'cadastros', 'editar')
  if (erro) return { success: false, error: erro }

  const supabase = createServiceClient()
  const { data: aluno } = await supabase.from('students').select('name, document_id').eq('id', student_id).eq('autoescola_id', autoescola_id).maybeSingle()
  if (!aluno) return { success: false, error: 'Aluno não encontrado.' }

  const { data: assinado } = await supabase.from('contratos_aluno').select('id').eq('autoescola_id', autoescola_id).eq('student_id', student_id).eq('status', 'assinado').limit(1)
  if (assinado && assinado.length > 0) return { success: false, error: 'Este aluno já tem contrato assinado.' }

  const up = await enviarArquivoAnexo(supabase, autoescola_id, student_id, formData.get('arquivo'))
  if (!up.ok) return { success: false, error: up.error }

  const usuario = await getCurrentUsername()
  const { data: anexo, error: eAnexo } = await supabase
    .from('aluno_anexos')
    .insert({ autoescola_id, student_id, tipo: 'contrato', ...up.anexo, enviado_por: usuario })
    .select('id')
    .single()
  if (eAnexo || !anexo) {
    await removerArquivoAnexo(supabase, up.anexo.path)
    return { success: false, error: 'Erro ao salvar o anexo.' }
  }

  // Data em que o aluno assinou no papel (opcional; padrão = hoje)
  const dataInformada = formData.get('data_assinatura')
  const assinadoEm = typeof dataInformada === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dataInformada)
    ? new Date(`${dataInformada}T12:00:00-03:00`).toISOString()
    : new Date().toISOString()

  const { error } = await supabase.from('contratos_aluno').insert({
    autoescola_id,
    student_id,
    origem: 'anexado',
    status: 'assinado',
    titulo: 'Contrato de prestação de serviço (assinado na autoescola)',
    enviado_por: usuario,
    assinado_em: assinadoEm,
    anexo_id: anexo.id,
  })
  if (error) {
    await supabase.from('aluno_anexos').delete().eq('id', anexo.id)
    await removerArquivoAnexo(supabase, up.anexo.path)
    return { success: false, error: 'Não foi possível registrar o contrato.' }
  }

  await logContrato(autoescola_id, `Contrato assinado anexado: ${aluno.name} (Doc: ${aluno.document_id}) — ${up.anexo.nome}`, { student_id })
  return { success: true, data: null }
}

/**
 * Cancela um contrato pendente ou desfaz um anexo lançado por engano.
 * Contrato assinado digitalmente não pode ser cancelado (é evidência).
 */
export async function cancelarContrato(autoescola_id: string, contrato_id: string): Promise<ActionResult<null>> {
  const erro = await bloqueio(autoescola_id, 'cadastros', 'editar')
  if (erro) return { success: false, error: erro }

  const supabase = createServiceClient()
  const { data: c } = await supabase.from('contratos_aluno').select('*').eq('id', contrato_id).eq('autoescola_id', autoescola_id).maybeSingle()
  if (!c) return { success: false, error: 'Contrato não encontrado.' }
  const contrato = c as ContratoAluno
  if (contrato.status === 'cancelado') return { success: false, error: 'Este contrato já está cancelado.' }
  if (contrato.origem === 'digital' && contrato.status === 'assinado') {
    return { success: false, error: 'Contrato assinado digitalmente não pode ser cancelado.' }
  }

  const usuario = await getCurrentUsername()
  const { data: aluno } = await supabase.from('students').select('name').eq('id', contrato.student_id).maybeSingle()

  if (contrato.origem === 'anexado' && contrato.anexo_id) {
    const { data: anexo } = await supabase.from('aluno_anexos').select('path').eq('id', contrato.anexo_id).maybeSingle()
    await supabase.from('contratos_aluno').update({ status: 'cancelado', cancelado_em: new Date().toISOString(), cancelado_por: usuario, anexo_id: null }).eq('id', contrato_id)
    await supabase.from('aluno_anexos').delete().eq('id', contrato.anexo_id)
    if (anexo?.path) await removerArquivoAnexo(supabase, anexo.path)
  } else {
    await supabase.from('contratos_aluno').update({ status: 'cancelado', cancelado_em: new Date().toISOString(), cancelado_por: usuario }).eq('id', contrato_id)
    await removerEvidenciasContrato(supabase, [contrato.foto_path, contrato.assinatura_path])
  }

  await logContrato(autoescola_id, `Contrato cancelado: ${aluno?.name ?? ''} (${contrato.origem === 'anexado' ? 'anexo removido' : 'pendente'})`, { student_id: contrato.student_id })
  return { success: true, data: null }
}

/** Para a página de impressão: contrato (com URLs) da escola da sessão. */
export async function getContratoParaImpressao(autoescola_id: string, contrato_id: string): Promise<ContratoComUrls | null> {
  const erro = await bloqueio(autoescola_id, 'cadastros', 'ver')
  if (erro) return null
  const supabase = createServiceClient()
  const { data } = await supabase.from('contratos_aluno').select('*').eq('id', contrato_id).eq('autoescola_id', autoescola_id).maybeSingle()
  if (!data) return null
  return (await comUrls(supabase, [data as ContratoAluno]))[0]
}
