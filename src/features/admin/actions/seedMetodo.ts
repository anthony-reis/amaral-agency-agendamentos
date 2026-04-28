'use server'

import { createServiceClient } from '@/lib/supabase/server'

const METODO_ID = 'f6ce38cf-bc09-4fac-922a-99de6034dd10'
const DEFAULT_PASSWORD = '1234'

export async function seedInstrutoresMetodo(): Promise<{ success: boolean; message: string }> {
  const supabase = createServiceClient()

  const novos = [
    { name: 'WELLISSON - Motopista Riacho', category: 'MOTO' },
    { name: 'JOÃO - Motopista Riacho', category: 'MOTO' },
    { name: 'DIMAS - Motopista Riacho', category: 'MOTO' },
    { name: 'EDEVAL', category: 'CARRO' },
  ]

  const { data: existentes } = await supabase
    .from('instructors')
    .select('name')
    .eq('autoescola_id', METODO_ID)

  const existentesNomes = new Set((existentes ?? []).map((i: { name: string }) => i.name))
  const paraInserir = novos.filter((i) => !existentesNomes.has(i.name))

  if (paraInserir.length === 0) {
    return { success: true, message: 'Todos os instrutores já estão cadastrados.' }
  }

  const rows = paraInserir.map((i) => ({
    name: i.name,
    category: i.category,
    password: DEFAULT_PASSWORD,
    autoescola_id: METODO_ID,
  }))

  const { error } = await supabase.from('instructors').insert(rows)
  if (error) return { success: false, message: `Erro ao inserir instrutores: ${error.message}` }

  // Sync instructor_passwords (legacy)
  const passRows = paraInserir.map((i) => ({
    instructor_name: i.name,
    password: DEFAULT_PASSWORD,
    autoescola_id: METODO_ID,
  }))
  await supabase.from('instructor_passwords').insert(passRows)

  return { success: true, message: `${paraInserir.length} instrutor(es) inserido(s): ${paraInserir.map((i) => i.name).join(', ')}` }
}

export async function seedHorariosMetodo(): Promise<{ success: boolean; message: string }> {
  const supabase = createServiceClient()

  const { count } = await supabase
    .from('horarios_disponiveis')
    .select('*', { count: 'exact', head: true })
    .eq('autoescola_id', METODO_ID)

  if ((count ?? 0) > 0) {
    return { success: true, message: `Horários já existem (${count} registros). Nenhuma alteração feita.` }
  }

  const horariosPorInstrutor: Record<string, string[]> = {
    'ARENO - Funcionários': ['06:00', '06:50', '07:40', '08:30', '09:20', '17:00', '17:50', '18:40', '19:30'],
    'ELAINE - Parque São João': ['07:00', '07:50', '08:40', '09:30', '10:20', '11:10', '14:00', '14:50', '15:40', '16:30', '17:20', '18:10', '19:00'],
    'GEAN - Eldorado / Carro Automático': ['07:00', '07:50', '08:40', '09:30', '10:20', '11:10', '14:00', '14:50', '15:40'],
    'JULIO - Eldorado': ['07:00', '07:50', '08:40', '09:30', '10:20', '11:10', '14:20', '15:10', '16:00', '16:50', '17:40', '18:30'],
    'JUNIO - Nova Contagem': ['07:00', '07:50', '08:40', '09:30', '10:20', '11:10', '14:00', '14:50', '15:40', '16:30', '17:20', '18:10', '19:00'],
    'LUCÉLIO - Eldorado': ['06:00', '06:50', '07:40', '08:30', '09:20', '17:00', '17:50', '18:40', '19:30'],
    'MARCILETE - Eldorado': ['07:00', '07:50', '08:40', '09:30', '10:20', '11:10', '14:30', '15:20', '16:10', '17:00', '17:50', '18:40'],
    'MADSON - Cabral / Nova Contagem': ['07:00', '07:50', '08:40', '09:30', '10:20', '11:10', '14:00', '14:50', '15:40', '16:30', '17:20', '18:10', '19:00'],
    'SANDRA - Eldorado': ['06:00', '06:50', '07:40', '08:30', '09:20', '10:10', '11:00', '17:00', '17:50', '18:40', '19:30'],
    'WALLACE - Eldorado': ['07:00', '07:50', '08:40', '09:30', '10:20', '14:00', '14:50', '15:40', '16:30', '17:20', '18:10', '19:00'],
    'WELLISSON - Motopista Riacho': ['07:00', '07:50', '08:40', '15:00', '15:50', '16:40', '17:30', '18:20', '19:10'],
    'JOÃO - Motopista Riacho': ['07:00', '07:50', '08:40', '09:30', '10:20', '11:10', '13:00', '13:50', '14:40', '15:30', '16:20', '17:10', '18:00', '18:50'],
    'DIMAS - Motopista Riacho': ['07:00', '07:50', '08:40', '09:30', '10:20', '11:10', '14:00', '14:50', '15:40', '16:30', '17:20', '18:10', '19:00'],
    'EDEVAL': ['07:00', '07:50', '08:40', '09:30', '10:20', '11:10', '14:00', '14:50', '15:40', '16:30', '17:20', '18:10', '19:00'],
  }

  const rows: { horario: string; ordem: number; ativo: boolean; instrutor: string; autoescola_id: string }[] = []

  for (const [instrutor, slots] of Object.entries(horariosPorInstrutor)) {
    slots.forEach((horario, idx) => {
      rows.push({ horario, ordem: idx + 1, ativo: true, instrutor, autoescola_id: METODO_ID })
    })
  }

  const { error } = await supabase.from('horarios_disponiveis').insert(rows)
  if (error) return { success: false, message: `Erro ao inserir horários: ${error.message}` }

  return { success: true, message: `${rows.length} horários inseridos para ${Object.keys(horariosPorInstrutor).length} instrutores.` }
}

export async function seedCreditosAlunosMetodo(): Promise<{ success: boolean; message: string }> {
  const supabase = createServiceClient()

  type AlunoSeed = { cpf: string; nome: string; telefone: string; creditos: number }
  const alunosDaPlanilha: AlunoSeed[] = [
    { cpf: '16849854631', nome: 'HEITOR HENRIQUE CORREA SOUZA', telefone: '31989367438', creditos: 4 },
    { cpf: '13834489654', nome: 'CAROLAYNE KETHLEN NUNES RAMOS', telefone: '31997487099', creditos: 8 },
    { cpf: '15877750690', nome: 'ALEXIA APARECIDA SOUZA PAIXÃO', telefone: '31997527365', creditos: 16 },
    { cpf: '15289103627', nome: 'CARLOS EDUARDO SOARES DA SILVA', telefone: '31995613474', creditos: 4 },
    { cpf: '10951259660', nome: 'GRACIELE FEREIRA DE SOUZA', telefone: '31994072850', creditos: 10 },
    { cpf: '16082158652', nome: 'EDUARDA BATISTA DE PAULA REIS', telefone: '31991203032', creditos: 11 },
    { cpf: '16035436609', nome: 'JESSICA EDUARDA PEREIRA VIANA', telefone: '31999793163', creditos: 11 },
    { cpf: '97154237600', nome: 'MARIZA FELICIANO SOARES DE MENDONÇA', telefone: '31981212248', creditos: 3 },
    { cpf: '10650544676', nome: 'MICHEL MOREIRA DA SILVA', telefone: '31972035545', creditos: 12 },
    { cpf: '07605380348', nome: 'THIAGO RODRIGUES DE SOUSA SILVA', telefone: '31971806190', creditos: 5 },
    { cpf: '02362757633', nome: 'NICOLLY BERNARDES FERREIRA MARTINS', telefone: '31991580464', creditos: 9 },
    { cpf: '02081106663', nome: 'MARCELO COSTA FREITAS', telefone: '31975983169', creditos: 9 },
    { cpf: '17364853693', nome: 'GUILHERME GONÇALVES SOARES', telefone: '31975308359', creditos: 8 },
    { cpf: '41437014801', nome: 'MARCELO COSTA SILVA', telefone: '31973528268', creditos: 9 },
    { cpf: '16152059690', nome: 'YGGOR SAMUELL TEIXEIRA FELIPE', telefone: '31998390053', creditos: 1 },
    { cpf: '01866271652', nome: 'WILLIAM PEDRO BRITO', telefone: '31991715686', creditos: 7 },
    { cpf: '15903665659', nome: 'MIGUEL ARCANJO DE OLIVEIRA PAULA', telefone: '31971958351', creditos: 7 },
    { cpf: '03429120543', nome: 'CÉSAR SANTOS FARIA', telefone: '31992987329', creditos: 9 },
    { cpf: '16338027608', nome: 'GUSTAVO HENRIQUE BRANT SILVA', telefone: '31991690589', creditos: 2 },
    { cpf: '11904416675', nome: 'ANA MARIA DE FREITAS SILVA', telefone: '31988883712', creditos: 10 },
    { cpf: '02077726652', nome: 'SARAH BEATRIZ SOUZA VELOSO', telefone: '31982052253', creditos: 12 },
    { cpf: '16348510646', nome: 'CAROLINA DE SOUZA FERREIRA', telefone: '31994900499', creditos: 2 },
    { cpf: '14994998680', nome: 'CAIO DOS REIS LOPES SILVA', telefone: '31996584359', creditos: 13 },
    { cpf: '17806044671', nome: 'LUCAS DE SOUZA KRASSOSKI', telefone: '31993322561', creditos: 11 },
    { cpf: '09836155600', nome: 'GEISIANE RODRIGUES DA COSTA', telefone: '31994766199', creditos: 1 },
    { cpf: '14041056624', nome: 'ADAIANA MIRANDA SOARES', telefone: '31973405830', creditos: 10 },
    { cpf: '00202716690', nome: 'LETÍCIA BITENCOURTE MOTTA', telefone: '31989177942', creditos: 12 },
    { cpf: '02081063670', nome: 'DANIELLE OLIVEIRA SILVA DINIZ', telefone: '31991506373', creditos: 9 },
    { cpf: '12116249600', nome: 'VERÔNICA MENDES CESÁRIO', telefone: '31983172013', creditos: 11 },
    { cpf: '14769170602', nome: 'AMANDA DA SILVA OLIVEIRA', telefone: '31993046916', creditos: 16 },
    { cpf: '12810663629', nome: 'IGOR ALEXSANDER HENDRICK FONSECA REZENDE PEREIRA', telefone: '31992606696', creditos: 12 },
    { cpf: '07523226647', nome: 'MARIANA CRISTINA MARCELOS', telefone: '31994181651', creditos: 14 },
    { cpf: '15363634643', nome: 'BRUNO MENDES DE SOUSA', telefone: '31993522484', creditos: 13 },
    { cpf: '17406736622', nome: 'FELIPE DURÃES SANTOS', telefone: '31972524023', creditos: 13 },
    { cpf: '13378592656', nome: 'ELAINE PEREIRA DE SOUZA', telefone: '31993436777', creditos: 2 },
    { cpf: '13655938608', nome: 'JOÃO PEDRO RODRIGUES MARQUES', telefone: '31999100971', creditos: 12 },
    { cpf: '04480438661', nome: 'ROZANIA RESENDE LUIZ FELISMINO', telefone: '31989580324', creditos: 16 },
    { cpf: '08570457685', nome: 'NAYARA MILENE MACEDO', telefone: '31982396407', creditos: 12 },
    { cpf: '12519145609', nome: 'HYANA PATRICIA FERNANDES', telefone: '31975120536', creditos: 9 },
    { cpf: '06036834608', nome: 'GILMARA DE ASSIS QUINTAO', telefone: '31998738368', creditos: 14 },
    { cpf: '14781445640', nome: 'MARCOS ANTÔNIO DE SOUZA SANTOS', telefone: '33998132032', creditos: 3 },
    { cpf: '16468614694', nome: 'MARIA CECÍLIA SOUZA NUNES', telefone: '31995108988', creditos: 18 },
    { cpf: '09457894677', nome: 'REBECA MARIA DE SOUZA ABREU', telefone: '31983280207', creditos: 4 },
    { cpf: '14354353628', nome: 'JAMILLY QUEIROZ DE ASSUMPÇÃO', telefone: '31985690971', creditos: 1 },
    { cpf: '70235588610', nome: 'FERNANDA GABRIELA CALIXTO PEIXOTO', telefone: '31975276363', creditos: 7 },
    { cpf: '08476963670', nome: 'VITÓRIA PAGOTTO LASSANDRO', telefone: '31993536344', creditos: 5 },
    { cpf: '13190592608', nome: 'BIANCA STEPHANIE PEIXOTO MARTINS', telefone: '31991345082', creditos: 7 },
    { cpf: '70501827617', nome: 'EMILLY PRADO REZENDE', telefone: '31995790779', creditos: 8 },
    { cpf: '12102299600', nome: 'GLAUCILENE DO NASCIMENTO DE MELO', telefone: '31992326535', creditos: 4 },
    { cpf: '12950916660', nome: 'NICOLE SOARES ALVES', telefone: '31998875893', creditos: 5 },
    { cpf: '11296854620', nome: 'ANA LUISA SOUZA NUNES', telefone: '31987132406', creditos: 8 },
    { cpf: '12803735636', nome: 'NÁDIA FERREIRA FIGUEIREDO', telefone: '31987692900', creditos: 8 },
    { cpf: '15612458606', nome: 'LORRAINE CRISTINA SANTOS OLIVEIRA', telefone: '31971636375', creditos: 7 },
    { cpf: '91344700691', nome: 'JANAENE ELOIZA DE OLIVEIRA', telefone: '31999970638', creditos: 2 },
    { cpf: '12746197693', nome: 'CAMILA OTONI TAVEIRA DE LACERDA', telefone: '31984693555', creditos: 4 },
  ]

  // Busca todos os students da Método de uma vez para evitar N+1
  const { data: existentes } = await supabase
    .from('students')
    .select('id, document_id')
    .eq('autoescola_id', METODO_ID)

  const mapaExistentes = new Map((existentes ?? []).map((s: { id: string; document_id: string }) => [s.document_id, s.id]))

  let inseridos = 0
  let atualizados = 0

  for (const aluno of alunosDaPlanilha) {
    let studentId = mapaExistentes.get(aluno.cpf)

    if (!studentId) {
      const { data: novoStudent, error: errStudent } = await supabase
        .from('students')
        .insert({
          name: aluno.nome,
          document_id: aluno.cpf,
          phone: aluno.telefone,
          autoescola_id: METODO_ID,
        })
        .select('id')
        .single()

      if (errStudent || !novoStudent) continue
      studentId = novoStudent.id
      inseridos++
    }

    const { data: credito } = await supabase
      .from('student_credits')
      .select('id')
      .eq('student_id', studentId)
      .eq('autoescola_id', METODO_ID)
      .maybeSingle()

    if (credito) {
      await supabase
        .from('student_credits')
        .update({ aulas_cat_b: aluno.creditos })
        .eq('id', credito.id)
    } else {
      await supabase.from('student_credits').insert({
        student_id: studentId,
        aulas_cat_b: aluno.creditos,
        aulas_disponiveis: aluno.creditos,
        autoescola_id: METODO_ID,
      })
    }

    atualizados++
  }

  return {
    success: true,
    message: `${inseridos} aluno(s) criado(s) no banco. ${atualizados} créditos atualizados/inseridos.`,
  }
}
