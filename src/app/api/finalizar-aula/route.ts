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
    const kmFinalRaw = formData.get('km_final') as string | null
    const kmFinal = kmFinalRaw !== null && kmFinalRaw !== '' ? parseInt(kmFinalRaw, 10) : null

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

    // Se a aula foi iniciada com KM inicial, o KM final é OBRIGATÓRIO para
    // finalizar — não pode existir aula concluída sem o KM final correspondente.
    const { data: ag } = await supabase
      .from('agendamentos')
      .select('km_inicial')
      .eq('id', agendamento_id)
      .eq('autoescola_id', autoescola_id)
      .single()

    if (ag?.km_inicial != null) {
      if (kmFinal === null) {
        return NextResponse.json({ error: 'Informe o KM final para finalizar a aula.' }, { status: 400 })
      }
      if (isNaN(kmFinal) || kmFinal < 0) {
        return NextResponse.json({ error: 'KM final inválido.' }, { status: 400 })
      }
      if (kmFinal < ag.km_inicial) {
        return NextResponse.json({ error: `KM final (${kmFinal}) não pode ser menor que o KM inicial (${ag.km_inicial}).` }, { status: 400 })
      }
    } else if (kmFinal !== null && (isNaN(kmFinal) || kmFinal < 0)) {
      return NextResponse.json({ error: 'KM final inválido.' }, { status: 400 })
    }

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
    // Suporta JPEG (dispositivos low-end) e PNG (legado) dinamicamente
    const sigMimeMatch = signatureDataURL.match(/^data:(image\/(?:png|jpeg));base64,/)
    const sigMime = sigMimeMatch?.[1] ?? 'image/jpeg'
    const sigExt = sigMime === 'image/png' ? 'png' : 'jpg'
    const assinaturaPath = `${autoescola_id}/${agendamento_id}/assinatura.${sigExt}`
    const base64Data = signatureDataURL.replace(/^data:image\/(?:png|jpeg);base64,/, '')
    const sigBuffer = Buffer.from(base64Data, 'base64')

    const { error: sigError } = await supabase.storage
      .from('aulas-finalizadas')
      .upload(assinaturaPath, sigBuffer, { contentType: sigMime, upsert: true })

    if (sigError) {
      return NextResponse.json({ error: 'Erro ao salvar assinatura.' }, { status: 500 })
    }

    const { data: { publicUrl: signatureUrl } } = supabase.storage
      .from('aulas-finalizadas')
      .getPublicUrl(assinaturaPath)

    // Atualiza agendamento
    const updatePayload: Record<string, unknown> = {
      status: 'completed',
      photo_url: photoUrl,
      signature_url: signatureUrl,
    }
    if (kmFinal !== null) updatePayload.km_final = kmFinal

    const { error } = await supabase
      .from('agendamentos')
      .update(updatePayload)
      .eq('id', agendamento_id)
      .eq('autoescola_id', autoescola_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await supabase.from('activity_logs_painel').insert({
      username: instructor_name,
      action_type: 'agendamento',
      description: `Instrutor ${instructor_name} finalizou a aula com evidências (foto + assinatura)${kmFinal !== null ? `, KM final: ${kmFinal}` : ''} — agendamento ${agendamento_id}`,
      metadata: { agendamento_id, ...(kmFinal !== null ? { km_final: kmFinal } : {}) },
      autoescola_id,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[finalizar-aula]', err)
    return NextResponse.json({ error: 'Erro inesperado.' }, { status: 500 })
  }
}
