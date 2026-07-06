"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { ErrorState, LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Button, Card, Field, inputClass, textareaClass } from "@/components/ui";
import { DEFAULT_SETTINGS } from "@/lib/defaults";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { CompanySettings } from "@/lib/types";
import { useFinanceData } from "@/lib/use-finance-data";

export function SettingsClient() {
  const { settings, loading, error, reload } = useFinanceData();
  const [draft, setDraft] = useState<CompanySettings>(DEFAULT_SETTINGS);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    // The editable settings form must refresh when Supabase returns the singleton row.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDraft(settings);
  }, [settings]);

  if (loading) return <LoadingState />;

  function update<K extends keyof CompanySettings>(key: K, value: CompanySettings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setSaveError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const result = await supabase.from("company_settings").upsert({
        id: 1,
        company_name: draft.company_name,
        vat_rate: Number(draft.vat_rate),
        default_currency: draft.default_currency,
        expense_categories: draft.expense_categories,
        income_categories: draft.income_categories,
        departments: draft.departments,
        projects_clients: draft.projects_clients,
      });

      if (result.error) throw result.error;
      await reload();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Settings"
        description="Single-company finance configuration for VAT, currency, categories, departments, and projects."
        actions={
          <Button onClick={save} disabled={saving}>
            <Save size={16} />
            Save settings
          </Button>
        }
      />
      {error ? <ErrorState message={error} /> : null}
      {saveError ? <ErrorState message={saveError} /> : null}

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Company Name">
            <input
              value={draft.company_name}
              onChange={(event) => update("company_name", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Default Currency">
            <input
              value={draft.default_currency}
              onChange={(event) => update("default_currency", event.target.value.toUpperCase())}
              className={inputClass}
            />
          </Field>
          <Field label="VAT Rate (%)">
            <input
              value={draft.vat_rate}
              onChange={(event) => update("vat_rate", Number(event.target.value))}
              type="number"
              className={inputClass}
            />
          </Field>
          <Field label="Expense Categories">
            <textarea
              value={draft.expense_categories.join("\n")}
              onChange={(event) => update("expense_categories", lines(event.target.value))}
              className={textareaClass}
            />
          </Field>
          <Field label="Income Categories">
            <textarea
              value={draft.income_categories.join("\n")}
              onChange={(event) => update("income_categories", lines(event.target.value))}
              className={textareaClass}
            />
          </Field>
          <Field label="Departments">
            <textarea
              value={draft.departments.join("\n")}
              onChange={(event) => update("departments", lines(event.target.value))}
              className={textareaClass}
            />
          </Field>
          <Field label="Projects / Clients">
            <textarea
              value={draft.projects_clients.join("\n")}
              onChange={(event) => update("projects_clients", lines(event.target.value))}
              className={textareaClass}
            />
          </Field>
        </div>
      </Card>
    </>
  );
}

function lines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
