"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";
import { Banknote, Calculator, CreditCard, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card } from "@/components/ui";
import { ErrorState, LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { dashboardMetrics, getCurrentMonthKey, money } from "@/lib/finance";
import { useFinanceData } from "@/lib/use-finance-data";

const categoryColors = ["#0f172a", "#0891b2", "#16a34a", "#f59e0b", "#dc2626"];

export function DashboardClient() {
  const { expenses, income, recurringCosts, settings, loading, error } = useFinanceData();

  if (loading) return <LoadingState />;

  const metrics = dashboardMetrics(income, expenses, recurringCosts, getCurrentMonthKey());
  const chartRows = metrics.chartRows.length ? metrics.chartRows : [{ month: getCurrentMonthKey(), income: 0, expenses: 0, net: 0 }];

  const revenueExpenseRows = chartRows.map((row) => {
    const incomeAmount = Number(row.income ?? 0);
    const expenseAmount = Number(row.expenses ?? 0);
    const netAmount = Number(row.net ?? incomeAmount - expenseAmount);
    const margin = incomeAmount > 0 ? (netAmount / incomeAmount) * 100 : 0;

    return {
      ...row,
      incomeAmount,
      expenseAmount,
      netAmount,
      margin,
      status: netAmount >= 0 ? "Profit" : "Loss",
    };
  });

  return (
    <>
      <PageHeader
        title="Finance Dashboard"
        description="CFO-level control view for income, expenses, VAT, cash flow, and recurring burn."
      />
      {error ? <ErrorState message={error} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Income this month"
          value={money(metrics.totalIncome, settings.default_currency)}
          icon={<TrendingUp size={19} />}
          tone="green"
        />
        <MetricCard
          title="Expenses this month"
          value={money(metrics.totalExpenses, settings.default_currency)}
          icon={<TrendingDown size={19} />}
          tone="red"
        />
        <MetricCard
          title="Net profit / loss"
          value={money(metrics.netProfit, settings.default_currency)}
          icon={<Banknote size={19} />}
          tone={metrics.netProfit >= 0 ? "green" : "red"}
        />
        <MetricCard
          title="VAT claimable"
          value={money(metrics.vatClaimable, settings.default_currency)}
          icon={<Calculator size={19} />}
          tone="cyan"
        />
        <MetricCard
          title="VAT payable"
          value={money(metrics.vatPayable, settings.default_currency)}
          icon={<Wallet size={19} />}
          tone="amber"
        />
        <MetricCard
          title="Monthly burn rate"
          value={money(metrics.monthlyBurnRate, settings.default_currency)}
          icon={<CreditCard size={19} />}
          tone="slate"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <Card className="p-5">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">Revenue vs Expenses</h2>
              <p className="text-sm text-slate-600">Monthly performance with net result and profit margin.</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-right">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Current net</p>
              <p className={`mt-1 text-lg font-semibold ${metrics.netProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {money(metrics.netProfit, settings.default_currency)}
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Month</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Income</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Expenses</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Net</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Margin</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {revenueExpenseRows.map((row) => (
                  <tr key={row.month} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{row.month}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-emerald-700">
                      {money(row.incomeAmount, settings.default_currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-red-700">
                      {money(row.expenseAmount, settings.default_currency)}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${row.netAmount >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {money(row.netAmount, settings.default_currency)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700">
                      {row.incomeAmount > 0 ? `${row.margin.toFixed(1)}%` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.netAmount >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => money(Number(value), settings.default_currency)} />
                <Bar dataKey="income" fill="#16a34a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#dc2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-950">Top Expense Categories</h2>
            <p className="text-sm text-slate-600">Current month spend concentration.</p>
          </div>
          <div className="space-y-3">
            {metrics.topCategories.map((item, index) => (
              <div key={item.category}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-700">{item.category}</span>
                  <span className="text-slate-600">{money(item.amount, settings.default_currency)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.max(8, (item.amount / Math.max(metrics.topCategories[0]?.amount ?? 1, 1)) * 100)}%`,
                      backgroundColor: categoryColors[index] ?? "#64748b",
                    }}
                  />
                </div>
              </div>
            ))}
            {metrics.topCategories.length === 0 ? (
              <p className="rounded-md bg-slate-50 p-4 text-sm text-slate-500">No expenses captured this month.</p>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <Card className="p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-950">Cash Flow</h2>
            <p className="text-sm text-slate-600">Net position by month.</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartRows}>
                <defs>
                  <linearGradient id="netFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0891b2" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => money(Number(value), settings.default_currency)} />
                <Area type="monotone" dataKey="net" stroke="#0891b2" fill="url(#netFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-950">SaaS Recurring Costs</h2>
            <p className="text-sm text-slate-600">
              Active monthly burn: {money(metrics.recurringBurn, settings.default_currency)}
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={recurringCosts.filter((cost) => cost.status === "active")}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="service_name" tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={80} />
                <YAxis tickFormatter={(value) => `${Number(value) / 1000}k`} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value) => money(Number(value), settings.default_currency)} />
                <Line type="monotone" dataKey="monthly_cost" stroke="#0f172a" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </>
  );
}

function MetricCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone: "green" | "red" | "cyan" | "amber" | "slate";
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    red: "bg-red-50 text-red-700",
    cyan: "bg-cyan-50 text-cyan-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-700",
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium text-slate-600">{title}</div>
          <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
        </div>
        <div className={`rounded-md p-2 ${tones[tone]}`}>{icon}</div>
      </div>
    </Card>
  );
}
