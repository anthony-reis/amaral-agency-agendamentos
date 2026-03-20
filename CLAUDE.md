# AmaralPro — Contexto do Projeto para Desenvolvimento

## O que é este projeto

SaaS multi-tenant para gestão de autoescolas.
- **Tenant = autoescola**, identificada por `slug` na URL e por `autoescola_id` (UUID) no banco.
- Dois painéis distintos: `/admin` (equipe AmaralPro) e `/[escola]/painel` (cada autoescola).
- App aluno: `/[escola]/aluno` (identificação por CPF/CNH + créditos).
- App instrutor: `/[escola]/instrutor` (login por senha + painel de aulas do dia).

---

## Stack

- **Next.js 15** (App Router, React 19, TypeScript estrito)
- **Supabase** (PostgreSQL, storage `logos`, sem RLS — usamos `SUPABASE_SERVICE_ROLE_KEY`)
- **Tailwind CSS** (`darkMode: 'class'`, CSS variables `--p-*` para tema do painel)
- **next-themes** (toggle light/dark, `storageKey: 'amaralpro-theme'`, default: `dark`)
- **Framer Motion** + **Lucide React**

---

## Estrutura de Rotas

```
/                              → Landing page pública (CTAs: "Sou aluno" / "Sou autoescola")
/entrar?perfil=aluno           → Seleção de autoescola → redireciona para /:slug/aluno
/entrar?perfil=escola          → Seleção de autoescola → redireciona para /:slug/acesso
/[escola]/acesso               → Escolha de perfil: Admin → /painel | Instrutor → /instrutor
/[escola]/aluno                → Identificação do aluno (CPF/CNH)
/[escola]/aluno/creditos       → Exibe créditos do aluno
/[escola]/painel/login         → Login da autoescola (SELECT de usuários)
/[escola]/painel/(protected)/  → Painel protegido por cookie painel_session
  dashboard                    → Stats + desempenho instrutores
  calendario                   → Calendário mensal de agendamentos
  instrutores                  → CRUD instrutores + senha
  alunos                       → CRUD alunos + créditos por categoria
  horarios                     → Horários disponíveis por instrutor
  bloqueios                    → Bloqueios de dias/horários
  historico                    → Lista de agendamentos paginada + CSV
  conflitos                    → Detecção e resolução de conflitos
  auditoria                    → Log de atividades com filtros + CSV
/[escola]/instrutor/login      → Login do instrutor (select + senha)
/[escola]/instrutor/(protected)/ → Painel protegido por cookie instrutor_session
  (index)                      → Painel do instrutor: stats + mapa semanal + aulas do dia
/admin/login                   → Login admin (Supabase Auth)
/admin/(protected)/            → Painel admin protegido por Supabase Auth
  clientes                     → Listagem de autoescolas
  clientes/novo                → Criar nova autoescola
  clientes/[id]/editar         → Editar dados da autoescola
  clientes/[id]/usuarios       → CRUD usuários do painel
```

---

## Autenticação

### /painel (por autoescola)
- Cookie httpOnly `painel_session` = JSON `{ userId, username, full_name, role, autoescola_id, autoescola_slug }`
- Expiração: 8h
- Tabela: `users_painel` (passwords em plaintext — legado, NÃO alterar)
- Login: SELECT dropdown dos usuários + campo senha
- `getPainelSession(slug)` valida que `session.autoescola_slug === slug`

### /instrutor (por autoescola)
- Cookie httpOnly `instrutor_session` = JSON `{ instructorId, name, category, autoescola_id, autoescola_slug }`
- Expiração: 8h
- Tabela: `instructors` (passwords em plaintext — NÃO alterar)
- Login: SELECT dropdown dos instrutores + campo senha
- `getInstructorSession(slug)` em `src/features/instrutor/actions/authInstrutor.ts`

### /admin (equipe AmaralPro)
- Supabase Auth (JWT) + verificação em `admin_users`
- Middleware verifica JWT via `@supabase/ssr`

---

## Feature Directories

```
src/features/
  painel/
    types.ts              → Instrutor, Agendamento, HorarioDisponivel, Aluno, AlunoComCreditos,
                            LogAtividade, LogStats, BloqueioTimeSlot, Conflito, PainelSession, etc.
    actions/
      authPainel.ts       → loginPainel, logoutPainel, getPainelSession, listarUsuariosPainel
      instrutores.ts      → listarInstrutores, criarInstrutor, atualizarInstrutor, excluirInstrutor, alterarSenhaInstrutor
      agendamentos.ts     → listarAgendamentos, getAgendamentosStats, getDesempenhoInstrutores, cancelarAgendamento
      bloqueios.ts        → listarBloqueios, criarBloqueio, excluirBloqueio
      horarios.ts         → listarHorarios, criarHorario, toggleHorario, excluirHorario
      conflitos.ts        → detectarConflitos, resolverConflito
      alunos.ts           → listarAlunos, criarAluno, editarAluno, excluirAluno, ajustarCredito
      auditoria.ts        → listarLogs, getLogStats, listarUsuariosPainel
      calendario.ts       → getCalendarioData, getAgendamentosDia
    components/
      PainelLoginForm.tsx, PainelNav.tsx, DashboardStats.tsx, InstrutoesTable.tsx,
      HorariosGrid.tsx, BloqueioForm.tsx, HistoricoList.tsx, ConflitosPanel.tsx,
      Calendario.tsx, AlunosList.tsx, AuditoriaList.tsx
  admin/
    types.ts              → Autoescola, AdminUser, NovoClienteInput, ActionResult
    actions/
      authAdmin.ts        → loginAdmin, logoutAdmin, getAdminSession
      clientes.ts         → listarClientes, criarCliente, editarCliente, uploadLogo
      painelUsers.ts      → listarPainelUsers, criarPainelUser, editarPainelUser, togglePainelUser, excluirPainelUser
    components/
      AdminNav.tsx, AdminLoginForm.tsx, ClientesList.tsx, NovoClienteForm.tsx,
      PainelUsersList.tsx, EditarClienteForm.tsx
  instrutor/
    actions/
      authInstrutor.ts    → loginInstrutor, logoutInstrutor, getInstructorSession, listarInstrutoresParaLogin
      minhasAulas.ts      → getMinhasAulasHoje, getMapaSemanal, atualizarStatusAula
    components/
      InstructorLoginForm.tsx, InstructorPainel.tsx, InstructorAulaCard.tsx
  identificacao/
    types.ts
    actions/verificarCreditos.ts
    components/IdentificacaoForm.tsx, ProgressBar.tsx, StepIcon.tsx
src/components/
  ThemeToggle.tsx         → Botão Sun/Moon (next-themes)
src/app/
  providers.tsx           → ThemeProvider (next-themes)
  globals.css             → CSS variables --p-* para tema do painel (light + .dark)
```

---

## Schema Supabase (Projeto: kqellwbejlvpconxaebe)

| Tabela | Colunas principais |
|---|---|
| `autoescolas` | id, nome, slug, cnpj, logo_url, status (active/trial/suspended), plano (basico/pro/enterprise), created_at, updated_at |
| `users_painel` | id, username, password (plaintext!), full_name, role (admin/operador/super_admin), is_active, autoescola_id |
| `instructors` | id, name, category (CARRO/MOTO/AMBOS), password, autoescola_id |
| `instructor_passwords` | instructor_name, password, autoescola_id (tabela legacy — manter sincronizada com instructors.password) |
| `agendamentos` | id, date (YYYY-MM-DD), time_slot, instructor_name (TEXT, não FK), instructorCategory, student_name, student_document, cpf_cnh, status (scheduled/confirmed/completed/absent/cancelled), notes, autoescola_id |
| `horarios_disponiveis` | id, horario, ordem, ativo, instrutor (nullable), autoescola_id |
| `blockedTimeSlots` | id, date, time_slot, vehicle_type, instructor (nullable), reason, weekdays (jsonb), status, autoescola_id |
| `students` | id, name, email, phone, document_id, registration_number, created_at, autoescola_id |
| `student_credits` | id, student_id, aulas_cat_a..e, aulas_disponiveis, created_at, updated_at, autoescola_id |
| `activity_logs_painel` | id, user_id, username, action_type, description, metadata (jsonb), created_at, autoescola_id |
| `admin_users` | id, email, role, is_active, created_at (usa Supabase Auth) |

### Importante
- `agendamentos.instructor_name` é TEXT (não UUID FK) — queries de conflito usam `instructor_name`
- `users_painel.password` é plaintext — comparação direta (sem bcrypt) — **NÃO alterar** neste projeto
- `instructor_passwords` é tabela legacy duplicada — ao mudar senha em `instructors`, atualizar também aqui
- Storage bucket: `logos` (público) — URL via `supabase.storage.from('logos').getPublicUrl(path)`

---

## Tema light/dark

- `tailwind.config.ts`: `darkMode: 'class'`
- `globals.css`: CSS variables `--p-bg-base`, `--p-bg-card`, `--p-bg-input`, `--p-border`, `--p-text-1`, `--p-text-2`, `--p-text-3`, `--p-accent`, `--p-hover`
  - `:root` = light theme, `.dark` = dark theme
- `src/app/providers.tsx`: `ThemeProvider` do next-themes (default: `dark`)
- `src/components/ThemeToggle.tsx`: botão Sun/Moon (sempre presente no `PainelNav` e `AdminNav`)
- Componentes do painel usam `bg-[--p-bg-card]`, `text-[--p-text-1]`, `border-[--p-border]` etc.
- Admin usa classes Tailwind padrão + `dark:` variants

---

## API Routes (filtros client-side)

| Rota | Uso |
|---|---|
| `GET /[escola]/painel/dashboard/api` | Filtra stats + desempenho do dashboard |
| `GET /[escola]/painel/historico/api` | Filtra + pagina histórico de agendamentos |

Ambas validam `painel_session` cookie e extraem `autoescola_id` da sessão.

---

## Regras de desenvolvimento

1. **Não usar bcrypt** — passwords em `users_painel` e `instructors` são plaintext (legado)
2. **Sempre filtrar por `autoescola_id`** em todas as queries do painel
3. **Server Components por padrão** — Client Components só quando há interatividade (estado, eventos)
4. **Server Actions** (`'use server'`) para mutations — nunca expor chave de serviço no cliente
5. **Supabase**: sempre usar `createServiceClient()` (usa `SUPABASE_SERVICE_ROLE_KEY`) em ações server-side
6. **Multi-tenant**: middleware valida que `session.autoescola_slug === slug` da URL antes de qualquer operação
7. **Manter sincronia**: ao alterar senha em `instructors`, atualizar também `instructor_passwords`
8. **CSS variables**: novos componentes do painel devem usar `--p-*` vars, não hardcodar `#0f172a`

---

## Variáveis de ambiente necessárias

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Estado atual do build

- `npm run build` → ✅ limpo (validar após cada sessão de desenvolvimento)
- 20+ rotas compiladas
- TypeScript strict mode ativo

---

## Dados de teste (Moctran)

- **Slug**: `moctran`
- **autoescola_id**: `b0fbcd6f-0cec-47b2-9def-38c03a19a20b`
- **Agendamentos**: ~1804 registros reais
- **Instrutores**: 6
- **Horários**: 108
- **Bloqueios**: 51
- **Logs de auditoria**: 606+
- **Login do painel**: `/<autoescola>/painel/login` → select dropdown de usuários

---

## Próximas evoluções sugeridas

- [ ] Paginação na tela de Auditoria (servidor) para melhor performance em logs grandes
- [ ] Exportar PDF além de CSV no histórico
- [ ] Notificações (WhatsApp/email) quando agendamento é criado/cancelado
- [ ] Integração de pagamentos para gestão de planos
- [ ] Migrar senhas para bcrypt quando oportunidade de refatoração
- [ ] Tela de criação de agendamentos direto pelo painel
- [ ] Relatórios avançados (gráficos de evolução mensal)

---

## Histórico de Decisões e Implementações

### Implementação do Fluxo de Agendamento do Aluno & Ajustes Gerais (Atual)
- **Header da Landing Page:** Adicionados botões primários e secundários ("Sou aluno" e "Sou autoescola") usando CTAs coerentes com a `HeroSection`, importando ícones `GraduationCap` e `Building2`.
- **Produção e `autoescola_id`:** O insert no banco agora exige `autoescola_id`. Para resolver o erro `not-null constraint`, o fluxo atualizado em `agendarAula.ts` insere o `autoescola_id` corretamente na tabela de agendamentos. A pedido, a tratativa profunda em rotas legadas e banco foi pulada para focar na UI do aluno por enquanto.
- **Fluxo `/:slug/aluno/agendar`:** 
  - A confirmação de identificação (`IdentificacaoForm.tsx`) não redireciona instantaneamente mais. Agora mostra os créditos disponíveis (Carro/Moto) com animação na própria tela de form e o botão muda para "Continuar", antes de rotear via `router.push`.
  - Criada rota nova principal do aluno: `src/app/[escola]/aluno/agendar/page.tsx`.
  - Criado fluxo client-side gerador de estado e visual de passo-a-passo no `<AgendamentoFlow />`. Implementa Steps 2 (Data), 3 (Categoria), 4 (Instrutor com filtro de vagas), 5 (Horário) e 6 (Confirmação interativa).
  - Incluída Server Action `agendarAula.ts` com as funções `fetchDisponibilidade` e `criarAgendamento` para consultar instrutores, conciliar conflitos de horário com base em the table `agendamentos` and `blockedTimeSlots` do Supabase e depois deduzir crédito.
- **Página Minhas Aulas:** Criada `/minhas-aulas` que separa visualmente `agendadas` (incluindo status `scheduled` e `confirmed`) e `concluídas`, listando o dia (ex: segunda-feira, 27 de maio), horários e instrutores com ícones correspondentes, tudo buscando diretamente do banco usando a chave de CPF.
