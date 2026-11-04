// Tipos de aviso exibidos como notificação (aluno e instrutor). Mantenha em sincronia com o banco.
export type TipoAviso =
  | 'aula_agendada' | 'aula_cancelada' | 'aula_remarcada' | 'falta' | 'solicitacao'
  | 'pagamento' | 'credito' | 'contrato' | 'lembrete_dia' | 'lembrete_hora' | 'horario_bloqueado'
