'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Users, Calendar, ArrowRight, Play, Eye } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { useParams } from 'next/navigation'
import { validateImportData } from '@/features/painel/actions/importacaoAction'
import { canEditPainel } from '@/features/painel/types'

// Types for parsed CSVs
type AlunoRow = {
  nome: string;
  cpf: string;
  telefone: string;
  carro: number;
  moto: number;
}

type AulaRow = {
  cpf: string;
  data: string;
  hora: string;
  categoria: string;
  instrutor: string;
  situacao: string;
}

interface Props {
  userRole: string
}

export default function ImportacaoClient({ userRole }: Props) {
  const params = useParams()
  const escola = params.escola as string
  const canEdit = canEditPainel(userRole)

  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Upload, 2: Preview, 3: Success
  const [activeTab, setActiveTab] = useState<'alunos' | 'aulas'>('alunos')
  const [alunosData, setAlunosData] = useState<AlunoRow[]>([])
  const [aulasData, setAulasData] = useState<AulaRow[]>([])
  
  // Files purely for UI tracking
  const [alunosFile, setAlunosFile] = useState<File | null>(null)
  const [aulasFile, setAulasFile] = useState<File | null>(null)

  // Simulation of conflicts (will be replaced by absolute server-side checks later)
  const [isProcessing, setIsProcessing] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  
  const processFile = async (file: File, type: 'alunos' | 'aulas') => {
    const extension = file.name.split('.').pop()?.toLowerCase()
    
    let rawData: any[] = []
    
    if (extension === 'csv') {
      const text = await file.text()
      const result = Papa.parse(text, { header: true, skipEmptyLines: true })
      rawData = result.data
    } else if (extension === 'xlsx') {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      // Use raw: false to format dates internally as strings if they are excel dates
      rawData = XLSX.utils.sheet_to_json(worksheet, { raw: false })
    }

    if (type === 'alunos') {
      const parsed = rawData.map((row: any) => ({
        nome: row['Nome Completo']?.toString().trim() || '',
        cpf: row['CPF / CNH']?.toString().replace(/\D/g, '') || '',
        telefone: row['Telefone (WhatsApp)']?.toString().trim() || '',
        carro: parseInt(row['Saldo Aulas Carro']?.toString() || '0', 10),
        moto: parseInt(row['Saldo Aulas Moto']?.toString() || '0', 10),
      })).filter((r: AlunoRow) => r.nome && r.cpf)
      setAlunosData(parsed)
      setAlunosFile(file)
    } else {
      const parsed = rawData.map((row: any) => ({
        cpf: row['CPF / CNH do Aluno']?.toString().replace(/\D/g, '') || '',
        data: row['Data da Aula']?.toString().trim() || '',
        hora: row['Horário']?.toString().trim() || '',
        categoria: row['Categoria']?.toString().trim() || '',
        instrutor: row['Instrutor']?.toString().trim() || '',
        situacao: row['Situação']?.toString().trim() || '',
      })).filter((r: AulaRow) => r.cpf && r.data && r.hora)
      setAulasData(parsed)
      setAulasFile(file)
    }
  }

  const handleUploadAlunos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processFile(file, 'alunos')
  }

  const handleUploadAulas = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processFile(file, 'aulas')
  }

  const processPreview = async () => {
    setIsProcessing(true)
    setErrors([])
    
    const localErrors: string[] = []
    
    // 1. Intra-Sheet Student Double Booking (1 class per day)
    const studentDays = new Map<string, string[]>()
    aulasData.forEach(aula => {
      const key = `${aula.cpf}-${aula.data}`
      if (studentDays.has(key)) {
        localErrors.push(`Conflito: Aluno CPF ${aula.cpf} tem mais de uma aula agendada para o dia ${aula.data}. (Limite de 1 por dia).`)
      } else {
        studentDays.set(key, [aula.hora])
      }
    })

    // 3. Intra-Sheet Instructor Double booking
    const instTimeSlots = new Set<string>()
    aulasData.forEach(aula => {
      // e.g. "Roberto-25/03/2026-15:00"
      const key = `${aula.instrutor}-${aula.data}-${aula.hora}`
      if (instTimeSlots.has(key)) {
        localErrors.push(`Conflito de Instrutor: ${aula.instrutor} já possui aula na planilha no dia ${aula.data} às ${aula.hora}.`)
      }
      instTimeSlots.add(key)
    })

    // 4. Server-Side / Database checks (Missing Instructors, etc.)
    try {
      const dbValidation = await validateImportData({
        escola,
        alunos: alunosData.map(a => ({ cpf: a.cpf, nome: a.nome })),
        aulas: aulasData.map(a => ({ cpf: a.cpf, data: a.data, hora: a.hora, instrutor: a.instrutor }))
      })
      localErrors.push(...dbValidation.errors)
    } catch (err: any) {
      localErrors.push(`Erro de validação no banco: ${err.message}`)
    }

    setErrors(localErrors)
    setIsProcessing(false)
    setStep(2)
  }

  const confirmImport = () => {
    // TODO: Trigger actual insertion on the database.
    setStep(3)
  }

  if (!canEdit) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[--p-text-1]">Importação de Dados</h1>
          <p className="text-[--p-text-3]">Seu perfil (Visualizador) não tem permissão para importar dados.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[--p-text-1]">Importação de Dados</h1>
        <p className="text-[--p-text-3]">Suba as planilhas do cliente para cadastrar os alunos, atualizar saldos e montar o histórico.</p>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Alunos Upload */}
              <div className="bg-[--p-bg-card] border border-[--p-border] p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-blue-500/10 rounded-xl">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[--p-text-1]">Planilha de Alunos</h3>
                    <p className="text-xs text-[--p-text-3]">Planilha 1 (Cadastro e Saldos)</p>
                  </div>
                </div>
                
                <label className={`block border-2 border-dashed ${alunosFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[--p-border] hover:border-[--p-accent]/50 hover:bg-[--p-hover]'} rounded-xl p-6 text-center cursor-pointer transition-all`}>
                  <input type="file" accept=".csv, .xlsx" className="hidden" onChange={handleUploadAlunos} />
                  {alunosFile ? (
                    <div className="space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                      <p className="text-sm font-semibold text-emerald-400">{alunosFile.name}</p>
                      <p className="text-xs text-[--p-text-3]">{alunosData.length} alunos detectados</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <UploadCloud className="w-8 h-8 text-[--p-text-3] mx-auto opacity-50" />
                      <p className="text-sm font-semibold text-[--p-text-1]">Clique para buscar CSV ou XLSX</p>
                      <p className="text-xs text-[--p-text-3]">Apenas arquivos .csv ou .xlsx</p>
                    </div>
                  )}
                </label>
              </div>

              {/* Aulas Upload */}
              <div className="bg-[--p-bg-card] border border-[--p-border] p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 bg-purple-500/10 rounded-xl">
                    <Calendar className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[--p-text-1]">Planilha de Aulas</h3>
                    <p className="text-xs text-[--p-text-3]">Planilha 2 (Histórico e Agendadas)</p>
                  </div>
                </div>
                
                <label className={`block border-2 border-dashed ${aulasFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-[--p-border] hover:border-[--p-accent]/50 hover:bg-[--p-hover]'} rounded-xl p-6 text-center cursor-pointer transition-all`}>
                  <input type="file" accept=".csv, .xlsx" className="hidden" onChange={handleUploadAulas} />
                  {aulasFile ? (
                    <div className="space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                      <p className="text-sm font-semibold text-emerald-400">{aulasFile.name}</p>
                      <p className="text-xs text-[--p-text-3]">{aulasData.length} aulas detectadas</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <UploadCloud className="w-8 h-8 text-[--p-text-3] mx-auto opacity-50" />
                      <p className="text-sm font-semibold text-[--p-text-1]">Clique para buscar CSV ou XLSX</p>
                      <p className="text-xs text-[--p-text-3]">Apenas arquivos .csv ou .xlsx</p>
                    </div>
                  )}
                </label>
              </div>

            </div>

            <div className="flex justify-end">
              <button
                onClick={processPreview}
                disabled={!alunosFile || isProcessing}
                className="flex items-center gap-2 bg-[--p-accent] text-white px-6 py-3 rounded-xl font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analisando Planilhas...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    Avançar para o Preview
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-[--p-bg-card] border border-[--p-border] p-6 rounded-2xl">
              <h2 className="text-lg font-bold text-[--p-text-1] mb-2">Resumo da Avaliação</h2>
              <div className="flex gap-4 mb-6">
                <div className="flex-1 bg-[--p-bg-input] p-4 rounded-xl border border-[--p-border]">
                  <p className="text-[--p-text-3] text-sm">Alunos Prontos para Gravar</p>
                  <p className="text-2xl font-bold text-[--p-text-1] mt-1">{alunosData.length}</p>
                </div>
                <div className="flex-1 bg-[--p-bg-input] p-4 rounded-xl border border-[--p-border]">
                  <p className="text-[--p-text-3] text-sm">Aulas Prontas para Gravar</p>
                  <p className="text-2xl font-bold text-[--p-text-1] mt-1">{aulasData.length}</p>
                </div>
              </div>

              {errors.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-red-400 mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <h3 className="font-bold">Atenção! Conflitos Detectados ({errors.length})</h3>
                  </div>
                  <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 max-h-[300px] overflow-y-auto space-y-2">
                    {errors.map((e, idx) => (
                      <p key={idx} className="text-sm text-red-400 pb-2 border-b border-red-500/10 last:border-0 last:pb-0">
                        {e}
                      </p>
                    ))}
                  </div>
                  <p className="text-xs text-[--p-text-3] mt-2">Você precisa resolver estes itens na planilha e reenviar, ou prosseguir ignorando apenas as linhas exatas com problemas (elas não serão salvas).</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-semibold">Tudo perfeito! Nenhum conflito de horário, excesso de limite ou divergência de CPFs foi detectado com a base de dados atual.</p>
                </div>
              )}
            </div>

            <div className="bg-[--p-bg-card] border border-[--p-border] rounded-2xl overflow-hidden flex flex-col">
              {/* Tab selector */}
              <div className="flex border-b border-[--p-border]">
                <button
                  onClick={() => setActiveTab('alunos')}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold border-b-2 transition-colors ${
                    activeTab === 'alunos' ? 'border-[--p-accent] text-[--p-accent] bg-[--p-accent]/5' : 'border-transparent text-[--p-text-3] hover:text-[--p-text-2] hover:bg-[--p-hover]'
                  }`}
                >
                  <Users className="w-4 h-4" /> Alunos Detectados ({alunosData.length})
                </button>
                <button
                  onClick={() => setActiveTab('aulas')}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-bold border-b-2 transition-colors ${
                    activeTab === 'aulas' ? 'border-[--p-accent] text-[--p-accent] bg-[--p-accent]/5' : 'border-transparent text-[--p-text-3] hover:text-[--p-text-2] hover:bg-[--p-hover]'
                  }`}
                >
                  <Calendar className="w-4 h-4" /> Aulas Detectadas ({aulasData.length})
                </button>
              </div>

              {/* Data Table Preview */}
              <div className="p-0 overflow-x-auto max-h-[400px] overflow-y-auto w-full">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead className="sticky top-0 bg-[--p-bg-card] shadow-sm">
                    <tr>
                      {activeTab === 'alunos' ? (
                        <>
                          <th className="px-4 py-3 text-xs font-bold text-[--p-text-3] uppercase tracking-wider">Nome</th>
                          <th className="px-4 py-3 text-xs font-bold text-[--p-text-3] uppercase tracking-wider">CPF/CNH</th>
                          <th className="px-4 py-3 text-xs font-bold text-[--p-text-3] uppercase tracking-wider">Telefone</th>
                          <th className="px-4 py-3 text-xs font-bold text-[--p-text-3] uppercase tracking-wider">Créd. Carro</th>
                          <th className="px-4 py-3 text-xs font-bold text-[--p-text-3] uppercase tracking-wider">Créd. Moto</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-3 text-xs font-bold text-[--p-text-3] uppercase tracking-wider">CPF do Aluno</th>
                          <th className="px-4 py-3 text-xs font-bold text-[--p-text-3] uppercase tracking-wider">Data</th>
                          <th className="px-4 py-3 text-xs font-bold text-[--p-text-3] uppercase tracking-wider">Hora</th>
                          <th className="px-4 py-3 text-xs font-bold text-[--p-text-3] uppercase tracking-wider">Categoria</th>
                          <th className="px-4 py-3 text-xs font-bold text-[--p-text-3] uppercase tracking-wider">Instrutor</th>
                          <th className="px-4 py-3 text-xs font-bold text-[--p-text-3] uppercase tracking-wider">Situação</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[--p-border]">
                    {activeTab === 'alunos' && alunosData.map((a, i) => (
                      <tr key={i} className="hover:bg-[--p-hover] transition-colors">
                        <td className="px-4 py-2.5 text-sm text-[--p-text-1] font-medium whitespace-nowrap">{a.nome}</td>
                        <td className="px-4 py-2.5 text-sm text-[--p-text-2]">{a.cpf}</td>
                        <td className="px-4 py-2.5 text-sm text-[--p-text-2]">{a.telefone || '-'}</td>
                        <td className="px-4 py-2.5 text-sm text-blue-400 font-bold">{a.carro}</td>
                        <td className="px-4 py-2.5 text-sm text-emerald-400 font-bold">{a.moto}</td>
                      </tr>
                    ))}
                    {activeTab === 'aulas' && aulasData.map((a, i) => (
                      <tr key={i} className="hover:bg-[--p-hover] transition-colors">
                        <td className="px-4 py-2.5 text-sm text-[--p-text-2] font-mono">{a.cpf}</td>
                        <td className="px-4 py-2.5 text-sm text-[--p-text-1]">{a.data}</td>
                        <td className="px-4 py-2.5 text-sm font-semibold text-[--p-text-1]">{a.hora}</td>
                        <td className="px-4 py-2.5 text-sm">
                          <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${a.categoria.toLowerCase() === 'carro' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'}`}>{a.categoria}</span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-[--p-text-2] uppercase">{a.instrutor}</td>
                        <td className="px-4 py-2.5 text-xs font-semibold text-[--p-text-3] uppercase tracking-wider">{a.situacao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 rounded-xl border border-[--p-border] text-[--p-text-2] font-semibold hover:bg-[--p-hover]"
              >
                Voltar
              </button>
              <button
                onClick={confirmImport}
                disabled={errors.length > 0}
                className="flex items-center gap-2 bg-[--p-accent] text-white px-8 py-3 rounded-xl font-bold hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 transition-all"
              >
                Confirmar Importação no Banco de Dados <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center justify-center py-16 bg-[--p-bg-card] border border-[--p-border] rounded-2xl text-center">
             <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
             </div>
             <h2 className="text-2xl font-bold text-[--p-text-1] mb-2">Importação Concluída!</h2>
             <p className="text-[--p-text-3] max-w-sm mb-8">Todos os cadastros e grades de aulas foram persistidos na sua autoescola com sucesso e já constam no painel.</p>
             <button
               onClick={() => window.location.reload()}
               className="bg-[--p-bg-input] border border-[--p-border] px-6 py-2.5 rounded-xl text-sm font-bold text-[--p-text-2] hover:bg-[--p-hover]"
             >
               Realizar Nova Importação
             </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
