"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ErrorState, LoadingState } from "@/components/loading-state";
import { Button, Card, Field, inputClass } from "@/components/ui";
import { exportCsv, exportExcel, exportPdf } from "@/lib/export";
import { filterByDateRange, getCurrentMonthKey, money } from "@/lib/finance";
import { useFinanceData } from "@/lib/use-finance-data";

type ReportType = "pnl" | "vat" | "cashflow" | "expense-breakdown" | "saas";

const reportTypes: { value: ReportType; label: string }[] = [
  { value: "pnl", label: "Monthly Profit & Loss" },
  { value: "vat", label: "VAT Report" },
  { value: "cashflow", label: "Cash Flow" },
  { value: "expense-breakdown", label: "Expense Breakdown" },
  { value: "saas", label: "SaaS Spend Report" },
];

export function ReportsClient() {
  const { expenses, income, recurringCosts, settings, loading, error } = useFinanceData();
  const [reportType, setReportType] = useState<ReportType>("pnl");
  const [month, setMonth] = useState(getCurrentMonthKey());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("");
  const [projectClient, setProjectClient] = useState("");

  const rows = useMemo(() => {
    const scopedExpenses = filterByDateRange(expenses, from, to).filter((expense) => {
      const monthMatch = !month || expense.date.startsWith(month);
      const categoryMatch = !category || expense.category === category;
      const projectMatch = !projectClient || expense.project_client === projectClient;
      return monthMatch && categoryMatch && projectMatch;
    });

    const scopedIncome = filterByDateRange(income, from, to).filter((row) => {
      const monthMatch = !month || row.date.startsWith(month);
      const categoryMatch = !category || row.category === category;
      const projectMatch = !projectClient || row.project === projectClient;
      return monthMatch && categoryMatch && projectMatch;
    });

    if (reportType === "vat") {
      return [
        ...scopedIncome.map((row) => ({
          type: "VAT payable",
          date: row.date,
          party: row.client,
          reference: row.invoice_number,
          category: row.category,
          vat_amount: row.vat_amount,
          total_amount: row.total_amount,
        })),
        ...scopedExpenses.map((row) => ({
          type: "VAT claimable",
          date: row.date,
          party: row.supplier,
          reference: row.invoice_reference,
          category: row.category,
          vat_amount: row.vat_amount,
          total_amount: row.total_amount,
        })),
      ];
    }

    if (reportType === "cashflow") {
      return [
        ...scopedIncome.map((row) => ({
          date: row.date,
          type: "Inflow",
          party: row.client,
          description: row.description,
          amount: row.total_amount,
        })),
        ...scopedExpenses.map((row) => ({
          date: row.date,
          type: "Outflow",
          party: row.supplier,
          description: row.description,
          amount: -row.total_amount,
        })),
      ].sort((a, b) => a.date.localeCompare(b.date));
    }

    if (reportType === "expense-breakdown") {
      return scopedExpenses.map((row) => ({
        date: row.date,
        supplier: row.supplier,
        category: row.category,
        subcategory: row.subcategory,
        project_client: row.project_client,
        department: row.department,
        total_amount: row.total_amount,
        status: row.status,
      }));
    }

    if (reportType === "saas") {
      return recurringCosts
        .filter((row) => !category || row.category === category)
        .map((row) => ({
          supplier: row.supplier,
          service_name: row.service_name,
          category: row.category,
          monthly_cost: row.monthly_cost,
          billing_cycle: row.billing_cycle,
          renewal_date: row.renewal_date,
          owner: row.owner,
          status: row.status,
        }));
    }

    const incomeTotal = scopedIncome.reduce((total, row) => total + row.total_amount, 0);
    const expenseTotal = scopedExpenses.reduce((total, row) => total + row.total_amount, 0);
    return [
      { metric: "Income", amount: incomeTotal },
      { metric: "Expenses", amount: expenseTotal },
      { metric: "Net Profit / Loss", amount: incomeTotal - expenseTotal },
      { metric: "VAT Payable", amount: scopedIncome.reduce((total, row) => total + row.vat_amount, 0) },
      { metric: "VAT Claimable", amount: scopedExpenses.reduce((total, row) => total + row.vat_amount, 0) },
    ];
  }, [category, expenses, from, income, month, projectClient, recurringCosts, reportType, to]);

  if (loading) return <LoadingState />;

  const activeReport = reportTypes.find((item) => item.value === reportType)?.label ?? "Report";
  const filename = `${reportType}-${month || "range"}`;

  return (
    <>
      <PageHeader
        title="Reports"
        description="Filter finance data and export operational reports for monthly review, VAT, cash flow, expenses, and SaaS spend."
        actions={
          <>
            <Button variant="secondary" onClick={() => exportCsv(`${filename}.csv`, rows)}>
              <Download size={16} />
              CSV
            </Button>
            <Button variant="secondary" onClick={() => exportExcel(`${filename}.xls`, rows)}>
              <Download size={16} />
              Excel
            </Button>
            <Button variant="secondary" onClick={() => exportPdf(activeReport, `${filename}.pdf`, rows)}>
              <Download size={16} />
              PDF
            </Button>
          </>
        }
      />
      {error ? <ErrorState message={error} /> : null}

      <Card className="mb-6 p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Report">
            <select value={reportType} onChange={(event) => setReportType(event.target.value as ReportType)} className={inputClass}>
              {reportTypes.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Month">
            <input value={month} onChange={(event) => setMonth(event.target.value)} type="month" className={inputClass} />
          </Field>
          <Field label="From">
            <input value={from} onChange={(event) => setFrom(event.target.value)} type="date" className={inputClass} />
          </Field>
          <Field label="To">
            <input value={to} onChange={(event) => setTo(event.target.value)} type="date" className={inputClass} />
          </Field>
          <Field label="Category">
            <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}>
              <option value="">All</option>
              {[...settings.expense_categories, ...settings.income_categories].map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </Field>
          <Field label="Project / Client">
            <select value={projectClient} onChange={(event) => setProjectClient(event.target.value)} className={inputClass}>
              <option value="">All</option>
              {settings.projects_clients.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-4">
          <h2 className="font-semibold text-slate-950">{activeReport}</h2>
          <p className="text-sm text-slate-600">{rows.length} rows ready for export.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {Object.keys(rows[0] ?? { empty: "No data" }).map((key) => (
                  <th key={key} className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => (
                <tr key={index} className="bg-white hover:bg-slate-50">
                  {Object.entries(row).map(([key, value]) => (
                    <td key={key} className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {typeof value === "number" && /amount|cost|income|expense|net|vat/i.test(key)
                        ? money(value, settings.default_currency)
                        : String(value ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
