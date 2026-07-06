"use client";

import {
  BarChart3,
  Banknote,
  BookOpen,
  FileText,
  LayoutDashboard,
  LogOut,
  Receipt,
  ScanLine,
  RefreshCcw,
  Settings,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase";

const nav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/accounts", label: "Accounts", icon: BookOpen },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/income", label: "Income", icon: Banknote },
  { href: "/recurring-costs", label: "Recurring Costs", icon: RefreshCcw },
  { href: "/budgets", label: "Budget vs Actual", icon: WalletCards },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    if (hasSupabaseConfig()) {
      await getSupabaseBrowserClient().auth.signOut();
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 flex-col bg-slate-950 text-white lg:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex size-10 items-center justify-center rounded-md bg-cyan-400 text-slate-950">
            <BarChart3 size={22} />
          </div>
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-200">
              Stratus
            </div>
            <div className="text-lg font-semibold">Finance Control</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-4 py-6">
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-white text-slate-950"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} />
            Sign out
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">Stratus Finance</div>
            <button onClick={signOut} className="rounded-md p-2 text-slate-600 hover:bg-slate-100">
              <LogOut size={18} />
            </button>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
