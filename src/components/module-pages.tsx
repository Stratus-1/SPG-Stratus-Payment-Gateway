"use client";

import { PageHeader } from "@/components/page-header";
import { ErrorState, LoadingState } from "@/components/loading-state";
import { FinanceCrud, type FieldConfig } from "@/components/finance-crud";
import { accountLabelById, accountOptions, defaultAccountId } from "@/lib/accounts";
import { calculateTotal, calculateVat, getCurrentMonthKey, roundCurrency } from "@/lib/finance";
import { useFinanceData } from "@/lib/use-finance-data";

const statusOptions = ["draft", "pending", "approved", "paid", "rejected"];
const paymentStatusOptions = ["draft", "sent", "partially_paid", "paid", "overdue"];
const recurringStatusOptions = ["active", "paused", "cancelled"];
const paymentMethods = ["EFT", "Card", "Debit Order", "Cash", "Other"];

const billingCycles = ["Monthly", "Quarterly", "Annual"];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function toNullableUuid(value: unknown): string | null {
  return isValidUuid(value) ? value : null;
}

function parseCurrencyAmount(value: unknown): number {
  const normalized = String(value ?? "")
    .trim()
    .replace(/,/g, "");

  return Number.parseFloat(normalized || "0");
}

export function ExpensesPageClient() {
  const { accounts, expenses, settings, loading, error, reload } = useFinanceData();
  if (loading) return <LoadingState />;

  const expenseAccountOptions = accountOptions(accounts, ["expense", "cost_of_sales"]);
  const defaultExpenseAccountId = defaultAccountId(accounts, "6010", ["expense"]);
  const fields: FieldConfig[] = [
    { name: "date", label: "Date", type: "date", required: true },
    { name: "supplier", label: "Supplier", required: true },
    { name: "description", label: "Invoice / Expense Summary", required: true },
    { name: "category", label: "Category", type: "select", options: settings.expense_categories, required: true },
    { name: "account_id", label: "Account", type: "select", options: expenseAccountOptions, required: true },
    { name: "subcategory", label: "Subcategory" },
    { name: "payment_method", label: "Payment Method", type: "select", options: paymentMethods },
    { name: "invoice_reference", label: "Invoice / Receipt Number" },
    { name: "amount_excl_vat", label: "Invoice Total excl. VAT", type: "number", required: true },
    { name: "project_client", label: "Project / Client", type: "select", options: settings.projects_clients },
    { name: "department", label: "Department", type: "select", options: settings.departments },
    { name: "is_recurring", label: "Recurring", type: "checkbox" },
    { name: "recurring_frequency", label: "Recurring Frequency", type: "select", options: billingCycles },
    { name: "approved_by", label: "Approved By" },
    { name: "status", label: "Status", type: "select", options: statusOptions },
    { name: "attachment_url", label: "Existing attachment path" },
    { name: "notes", label: "Invoice Items / Breakdown", type: "textarea", full: true },
  ];

  return (
    <>
      <PageHeader title="Expenses" description="Capture supplier spend, VAT, approval status, project ownership, and receipts." />
      {error ? <ErrorState message={error} /> : null}
      <FinanceCrud
        table="expenses"
        rows={expenses.map((expense) => ({
          ...expense,
          account_label: accountLabelById(accounts, expense.account_id),
        }))}
        settings={settings}
        fields={fields}
        columns={[
          { key: "date", label: "Date" },
          { key: "supplier", label: "Supplier" },
          { key: "category", label: "Category" },
          { key: "account_label", label: "Account" },
          { key: "project_client", label: "Project / Client" },
          { key: "amount_excl_vat", label: "Invoice Excl. VAT", kind: "money" },
          { key: "vat_amount", label: "VAT", kind: "money" },
          { key: "total_amount", label: "Total", kind: "money" },
          { key: "status", label: "Status", kind: "status" },
        ]}
        defaultDraft={{
          date: new Date().toISOString().slice(0, 10),
          supplier: "",
          description: "",
          category: settings.expense_categories[0] ?? "",
          account_id: toNullableUuid(defaultExpenseAccountId) ?? "",
          subcategory: "",
          payment_method: "EFT",
          invoice_reference: "",
          amount_excl_vat: "",
          project_client: "",
          department: "",
          is_recurring: false,
          recurring_frequency: "",
          approved_by: "",
          status: "pending",
          notes: "",
          attachment_url: "",
        }}
        searchKeys={["supplier", "description", "category", "account_label", "project_client", "department", "invoice_reference"]}
        enableAttachmentUpload
        onReload={reload}
        buildPayload={(draft, companySettings) => {
          const amount = parseCurrencyAmount(draft.amount_excl_vat);
          const vat = calculateVat(amount, companySettings.vat_rate);
          return {
            date: String(draft.date),
            supplier: String(draft.supplier),
            description: String(draft.description),
            category: String(draft.category),
            account_id: toNullableUuid(draft.account_id),
            subcategory: String(draft.subcategory || ""),
            payment_method: String(draft.payment_method || ""),
            invoice_reference: String(draft.invoice_reference || ""),
            amount_excl_vat: amount,
            vat_amount: vat,
            total_amount: calculateTotal(amount, companySettings.vat_rate),
            project_client: String(draft.project_client || ""),
            department: String(draft.department || ""),
            is_recurring: Boolean(draft.is_recurring),
            recurring_frequency: String(draft.recurring_frequency || ""),
            approved_by: String(draft.approved_by || ""),
            status: String(draft.status || "pending"),
            notes: String(draft.notes || ""),
            attachment_url: String(draft.attachment_url || ""),
          };
        }}
      />
    </>
  );
}

export function IncomePageClient() {
  const { accounts, income, settings, loading, error, reload } = useFinanceData();
  if (loading) return <LoadingState />;

  const incomeAccountOptions = accountOptions(accounts, ["income"]);
  const defaultIncomeAccountId = defaultAccountId(accounts, "4200", ["income"]);

  return (
    <>
      <PageHeader title="Income" description="Track client revenue, invoices, VAT payable, payment status, and projects." />
      {error ? <ErrorState message={error} /> : null}
      <FinanceCrud
        table="income"
        rows={income.map((row) => ({
          ...row,
          account_label: accountLabelById(accounts, row.account_id),
        }))}
        settings={settings}
        fields={[
          { name: "date", label: "Date", type: "date", required: true },
          { name: "client", label: "Client", required: true },
          { name: "description", label: "Invoice / Revenue Summary", required: true },
          { name: "invoice_number", label: "Invoice Number / Quote Reference" },
          { name: "category", label: "Category", type: "select", options: settings.income_categories, required: true },
          { name: "account_id", label: "Account", type: "select", options: incomeAccountOptions, required: true },
          { name: "amount_excl_vat", label: "Invoice Total excl. VAT", type: "number", required: true },
          { name: "payment_status", label: "Payment Status", type: "select", options: paymentStatusOptions },
          { name: "project", label: "Project", type: "select", options: settings.projects_clients },
          { name: "notes", label: "Invoice Items / Breakdown", type: "textarea", full: true },
        ]}
        columns={[
          { key: "date", label: "Date" },
          { key: "client", label: "Client" },
          { key: "invoice_number", label: "Invoice" },
          { key: "category", label: "Category" },
          { key: "account_label", label: "Account" },
          { key: "amount_excl_vat", label: "Invoice Excl. VAT", kind: "money" },
          { key: "vat_amount", label: "VAT", kind: "money" },
          { key: "total_amount", label: "Total", kind: "money" },
          { key: "payment_status", label: "Status", kind: "status" },
        ]}
        defaultDraft={{
          date: new Date().toISOString().slice(0, 10),
          client: "",
          description: "",
          invoice_number: "",
          category: settings.income_categories[0] ?? "",
          account_id: toNullableUuid(defaultIncomeAccountId) ?? "",
          amount_excl_vat: "",
          payment_status: "sent",
          project: "",
          notes: "",
        }}
        searchKeys={["client", "description", "invoice_number", "category", "account_label", "project"]}
        onReload={reload}
        buildPayload={(draft, companySettings) => {
          const amount = parseCurrencyAmount(draft.amount_excl_vat);
          const vat = calculateVat(amount, companySettings.vat_rate);
          return {
            date: String(draft.date),
            client: String(draft.client),
            description: String(draft.description),
            invoice_number: String(draft.invoice_number || ""),
            category: String(draft.category),
            account_id: toNullableUuid(draft.account_id),
            amount_excl_vat: amount,
            vat_amount: vat,
            total_amount: calculateTotal(amount, companySettings.vat_rate),
            payment_status: String(draft.payment_status || "sent"),
            project: String(draft.project || ""),
            notes: String(draft.notes || ""),
          };
        }}
      />
    </>
  );
}

export function RecurringCostsPageClient() {
  const { accounts, recurringCosts, settings, loading, error, reload } = useFinanceData();
  if (loading) return <LoadingState />;

  const expenseAccountOptions = accountOptions(accounts, ["expense", "cost_of_sales"]);
  const defaultRecurringAccountId = defaultAccountId(accounts, "6010", ["expense"]);

  return (
    <>
      <PageHeader title="Recurring Costs" description="Control SaaS subscriptions, cloud services, renewal risk, and recurring burn." />
      {error ? <ErrorState message={error} /> : null}
      <FinanceCrud
        table="recurring_costs"
        rows={recurringCosts.map((cost) => ({
          ...cost,
          account_label: accountLabelById(accounts, cost.account_id),
        }))}
        settings={settings}
        fields={[
          { name: "supplier", label: "Supplier", required: true },
          { name: "service_name", label: "Service Name", required: true },
          { name: "category", label: "Category", type: "select", options: settings.expense_categories, required: true },
          { name: "account_id", label: "Account", type: "select", options: expenseAccountOptions, required: true },
          { name: "monthly_cost", label: "Cost", type: "number", required: true },
          { name: "billing_cycle", label: "Billing Cycle", type: "select", options: billingCycles },
          { name: "renewal_date", label: "Renewal Date", type: "date" },
          { name: "payment_method", label: "Payment Method", type: "select", options: paymentMethods },
          { name: "owner", label: "Owner" },
          { name: "status", label: "Status", type: "select", options: recurringStatusOptions },
          { name: "notes", label: "Notes", type: "textarea", full: true },
        ]}
        columns={[
          { key: "supplier", label: "Supplier" },
          { key: "service_name", label: "Service" },
          { key: "category", label: "Category" },
          { key: "account_label", label: "Account" },
          { key: "monthly_cost", label: "Cost", kind: "money" },
          { key: "billing_cycle", label: "Cycle" },
          { key: "renewal_date", label: "Renewal" },
          { key: "owner", label: "Owner" },
          { key: "status", label: "Status", kind: "status" },
        ]}
        defaultDraft={{
          supplier: "",
          service_name: "",
          category: settings.expense_categories[0] ?? "",
          account_id: toNullableUuid(defaultRecurringAccountId) ?? "",
          monthly_cost: "",
          billing_cycle: "Monthly",
          renewal_date: "",
          payment_method: "Card",
          owner: "",
          status: "active",
          notes: "",
        }}
        searchKeys={["supplier", "service_name", "category", "account_label", "owner", "status"]}
        onReload={reload}
        buildPayload={(draft) => ({
          supplier: String(draft.supplier),
          service_name: String(draft.service_name),
          category: String(draft.category),
          account_id: toNullableUuid(draft.account_id),
          monthly_cost: parseCurrencyAmount(draft.monthly_cost),
          billing_cycle: String(draft.billing_cycle || "Monthly"),
          renewal_date: draft.renewal_date ? String(draft.renewal_date) : null,
          payment_method: String(draft.payment_method || ""),
          owner: String(draft.owner || ""),
          status: String(draft.status || "active"),
          notes: String(draft.notes || ""),
        })}
      />
    </>
  );
}

export function BudgetsPageClient() {
  const { accounts, budgets, expenses, settings, loading, error, reload } = useFinanceData();
  if (loading) return <LoadingState />;

  const budgetAccountOptions = accountOptions(accounts, ["expense", "cost_of_sales"]);
  const defaultBudgetAccountId = defaultAccountId(accounts, "6010", ["expense"]);
  const actualisedBudgets = budgets.map((budget) => {
    const month = String(budget.month).slice(0, 7);
    const actual = expenses
      .filter((expense) => expense.category === budget.category && expense.date.startsWith(month))
      .reduce((total, expense) => total + expense.total_amount, 0);
    return {
      ...budget,
      month,
      account_label: accountLabelById(accounts, budget.account_id),
      actual_amount: roundCurrency(actual),
      variance: roundCurrency(budget.budget_amount - actual),
    };
  });

  return (
    <>
      <PageHeader title="Budget vs Actual" description="Budget by month and category; actuals are calculated from expense records." />
      {error ? <ErrorState message={error} /> : null}
      <FinanceCrud
        table="budgets"
        rows={actualisedBudgets}
        settings={settings}
        fields={[
          { name: "month", label: "Month", type: "month", required: true },
          { name: "category", label: "Category", type: "select", options: settings.expense_categories, required: true },
          { name: "account_id", label: "Account", type: "select", options: budgetAccountOptions, required: true },
          { name: "budget_amount", label: "Budget Amount", type: "number", required: true },
        ]}
        columns={[
          { key: "month", label: "Month" },
          { key: "category", label: "Category" },
          { key: "account_label", label: "Account" },
          { key: "budget_amount", label: "Budget", kind: "money" },
          { key: "actual_amount", label: "Actual", kind: "money" },
          { key: "variance", label: "Variance", kind: "money" },
        ]}
        defaultDraft={{
          month: getCurrentMonthKey(),
          category: settings.expense_categories[0] ?? "",
          account_id: toNullableUuid(defaultBudgetAccountId) ?? "",
          budget_amount: "",
        }}
        searchKeys={["month", "category", "account_label"]}
        onReload={reload}
        buildPayload={(draft) => ({
          month: `${String(draft.month)}-01`,
          category: String(draft.category),
          account_id: toNullableUuid(draft.account_id),
          budget_amount: parseCurrencyAmount(draft.budget_amount),
          actual_amount: 0,
          variance: parseCurrencyAmount(draft.budget_amount),
        })}
      />
    </>
  );
}
