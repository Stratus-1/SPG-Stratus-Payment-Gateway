"use client";

import { Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ErrorState, LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Button, Card, Field, inputClass, textareaClass } from "@/components/ui";
import { accountLabel } from "@/lib/accounts";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { Account, AccountType, NormalBalance } from "@/lib/types";
import { useFinanceData } from "@/lib/use-finance-data";

const accountTypes: AccountType[] = [
  "asset",
  "liability",
  "equity",
  "income",
  "cost_of_sales",
  "expense",
];

const normalBalances: NormalBalance[] = ["debit", "credit"];

function getDefaultNormalBalance(accountType: AccountType): NormalBalance {
  return ["asset", "expense", "cost_of_sales"].includes(accountType) ? "debit" : "credit";
}

const blankDraft = {
  code: "",
  name: "",
  account_type: "asset" as AccountType,
  normal_balance: "debit" as NormalBalance,
  parent_account_id: "",
  description: "",
  is_active: true,
  sort_order: "",
};

export function AccountsClient() {
  const { accounts, loading, error, reload } = useFinanceData();
  const [draft, setDraft] = useState(blankDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedAccountType = draft.account_type;

  const filteredAccounts = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return accounts
      .filter((account) => {
        if (!needle) return true;
        return [
          account.code,
          account.name,
          account.account_type,
          account.normal_balance,
          account.description ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      })
      .sort((a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code));
  }, [accounts, search]);

  if (loading) return <LoadingState />;

  const rootOptions = accounts
    .filter((account) => account.parent_account_id === null)
    .sort((a, b) => a.sort_order - b.sort_order);

  function edit(account: Account) {
    setEditingId(account.id);
    setDraft({
      code: account.code,
      name: account.name,
      account_type: account.account_type,
      normal_balance: account.normal_balance,
      parent_account_id: account.parent_account_id ?? "",
      description: account.description ?? "",
      is_active: account.is_active,
      sort_order: String(account.sort_order),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setDraft(blankDraft);
    setEditingId(null);
    setSaveError(null);
  }

  function parseCurrencyInput(value: unknown): number {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return 0;

    const normalized = value
      .trim()
      .replace(/,/g, "")
      .replace(/\s/g, "");

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  async function save() {
    setSaving(true);
    setSaveError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const payload = {
        code: draft.code.trim(),
        name: draft.name.trim(),
        account_type: draft.account_type,
        normal_balance: draft.normal_balance,
        parent_account_id: draft.parent_account_id || null,
        description: draft.description.trim(),
        is_active: draft.is_active,
        is_system: editingId
          ? accounts.find((account) => account.id === editingId)?.is_system ?? false
          : false,
        sort_order: Number(draft.sort_order || draft.code || 0),
      };

      const result = editingId
        ? await supabase.from("accounts").update(payload).eq("id", editingId)
        : await supabase.from("accounts").insert(payload);

      if (result.error) throw result.error;
      reset();
      await reload();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Could not save account.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(account: Account) {
    if (account.is_system) {
      setSaveError("System accounts cannot be deleted. Deactivate them only if they should not be selectable.");
      return;
    }
    if (!window.confirm(`Delete ${accountLabel(account)}?`)) return;

    setSaving(true);
    setSaveError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const result = await supabase.from("accounts").delete().eq("id", account.id);
      if (result.error) throw result.error;
      await reload();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Could not delete account.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Chart of Accounts"
        description="Manage your Chart of Accounts for income, expenses, assets, liabilities, equity, and cost of sales."
      />
      {error ? <ErrorState message={error} /> : null}
      {saveError ? <ErrorState message={saveError} /> : null}

      <Card className="mb-6 p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-950">
              {editingId ? "Edit account" : "New account"}
            </h2>
            <p className="text-sm text-slate-600">
              Use codes like 1000 Assets, 4000 Income, and 6000 Expenses. Parent accounts keep reporting clean.
            </p>
          </div>
          {editingId ? (
            <Button variant="ghost" onClick={reset}>
              <X size={16} />
              Cancel
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Code">
            <input
              value={draft.code}
              onChange={(event) => {
                const value = event.target.value;
                setDraft((current) => ({
                  ...current,
                  code: value,
                  sort_order: current.sort_order || value,
                }));
              }}
              className={inputClass}
              placeholder="e.g. 6010"
            />
          </Field>
          <Field label="Name">
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              className={inputClass}
              placeholder="e.g. Software Subscriptions"
            />
          </Field>
          <Field label="Account Type">
            <select
              value={draft.account_type}
              onChange={(event) => {
                const accountType = event.target.value as AccountType;
                setDraft((current) => ({
                  ...current,
                  account_type: accountType,
                  normal_balance: getDefaultNormalBalance(accountType),
                }));
              }}
              className={inputClass}
            >
              {accountTypes.map((type) => (
                <option key={type} value={type}>
                  {formatAccountType(type)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Normal Balance">
            <select
              value={draft.normal_balance}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  normal_balance: event.target.value as NormalBalance,
                }))
              }
              className={inputClass}
            >
              {normalBalances.map((balance) => (
                <option key={balance} value={balance}>
                  {capitalize(balance)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Parent Account">
            <select
              value={draft.parent_account_id}
              onChange={(event) =>
                setDraft((current) => ({ ...current, parent_account_id: event.target.value }))
              }
              className={inputClass}
            >
              <option value="">None / root account</option>
              {rootOptions
                .filter((account) => account.id !== editingId)
                .filter((account) => account.account_type === selectedAccountType)
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {accountLabel(account)}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Sort Order">
            <input
              value={draft.sort_order}
              onChange={(event) =>
                setDraft((current) => ({ ...current, sort_order: event.target.value }))
              }
              type="number"
              className={inputClass}
              placeholder="Usually same as code"
            />
          </Field>
          <Field label="Active">
            <input
              type="checkbox"
              checked={draft.is_active}
              onChange={(event) =>
                setDraft((current) => ({ ...current, is_active: event.target.checked }))
              }
              className="size-5 rounded border-slate-300"
            />
          </Field>
          <Field label="Description" className="md:col-span-2 xl:col-span-4">
            <textarea
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              className={textareaClass}
              placeholder="Optional note for what this account is used for"
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={save} disabled={saving || !draft.code || !draft.name}>
            {editingId ? <Save size={16} /> : <Plus size={16} />}
            {editingId ? "Save account" : "Create account"}
          </Button>
        </div>
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Quick setup guide</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <p><span className="font-medium">Assets:</span> 1000–1999, debit balance</p>
            <p><span className="font-medium">Liabilities:</span> 2000–2999, credit balance</p>
            <p><span className="font-medium">Equity:</span> 3000–3999, credit balance</p>
            <p><span className="font-medium">Income:</span> 4000–4999, credit balance</p>
            <p><span className="font-medium">Cost of sales:</span> 5000–5999, debit balance</p>
            <p><span className="font-medium">Expenses:</span> 6000–6999, debit balance</p>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">Accounts</h2>
            <p className="text-sm text-slate-600">{filteredAccounts.length} configured accounts</p>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search accounts"
            className={`${inputClass} w-full sm:w-72`}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Code</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Balance</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Parent Account</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Sort</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredAccounts.map((account) => {
                const parent = accounts.find((item) => item.id === account.parent_account_id);
                return (
                  <tr key={account.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-800">{account.code}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">{account.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatAccountType(account.account_type)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{capitalize(account.normal_balance)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">{parent ? accountLabel(parent) : "Root"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {account.is_active ? "Active" : "Inactive"}
                      {account.is_system ? " / System" : ""}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-slate-700">{account.sort_order}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" className="h-8 px-2" onClick={() => edit(account)}>
                          <Edit3 size={14} />
                        </Button>
                        <Button variant="danger" className="h-8 px-2" onClick={() => remove(account)}>
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function formatAccountType(type: AccountType) {
  return type
    .split("_")
    .map((part) => capitalize(part))
    .join(" ");
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
