import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth } from "date-fns";
import type { Budget, Expense, Income, RecurringCost } from "@/lib/types";

export function money(value: number, currency = "ZAR") {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function percentage(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;
}

export function calculateVat(amountExclVat: number, vatRate: number) {
  return roundCurrency(amountExclVat * (vatRate / 100));
}

export function calculateTotal(amountExclVat: number, vatRate: number) {
  return roundCurrency(amountExclVat + calculateVat(amountExclVat, vatRate));
}

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getCurrentMonthKey() {
  return format(new Date(), "yyyy-MM");
}

export function filterByMonth<T extends { date: string }>(rows: T[], month = getCurrentMonthKey()) {
  return rows.filter((row) => row.date?.startsWith(month));
}

export function filterByDateRange<T extends { date: string }>(
  rows: T[],
  from?: string,
  to?: string,
) {
  if (!from && !to) return rows;
  const start = from ? parseISO(from) : new Date("2000-01-01");
  const end = to ? parseISO(to) : new Date("2100-12-31");
  return rows.filter((row) =>
    isWithinInterval(parseISO(row.date), {
      start,
      end,
    }),
  );
}

export function topExpenseCategories(expenses: Expense[], limit = 5) {
  const totals = new Map<string, number>();
  expenses.forEach((expense) => {
    totals.set(expense.category, (totals.get(expense.category) ?? 0) + expense.total_amount);
  });

  return [...totals.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
}

export function monthSeries(income: Income[], expenses: Expense[]) {
  const buckets = new Map<string, { month: string; income: number; expenses: number; net: number }>();

  const ensure = (date: string) => {
    const month = date.slice(0, 7);
    if (!buckets.has(month)) {
      buckets.set(month, { month, income: 0, expenses: 0, net: 0 });
    }
    return buckets.get(month)!;
  };

  income.forEach((row) => {
    const bucket = ensure(row.date);
    bucket.income += row.total_amount;
  });

  expenses.forEach((row) => {
    const bucket = ensure(row.date);
    bucket.expenses += row.total_amount;
  });

  return [...buckets.values()]
    .map((bucket) => ({
      ...bucket,
      income: roundCurrency(bucket.income),
      expenses: roundCurrency(bucket.expenses),
      net: roundCurrency(bucket.income - bucket.expenses),
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

export function dashboardMetrics(
  income: Income[],
  expenses: Expense[],
  recurringCosts: RecurringCost[],
  month = getCurrentMonthKey(),
) {
  const monthIncome = filterByMonth(income, month);
  const monthExpenses = filterByMonth(expenses, month);
  const totalIncome = sum(monthIncome, "total_amount");
  const totalExpenses = sum(monthExpenses, "total_amount");
  const monthRecurring = recurringCosts
    .filter((cost) => cost.status === "active")
    .reduce((total, cost) => total + normaliseMonthlyCost(cost.monthly_cost, cost.billing_cycle), 0);

  return {
    totalIncome: roundCurrency(totalIncome),
    totalExpenses: roundCurrency(totalExpenses),
    netProfit: roundCurrency(totalIncome - totalExpenses),
    vatClaimable: roundCurrency(sum(monthExpenses, "vat_amount")),
    vatPayable: roundCurrency(sum(monthIncome, "vat_amount")),
    monthlyBurnRate: roundCurrency(totalExpenses + monthRecurring),
    recurringBurn: roundCurrency(monthRecurring),
    topCategories: topExpenseCategories(monthExpenses),
    chartRows: monthSeries(income, expenses),
  };
}

export function budgetRowsWithActuals(budgets: Budget[], expenses: Expense[]) {
  return budgets.map((budget) => {
    const actual = expenses
      .filter(
        (expense) =>
          expense.category === budget.category &&
          expense.date.startsWith(budget.month.slice(0, 7)),
      )
      .reduce((total, expense) => total + expense.total_amount, 0);

    return {
      ...budget,
      actual_amount: roundCurrency(actual),
      variance: roundCurrency(budget.budget_amount - actual),
    };
  });
}

export function normaliseMonthlyCost(amount: number, billingCycle: string) {
  const cycle = billingCycle.toLowerCase();
  if (cycle.includes("annual") || cycle.includes("year")) return amount / 12;
  if (cycle.includes("quarter")) return amount / 3;
  return amount;
}

export function monthBounds(month: string) {
  const parsed = parseISO(`${month}-01`);
  return {
    from: format(startOfMonth(parsed), "yyyy-MM-dd"),
    to: format(endOfMonth(parsed), "yyyy-MM-dd"),
  };
}

function sum<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

