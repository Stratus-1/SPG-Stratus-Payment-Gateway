"use client";

import { Edit3, FileUp, Plus, Save, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateTotal, calculateVat, money } from "@/lib/finance";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { CompanySettings } from "@/lib/types";
import { Button, Card, Field, inputClass, StatusBadge, textareaClass } from "@/components/ui";

type RecordValue = string | number | boolean | null | undefined;
type FinanceRecord = Record<string, RecordValue> & { id?: string };
type Draft = Record<string, string | boolean>;
type TableName = "expenses" | "income" | "recurring_costs" | "budgets";
type SelectOption = string | { value: string; label: string };

export type FieldConfig = {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "month" | "select" | "textarea" | "checkbox";
  options?: SelectOption[];
  required?: boolean;
  full?: boolean;
  readOnly?: boolean;
};

export type ColumnConfig = {
  key: string;
  label: string;
  kind?: "money" | "status" | "boolean" | "date";
};

export function FinanceCrud({
  table,
  rows,
  settings,
  fields,
  columns,
  defaultDraft,
  searchKeys,
  buildPayload,
  onReload,
  enableAttachmentUpload = false,
}: {
  table: TableName;
  rows: FinanceRecord[];
  settings: CompanySettings;
  fields: FieldConfig[];
  columns: ColumnConfig[];
  defaultDraft: Draft;
  searchKeys: string[];
  buildPayload: (draft: Draft, settings: CompanySettings) => FinanceRecord;
  onReload: () => Promise<void>;
  enableAttachmentUpload?: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(defaultDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);

  const filteredRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      searchKeys.some((key) => String(row[key] ?? "").toLowerCase().includes(needle)),
    );
  }, [rows, search, searchKeys]);

  const amount = Number(draft.amount_excl_vat ?? 0);
  const hasVatFields = "amount_excl_vat" in draft;
  const vatPreview = hasVatFields ? calculateVat(amount, settings.vat_rate) : 0;
  const totalPreview = hasVatFields ? calculateTotal(amount, settings.vat_rate) : 0;

  function updateField(name: string, value: string | boolean) {
    setDraft((current) => ({ ...current, [name]: value }));
  }

  function editRow(row: FinanceRecord) {
    const nextDraft: Draft = { ...defaultDraft };
    Object.keys(nextDraft).forEach((key) => {
      const value = row[key];
      nextDraft[key] = typeof value === "boolean" ? value : String(value ?? "");
    });
    setDraft(nextDraft);
    setEditingId(String(row.id));
    setAttachment(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setDraft(defaultDraft);
    setEditingId(null);
    setAttachment(null);
    setError(null);
  }

  async function saveRecord() {
    setSaving(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      let attachmentUrl = String(draft.attachment_url ?? "");

      if (enableAttachmentUpload && attachment) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("You must be signed in to upload attachments.");

        const cleanName = attachment.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${user.id}/${table}/${Date.now()}-${cleanName}`;
        const upload = await supabase.storage
          .from("finance-attachments")
          .upload(path, attachment, { upsert: false });
        if (upload.error) throw upload.error;
        attachmentUrl = upload.data.path;
      }

      const payload = buildPayload(
        {
          ...draft,
          attachment_url: attachmentUrl,
        },
        settings,
      );

      const result = editingId
        ? await supabase.from(table).update(payload).eq("id", editingId)
        : await supabase.from(table).insert(payload);

      if (result.error) throw result.error;

      resetForm();
      await onReload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save record.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(id: string) {
    if (!window.confirm("Delete this record?")) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const result = await supabase.from(table).delete().eq("id", id);
      if (result.error) throw result.error;
      await onReload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              {editingId ? "Edit record" : "New record"}
            </h2>
            {hasVatFields ? (
              <p className="mt-1 text-sm text-slate-600">
                VAT preview: {money(vatPreview, settings.default_currency)} | Total:{" "}
                {money(totalPreview, settings.default_currency)}
              </p>
            ) : null}
          </div>
          {editingId ? (
            <Button variant="ghost" onClick={resetForm}>
              <X size={16} />
              Cancel
            </Button>
          ) : null}
        </div>

        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {fields.map((field) => (
            <Field
              key={field.name}
              label={field.label}
              className={field.full ? "md:col-span-2 xl:col-span-4" : ""}
            >
              {renderField(field, draft[field.name], updateField)}
            </Field>
          ))}
          {enableAttachmentUpload ? (
            <Field label="Invoice / receipt upload" className="md:col-span-2 xl:col-span-4">
              <div className="flex items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-3">
                <FileUp size={18} className="text-slate-500" />
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(event) => setAttachment(event.target.files?.[0] ?? null)}
                  className="text-sm text-slate-700"
                />
              </div>
            </Field>
          ) : null}
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={saveRecord} disabled={saving}>
            {editingId ? <Save size={16} /> : <Plus size={16} />}
            {editingId ? "Save changes" : "Create record"}
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">Records</h2>
            <p className="text-sm text-slate-600">{filteredRows.length} visible rows</p>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search records"
            className={`${inputClass} w-full sm:w-72`}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className="whitespace-nowrap px-4 py-3 text-left font-semibold text-slate-600"
                  >
                    {column.label}
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredRows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  {columns.map((column) => (
                    <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatCell(row[column.key], column.kind, settings.default_currency)}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" className="h-8 px-2" onClick={() => editRow(row)}>
                        <Edit3 size={14} />
                      </Button>
                      <Button
                        variant="danger"
                        className="h-8 px-2"
                        onClick={() => row.id && deleteRecord(String(row.id))}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={columns.length + 1}>
                    No records found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function renderField(
  field: FieldConfig,
  value: string | boolean | undefined,
  updateField: (name: string, value: string | boolean) => void,
) {
  if (field.type === "textarea") {
    return (
      <textarea
        value={String(value ?? "")}
        onChange={(event) => updateField(field.name, event.target.value)}
        className={textareaClass}
      />
    );
  }

  if (field.type === "select") {
    return (
      <select
        value={String(value ?? "")}
        onChange={(event) => updateField(field.name, event.target.value)}
        className={inputClass}
        required={field.required}
      >
        <option value="">Select...</option>
        {(field.options ?? []).map((option) => (
          <option key={typeof option === "string" ? option : option.value} value={typeof option === "string" ? option : option.value}>
            {typeof option === "string" ? option : option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "checkbox") {
    return (
      <input
        type="checkbox"
        checked={Boolean(value)}
        onChange={(event) => updateField(field.name, event.target.checked)}
        className="size-5 rounded border-slate-300 text-slate-950"
      />
    );
  }

  return (
    <input
      value={String(value ?? "")}
      onChange={(event) => updateField(field.name, event.target.value)}
      type={field.type ?? "text"}
      readOnly={field.readOnly}
      required={field.required}
      className={inputClass}
    />
  );
}

function formatCell(value: RecordValue, kind: ColumnConfig["kind"], currency: string) {
  if (kind === "money") return money(Number(value ?? 0), currency);
  if (kind === "boolean") return value ? "Yes" : "No";
  if (kind === "status") return <StatusBadge>{String(value ?? "draft").replaceAll("_", " ")}</StatusBadge>;
  return String(value ?? "-");
}
