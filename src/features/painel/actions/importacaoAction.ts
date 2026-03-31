'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

type ValidateImportRequest = {
  escola: string;
  alunos: { cpf: string; nome: string }[];
  aulas: { cpf: string; instrutor: string; data: string; hora: string }[];
}

export async function validateImportData(data: ValidateImportRequest) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('painel_session')?.value
  if (!raw) throw new Error('Acesso negado')
  const session = JSON.parse(raw)
  if (session.autoescola_slug !== data.escola) throw new Error('Acesso negado')

  const supabase = createServiceClient()

  // 1. Check autoescola
  const { data: autoescola } = await supabase
    .from('autoescolas')
    .select('id')
    .eq('slug', data.escola)
    .single()

  if (!autoescola) throw new Error('Autoescola não encontrada')

  const errors: string[] = []

  // Normalization helper (removes accents, trims, and upper-cases)
  const normalizeText = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();

  // 2. Validate Instructors
  const uniqueInstructors = Array.from(new Set(data.aulas.map(a => a.instrutor)))
  if (uniqueInstructors.length > 0) {
    const { data: validInstructors } = await supabase
      .from('instructors')
      .select('name')
      .eq('autoescola_id', autoescola.id)
    
    const validNames = new Set((validInstructors || []).map(i => normalizeText(i.name)))
    
    uniqueInstructors.forEach(inst => {
      if (!validNames.has(normalizeText(inst))) {
        errors.push(`Instrutor não cadastrado no sistema (verifique a escrita exata): "${inst}"`)
      }
    })
  }

  // 3. Validate CPFs
  // A CPF must exist EITHER in the data.alunos array (Planilha 1) OR in the database already (students table)
  const incomingCpfs = new Set(data.alunos.map(a => a.cpf.replace(/\D/g, '')))
  const requiredCpfs = Array.from(new Set(data.aulas.map(a => a.cpf.replace(/\D/g, ''))))
  
  if (requiredCpfs.length > 0) {
    const { data: dbStudents } = await supabase
      .from('students')
      .select('document_id')
      .eq('autoescola_id', autoescola.id)
      .in('document_id', requiredCpfs)

    const existingDbCpfs = new Set((dbStudents || []).map(s => s.document_id.replace(/\D/g, '')))
    
    data.aulas.forEach((aula, index) => {
      const cleanCpf = aula.cpf.replace(/\D/g, '')
      if (!incomingCpfs.has(cleanCpf) && !existingDbCpfs.has(cleanCpf)) {
        errors.push(`Linha ${index + 2} da Planilha de Aulas: CPF ${aula.cpf} não foi encontrado na Planilha de Cadastros (1) e também não existe no banco de dados da autoescola.`)
      }
    })
  }

  // 4. (Optional future check) Check existing CPF conflicts or identical bookings in the database
  // For now, returning the accumulated DB-level errors.

  return { errors }
}
