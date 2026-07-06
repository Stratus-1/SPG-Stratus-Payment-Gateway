"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_ACCOUNTS, DEFAULT_SETTINGS } from "@/lib/defaults";
import { hasSupabaseConfig, getSupabaseBrowserClient } from "@/lib/supabase";
import type { Account, Budget, CompanySettings, Expense, Income, RecurringCost } from "@/lib/types";

export type FinanceData = {
  accounts: Account[];
  expenses: Expense[];
  income: Income[];
  recurringCosts: RecurringCost[];
  budgets: Budget[];
  settings: CompanySettings;
};

export function useFinanceData() {
  const [data, setData] = useState<FinanceData>({
    accounts: DEFAULT_ACCOUNTS,
    expenses: [],
    income: [],
    recurringCosts: [],
    budgets: [],
    settings: DEFAULT_SETTINGS,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const configured = useMemo(() => hasSupabaseConfig(), []);

  const load = useCallback(async () => {
    if (!configured) {
      setLoading(false);
      setError("Supabase is not configured. Add .env.local values and run the SQL schema.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const [accounts, expenses, income, recurringCosts, budgets, settings] = await Promise.all([
        supabase.from("accounts").select("*").order("sort_order"),
        supabase.from("expenses").select("*").order("date", { ascending: false }),
        supabase.from("income").select("*").order("date", { ascending: false }),
        supabase.from("recurring_costs").select("*").order("service_name"),
        supabase.from("budgets").select("*").order("month", { ascending: false }),
        supabase.from("company_settings").select("*").eq("id", 1).maybeSingle(),
      ]);

      const firstError =
        accounts.error ??
        expenses.error ??
        income.error ??
        recurringCosts.error ??
        budgets.error ??
        settings.error;

      if (firstError) throw firstError;

      setData({
        accounts: (accounts.data ?? DEFAULT_ACCOUNTS) as Account[],
        expenses: (expenses.data ?? []) as Expense[],
        income: (income.data ?? []) as Income[],
        recurringCosts: (recurringCosts.data ?? []) as RecurringCost[],
        budgets: (budgets.data ?? []) as Budget[],
        settings: ((settings.data as CompanySettings | null) ?? DEFAULT_SETTINGS),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load finance data.");
    } finally {
      setLoading(false);
    }
  }, [configured]);

  useEffect(() => {
    // Load Supabase data after the browser client is available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  return { ...data, configured, loading, error, reload: load };
}
