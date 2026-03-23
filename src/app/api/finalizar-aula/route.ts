import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const agendamento_id = formData.get('agendamento_id') as string | null
    const instructor_name = formData.get('instructor_name') as string | null
    const autoescola_id = formData.get('autoescola_id') as string | null
    const signatureDataURL = formData.get('signatureDataURL') as string | null
    const fotoFile = formData.get('foto') as File | null

    if (!agendamento_id || !instructor_name || !autoescola_id) {
      return NextResponse.json({ error: 'Dados obrigatórios ausentes.' }, { status: 400 })
    }
    if (!fotoFile || fotoFile.size === 0) {
      return NextResponse.json({ error: 'Foto obrigatória.' }, { status: 400 })
    }
    if (!signatureDataURL || signatureDataURL === 'data:,') {
      return NextResponse.json({ error: 'Assinatura obrigatória.' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Upload da foto
    const ext = (fotoFile.name.split('.').pop() ?? 'jpg').replace('jpeg', 'jpg')
    const fotoPath = `${autoescola_id}/${agendamento_id}/foto.${ext}`
    const fotoBuffer = Buffer.from(await fotoFile.arrayBuffer())

    const { error: fotoError } = await supabase.storage
      .from('aulas-finalizadas')
      .upload(fotoPath, fotoBuffer, { contentType: fotoFile.type, upsert: true })

    if (fotoError) {
      return NextResponse.json({ error: 'Erro ao fazer upload da foto.' }, { status: 500 })
    }

    const { data: { publicUrl: photoUrl } } = supabase.storage
      .from('aulas-finalizadas')
      .getPublicUrl(fotoPath)

    // Upload da assinatura (base64 → buffer)
    const assinaturaPath = `${autoescola_id}/${agendamento_id}/assinatura.png`
    const base64Data = signatureDataURL.replace(/^data:image\/png;base64,/, '')
    const sigBuffer = Buffer.from(base64Data, 'base64')

    const { error: sigError } = await supabase.storage
      .from('aulas-finalizadas')
      .upload(assinaturaPath, sigBuffer, { contentType: 'image/png', upsert: true })

    if (sigError) {
      return NextResponse.json({ error: 'Erro ao salvar assinatura.' }, { status: 500 })
    }

    const { data: { publicUrl: signatureUrl } } = supabase.storage
      .from('aulas-finalizadas')
      .getPublicUrl(assinaturaPath)

    // Atualiza agendamento
    const { error } = await supabase
      .from('agendamentos')
      .update({ status: 'completed', photo_url: photoUrl, signature_url: signatureUrl })
      .eq('id', agendamento_id)
      .eq('autoescola_id', autoescola_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase.from('activity_logs_painel').insert({
      username: instructor_name,
      action_type: 'agendamento',
      description: `Instrutor ${instructor_name} finalizou a aula com evidências (foto + assinatura) — agendamento ${agendamento_id}`,
      metadata: { agendamento_id: agendamento_id },
      autoescola_id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[finalizar-aula]', err)
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 })
  }
}
