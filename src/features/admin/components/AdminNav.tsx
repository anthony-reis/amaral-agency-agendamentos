"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Users, LogOut, Menu, X, ChevronRight } from "lucide-react";
import { logoutAdmin } from "../actions/authAdmin";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [{ href: "/admin/clientes", label: "Clientes", icon: Users }];

export function AdminNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <>
      {/* Logo */}
      <div className="px-5 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
        <Link
          href="/admin/clientes"
          className="flex items-center gap-2.5 flex-1 min-w-0"
        >
          <div className="w-8 h-8 rounded-lg bg-brand-teal flex items-center justify-center shrink-0">
            <Car className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">
              Amaral<span className="text-brand-teal">Pro</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-0.5">Painel Admin</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-brand-teal/10 text-brand-teal"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {active && (
                <ChevronRight className="w-3 h-3 ml-auto opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-100 dark:border-white/5">
        <form action={logoutAdmin}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/5 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 min-h-screen bg-white dark:bg-[#1e293b] border-r border-slate-200 dark:border-white/5 sticky top-0 h-screen">
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-[#1e293b] border-b border-slate-200 dark:border-white/5 sticky top-0 z-30">
        <Link href="/admin/clientes" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-teal flex items-center justify-center shrink-0">
            <Car className="w-3.5 h-3.5 text-white" strokeWidth={2} />
          </div>
          <span className="text-sm font-bold text-slate-900 dark:text-white">
            Amaral<span className="text-brand-teal">Pro</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
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
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 bg-white dark:bg-[#1e293b] z-50 flex flex-col"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
