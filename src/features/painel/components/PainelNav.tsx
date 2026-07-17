"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Clock,
  Ban,
  History,
  AlertTriangle,
  LogOut,
  Car,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Calendar,
  GraduationCap,
  Activity,
  CalendarPlus,
  ClipboardList,
  Megaphone,
  UploadCloud,
  Settings,
  FileSpreadsheet,
  CalendarClock,
  FolderKanban,
  SlidersHorizontal,
  Hourglass,
  Inbox,
  FileCheck,
  BookOpenCheck,
  ShoppingCart,
  Package,
  Receipt,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { contarNaoVisualizadas } from "@/features/painel/actions/solicitacoes";

const MODAL_SEEN_KEY = "amaralpro-solicitacoes-modal-seen";
const POLL_INTERVAL_MS = 30_000;

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const STORAGE_KEY = "amaralpro-painel-nav-open-groups";

function buildDashboardItem(escola: string): NavItem {
  return {
    label: "Dashboard",
    href: `/${escola}/painel/dashboard`,
    icon: LayoutDashboard,
  };
}

function buildNavGroups(escola: string, lojaAtiva: boolean): NavGroup[] {
  const base = `/${escola}/painel`;
  return [
    // Grupo Vendas: feature gate por tenant (credencial Mercado Pago ativa)
    ...(lojaAtiva
      ? [
          {
            id: "vendas",
            label: "Vendas",
            icon: ShoppingCart,
            items: [
              { label: "Catálogo", href: `${base}/catalogo`, icon: Package },
              { label: "Vendas", href: `${base}/vendas`, icon: Receipt },
            ],
          },
        ]
      : []),
    {
      id: "agendamentos",
      label: "Agendamentos",
      icon: CalendarClock,
      items: [
        { label: "Calendário", href: `${base}/calendario`, icon: Calendar },
        {
          label: "Agend. em Massa",
          href: `${base}/agendamento-massa`,
          icon: CalendarPlus,
        },
        {
          label: "Lista de Agend.",
          href: `${base}/lista`,
          icon: ClipboardList,
        },
        { label: "Histórico", href: `${base}/historico`, icon: History },
        {
          label: "Conflitos",
          href: `${base}/conflitos`,
          icon: AlertTriangle,
        },
      ],
    },
    {
      id: "cadastros",
      label: "Cadastros",
      icon: FolderKanban,
      items: [
        { label: "Instrutores", href: `${base}/instrutores`, icon: Users },
        { label: "Alunos", href: `${base}/alunos`, icon: GraduationCap },
      ],
    },
    {
      id: "operacao",
      label: "Operação",
      icon: Clock,
      items: [
        { label: "Horários", href: `${base}/horarios`, icon: Clock },
        { label: "Bloqueios", href: `${base}/bloqueios`, icon: Ban },
        {
          label: "Fechamento",
          href: `${base}/fechamento`,
          icon: FileSpreadsheet,
        },
        {
          label: "Importação",
          href: `${base}/importacao`,
          icon: UploadCloud,
        },
      ],
    },
    {
      id: "sistema",
      label: "Sistema",
      icon: SlidersHorizontal,
      items: [
        { label: "Comunicados", href: `${base}/comunicados`, icon: Megaphone },
        { label: "Auditoria", href: `${base}/auditoria`, icon: Activity },
        {
          label: "Reagendamento",
          href: `${base}/regras-reagendamento`,
          icon: Hourglass,
        },
        {
          label: "Configurações",
          href: `${base}/configuracoes`,
          icon: Settings,
        },
      ],
    },
  ];
}

interface Props {
  escola: string;
  escolaNome: string;
  logoUrl: string | null;
  userName: string;
  userRole: string;
  autoescolaId: string;
  solicitacoesAtivo: boolean;
  lojaAtiva?: boolean;
  onLogout: () => Promise<void>;
}

export function PainelNav({
  escola,
  escolaNome,
  logoUrl,
  userName,
  userRole,
  autoescolaId,
  solicitacoesAtivo,
  lojaAtiva = false,
  onLogout,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const dashboardItem = buildDashboardItem(escola);
  const navGroups = buildNavGroups(escola, lojaAtiva);
  const solicitacoesHref = `/${escola}/painel/solicitacoes`;

  // ─── Solicitações: badge + modal de alta prioridade ────────────────────────
  // Fonte de verdade do "não visualizado" é o banco (visualizado_em IS NULL),
  // consultada a cada 30s enquanto a aba está visível (pausa em segundo
  // plano via Page Visibility API, retoma no foco). O dismiss do modal
  // ("Ver mais tarde") só vale para a aba atual (sessionStorage) — o badge
  // do menu continua visível até cada item ser aberto individualmente.
  const [naoVisualizadas, setNaoVisualizadas] = useState<{
    total: number;
    exame: number;
    legislacao: number;
    ids: string[];
  }>({ total: 0, exame: 0, legislacao: 0, ids: [] });
  const [modalIds, setModalIds] = useState<string[]>([]);
  const fetchingRef = useRef(false);

  const checarSolicitacoes = useCallback(async () => {
    if (!solicitacoesAtivo || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const dados = await contarNaoVisualizadas(autoescolaId);
      setNaoVisualizadas(dados);

      const seen: string[] = JSON.parse(
        window.sessionStorage.getItem(MODAL_SEEN_KEY) ?? "[]"
      );
      const novos = dados.ids.filter((id) => !seen.includes(id));
      if (novos.length > 0) setModalIds(novos);
    } finally {
      fetchingRef.current = false;
    }
  }, [autoescolaId, solicitacoesAtivo]);

  useEffect(() => {
    if (!solicitacoesAtivo) return;

    let intervalId: ReturnType<typeof setInterval> | null = null;
    function start() {
      if (intervalId) return;
      intervalId = setInterval(checarSolicitacoes, POLL_INTERVAL_MS);
    }
    function stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }
    function onVisibilityChange() {
      if (document.hidden) {
        stop();
      } else {
        checarSolicitacoes();
        start();
      }
    }
    function onSolicitacoesChanged() {
      checarSolicitacoes();
    }

    checarSolicitacoes();
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", checarSolicitacoes);
    window.addEventListener("solicitacoes:changed", onSolicitacoesChanged);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", checarSolicitacoes);
      window.removeEventListener(
        "solicitacoes:changed",
        onSolicitacoesChanged
      );
    };
  }, [solicitacoesAtivo, checarSolicitacoes]);

  function marcarModalVisto(ids: string[]) {
    const seen: string[] = JSON.parse(
      window.sessionStorage.getItem(MODAL_SEEN_KEY) ?? "[]"
    );
    const merged = Array.from(new Set([...seen, ...ids]));
    window.sessionStorage.setItem(MODAL_SEEN_KEY, JSON.stringify(merged));
    setModalIds([]);
  }

  function verSolicitacoesAgora() {
    marcarModalVisto(modalIds);
    setMobileOpen(false);
    router.push(`${solicitacoesHref}?filtro=novas`);
  }

  const activeGroupId = navGroups.find((group) =>
    group.items.some(
      (item) =>
        pathname === item.href || pathname.startsWith(item.href + "/")
    )
  )?.id;

  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(activeGroupId ? [activeGroupId] : [])
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const storedIds: string[] = stored ? JSON.parse(stored) : [];
    const merged = new Set(storedIds);
    if (activeGroupId) merged.add(activeGroupId);
    setOpenGroups(merged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeGroupId) {
      setOpenGroups((prev) => {
        if (prev.has(activeGroupId)) return prev;
        const next = new Set(prev);
        next.add(activeGroupId);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupId]);

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(Array.from(next))
      );
      return next;
    });
  };

  const NavContent = () => (
    <>
      {/* Brand + ThemeToggle */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[--p-border]">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={escolaNome}
            className="h-8 w-8 object-contain rounded-lg shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-lg bg-[#0ea5e9]/20 flex items-center justify-center shrink-0">
            <Car className="w-4 h-4 text-[#0ea5e9]" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-[--p-text-1] truncate leading-tight">
            {escolaNome}
          </p>
          <p className="text-[10px] text-[--p-text-3] uppercase tracking-wider">
            Painel Admin
          </p>
        </div>
        <ThemeToggle />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {/* Dashboard (solto, fora dos grupos) */}
        {(() => {
          const Icon = dashboardItem.icon;
          const active =
            pathname === dashboardItem.href ||
            pathname.startsWith(dashboardItem.href + "/");
          return (
            <Link
              href={dashboardItem.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-[#0ea5e9]/10 text-[#0ea5e9]"
                  : "text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover]"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {dashboardItem.label}
              {active && (
                <ChevronRight className="w-3 h-3 ml-auto opacity-60" />
              )}
            </Link>
          );
        })()}

        {/* Solicitações (solto, com badge) — só quando habilitado pra essa autoescola */}
        {solicitacoesAtivo &&
          (() => {
            const active =
              pathname === solicitacoesHref ||
              pathname.startsWith(solicitacoesHref + "/");
            return (
              <Link
                href={solicitacoesHref}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-[#0ea5e9]/10 text-[#0ea5e9]"
                    : "text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover]"
                }`}
              >
                <Inbox className="w-4 h-4 shrink-0" />
                Solicitações
                {naoVisualizadas.total > 0 && (
                  <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {naoVisualizadas.total}
                  </span>
                )}
              </Link>
            );
          })()}

        <div className="h-px bg-[--p-border] my-3" />

        {/* Grupos em accordion */}
        {navGroups.map((group) => {
          const GroupIcon = group.icon;
          const isOpen = openGroups.has(group.id);
          const groupActive = group.items.some(
            (item) =>
              pathname === item.href || pathname.startsWith(item.href + "/")
          );
          return (
            <div key={group.id} className="mb-0.5">
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  groupActive
                    ? "text-[--p-text-1]"
                    : "text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover]"
                }`}
              >
                <GroupIcon className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-4 pt-0.5 pb-1 space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active =
                          pathname === item.href ||
                          pathname.startsWith(item.href + "/");
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                              active
                                ? "bg-[#0ea5e9]/10 text-[#0ea5e9]"
                                : "text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover]"
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            {item.label}
                            {active && (
                              <ChevronRight className="w-3 h-3 ml-auto opacity-60" />
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-[--p-border]">
        <div className="flex items-center gap-2.5 px-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#0ea5e9]/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-[#0ea5e9]">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[--p-text-1] truncate">
              {userName}
            </p>
            <p className="text-xs text-[--p-text-3] capitalize">
              {userRole.replace("_", " ")}
            </p>
          </div>
        </div>
        <form action={onLogout}>
          <button
            type="submit"
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-[--p-text-3] hover:text-red-400 hover:bg-red-500/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-[--p-bg-card] border-r border-[--p-border] h-screen sticky top-0">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-[--p-bg-card] border-b border-[--p-border] sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={escolaNome}
              className="h-6 w-6 object-contain rounded"
            />
          ) : (
            <Car className="w-5 h-5 text-[#0ea5e9]" />
          )}
          <span className="text-sm font-semibold text-[--p-text-1]">
            {escolaNome}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-[--p-text-3] hover:text-[--p-text-1] hover:bg-[--p-hover]"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.22 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-[--p-bg-card] z-50 flex flex-col"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-[--p-text-3] hover:text-[--p-text-1]"
              >
                <X className="w-4 h-4" />
              </button>
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Modal de alta prioridade: novas solicitações ainda não reconhecidas
          nesta sessão. "Ver mais tarde" só suprime pra essa aba/sessão — o
          badge do menu continua até cada item ser aberto individualmente. */}
      <AnimatePresence>
        {modalIds.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/75 z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="solicitacoes-modal-title"
              className="fixed inset-0 flex items-center justify-center z-[61] p-4"
            >
              <div className="bg-[--p-bg-card] rounded-3xl border border-[--p-border] p-8 w-full max-w-md shadow-2xl text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#0ea5e9]/10 text-[#0ea5e9] flex items-center justify-center mx-auto mb-5">
                  <Inbox className="w-8 h-8" />
                </div>
                <h2
                  id="solicitacoes-modal-title"
                  className="text-lg font-bold text-[--p-text-1] mb-2"
                >
                  Novas solicitações de alunos
                </h2>
                <div className="space-y-1.5 mb-6">
                  {naoVisualizadas.exame > 0 && (
                    <p className="flex items-center justify-center gap-2 text-sm text-[--p-text-2]">
                      <FileCheck className="w-4 h-4 text-[#0ea5e9]" />
                      Novo agendamento de exame solicitado
                      {naoVisualizadas.exame > 1
                        ? ` (${naoVisualizadas.exame})`
                        : ""}
                    </p>
                  )}
                  {naoVisualizadas.legislacao > 0 && (
                    <p className="flex items-center justify-center gap-2 text-sm text-[--p-text-2]">
                      <BookOpenCheck className="w-4 h-4 text-[#0ea5e9]" />
                      Novo curso de legislação solicitado
                      {naoVisualizadas.legislacao > 1
                        ? ` (${naoVisualizadas.legislacao})`
                        : ""}
                    </p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={verSolicitacoesAgora}
                    className="w-full px-4 py-3 bg-[#0ea5e9] text-white text-sm font-bold rounded-xl hover:bg-[#0284c7] transition-colors"
                  >
                    Ver solicitações agora
                  </button>
                  <button
                    onClick={() => marcarModalVisto(modalIds)}
                    className="w-full px-4 py-2.5 text-sm text-[--p-text-3] hover:text-[--p-text-1] transition-colors"
                  >
                    Ver mais tarde
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
