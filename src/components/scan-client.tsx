"use client";

import { Camera, Check, FileImage, ReceiptText, Save } from "lucide-react";
import { createWorker } from "tesseract.js";
import { useState } from "react";
import { ErrorState, LoadingState } from "@/components/loading-state";
import { PageHeader } from "@/components/page-header";
import { Button, Card, Field, inputClass, textareaClass } from "@/components/ui";
import { accountOptions, defaultAccountId } from "@/lib/accounts";
import { calculateTotal, calculateVat, money, roundCurrency } from "@/lib/finance";
import { parseScannedFinanceDocument, type ScannedDocument } from "@/lib/scan-parser";
import { getSupabaseBrowserClient, hasSupabaseConfig } from "@/lib/supabase";
import { useFinanceData } from "@/lib/use-finance-data";

type TargetType = "expense" | "income" | "recurring";

export function ScanClient() {
  const { accounts, settings, loading, error, reload } = useFinanceData();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [target, setTarget] = useState<TargetType>("expense");
  const [scan, setScan] = useState<ScannedDocument | null>(null);
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [department, setDepartment] = useState("");
  const [projectClient, setProjectClient] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Card");
  const [status, setStatus] = useState("pending");

  if (loading) return <LoadingState />;

  const targetAccountOptions =
    target === "income"
      ? accountOptions(accounts, ["income"])
      : accountOptions(accounts, ["expense", "cost_of_sales"]);

  function defaultAccountForTarget(nextTarget: TargetType) {
    if (nextTarget === "income") return defaultAccountId(accounts, "4200", ["income"]);
    return defaultAccountId(accounts, "6010", ["expense"]);
  }

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setScan(null);
    setScanError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : "");
  }

  async function scanImage() {
    if (!file) return;
    setScanning(true);
    setScanError(null);
    setProgress("Preparing OCR worker...");

    try {
      const worker = await createWorker("eng", 1, {
        logger: (event) => {
          if (event.status) {
            const pct = event.progress ? ` ${Math.round(event.progress * 100)}%` : "";
            setProgress(`${event.status}${pct}`);
          }
        },
      });
      const result = await worker.recognize(file);
      await worker.terminate();

      const parsed = parseScannedFinanceDocument(result.data.text, settings.vat_rate);
      setScan(parsed);
      setCategory(
        target === "income"
          ? settings.income_categories[0] ?? ""
          : settings.expense_categories[0] ?? "",
      );
      setAccountId(defaultAccountForTarget(target));
    } catch (cause) {
      setScanError(cause instanceof Error ? cause.message : "Could not scan this image.");
    } finally {
      setScanning(false);
      setProgress("");
    }
  }

  function updateMoney(field: "amountExclVat" | "vatAmount" | "totalAmount", value: string) {
    const amount = Number(value);
    setScan((current) => {
      if (!current) return current;
      const next = { ...current, [field]: amount };
      if (field === "amountExclVat") {
        next.vatAmount = calculateVat(amount, settings.vat_rate);
        next.totalAmount = calculateTotal(amount, settings.vat_rate);
      }
      if (field === "totalAmount") {
        next.amountExclVat = roundCurrency(amount / (1 + settings.vat_rate / 100));
        next.vatAmount = roundCurrency(amount - next.amountExclVat);
      }
      return next;
    });
  }

  async function saveScan() {
    if (!scan || !hasSupabaseConfig()) return;
    setSaving(true);
    setScanError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      let attachmentUrl = "";

      if (file) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("You must be signed in to save scanned documents.");
        const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${user.id}/scans/${Date.now()}-${cleanName}`;
        const upload = await supabase.storage
          .from("finance-attachments")
          .upload(path, file, { upsert: false });
        if (upload.error) throw upload.error;
        attachmentUrl = upload.data.path;
      }

      const notes = [
        scan.lineItems.length
          ? `Scanned line items:\n${scan.lineItems.map((item) => `- ${item.description}: ${money(item.amount, settings.default_currency)}`).join("\n")}`
          : "",
        scan.confidenceNotes.length ? `OCR notes:\n${scan.confidenceNotes.join("\n")}` : "",
        `Raw OCR:\n${scan.rawText}`,
      ]
        .filter(Boolean)
        .join("\n\n");

      if (target === "income") {
        const result = await supabase.from("income").insert({
          date: scan.date,
          client: scan.party,
          description: scan.description,
          invoice_number: scan.invoiceReference,
          category: category || settings.income_categories[0] || "Consulting",
          account_id: accountId || defaultAccountForTarget("income") || null,
          amount_excl_vat: scan.amountExclVat,
          vat_amount: scan.vatAmount,
          total_amount: scan.totalAmount,
          payment_status: "sent",
          project: projectClient,
          notes,
        });
        if (result.error) throw result.error;
      } else if (target === "recurring") {
        const result = await supabase.from("recurring_costs").insert({
          supplier: scan.party,
          service_name: scan.description,
          category: category || settings.expense_categories[0] || "Software & SaaS",
          account_id: accountId || defaultAccountForTarget("recurring") || null,
          monthly_cost: scan.totalAmount,
          billing_cycle: "Monthly",
          renewal_date: null,
          payment_method: paymentMethod,
          owner: "",
          status: "active",
          notes,
        });
        if (result.error) throw result.error;
      } else {
        const result = await supabase.from("expenses").insert({
          date: scan.date,
          supplier: scan.party,
          description: scan.description,
          category: category || settings.expense_categories[0] || "Software & SaaS",
          account_id: accountId || defaultAccountForTarget("expense") || null,
          subcategory: "",
          payment_method: paymentMethod,
          invoice_reference: scan.invoiceReference,
          amount_excl_vat: scan.amountExclVat,
          vat_amount: scan.vatAmount,
          total_amount: scan.totalAmount,
          project_client: projectClient,
          department,
          is_recurring: false,
          recurring_frequency: "",
          approved_by: "",
          status,
          notes,
          attachment_url: attachmentUrl,
        });
        if (result.error) throw result.error;
      }

      await reload();
      setScanError("Saved successfully.");
      setScan(null);
      selectFile(null);
    } catch (cause) {
      setScanError(cause instanceof Error ? cause.message : "Could not save scanned document.");
    } finally {
      setSaving(false);
    }
  }

  const targetCategories = target === "income" ? settings.income_categories : settings.expense_categories;

  return (
    <>
      <PageHeader
        title="Scan Document"
        description="Take a photo or upload an invoice/receipt, extract the finance data, then save it as an expense, income item, or recurring cost."
      />
      {error ? <ErrorState message={error} /> : null}
      {scanError ? <ErrorState message={scanError} /> : null}

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-md bg-cyan-50 p-2 text-cyan-700">
              <Camera size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-950">Capture</h2>
              <p className="text-sm text-slate-600">Use camera on mobile or upload an image.</p>
            </div>
          </div>

          <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:bg-slate-100">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Document preview" className="max-h-80 rounded-md object-contain" />
            ) : (
              <>
                <FileImage className="mb-3 text-slate-500" size={32} />
                <span className="text-sm font-medium text-slate-800">Choose or take photo</span>
                <span className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP supported</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            />
          </label>

          <Button className="mt-4 w-full" onClick={scanImage} disabled={!file || scanning}>
            <ReceiptText size={16} />
            {scanning ? "Scanning..." : "Scan image"}
          </Button>
          {progress ? <p className="mt-3 text-sm text-slate-600">{progress}</p> : null}
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-950">Review & Save</h2>
            <p className="text-sm text-slate-600">Check the extracted values before creating a finance record.</p>
          </div>

          {!scan ? (
            <div className="rounded-md bg-slate-50 p-8 text-center text-sm text-slate-500">
              Scan a document to populate this form.
            </div>
          ) : (
            <div className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Save As">
                  <select
                    value={target}
                    onChange={(event) => {
                      const nextTarget = event.target.value as TargetType;
                      setTarget(nextTarget);
                      setCategory(
                        nextTarget === "income"
                          ? settings.income_categories[0] ?? ""
                          : settings.expense_categories[0] ?? "",
                      );
                      setAccountId(defaultAccountForTarget(nextTarget));
                    }}
                    className={inputClass}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                    <option value="recurring">Recurring Cost</option>
                  </select>
                </Field>
                <Field label="Date">
                  <input value={scan.date} onChange={(event) => setScan({ ...scan, date: event.target.value })} type="date" className={inputClass} />
                </Field>
                <Field label={target === "income" ? "Client" : "Supplier"}>
                  <input value={scan.party} onChange={(event) => setScan({ ...scan, party: event.target.value })} className={inputClass} />
                </Field>
                <Field label="Reference">
                  <input value={scan.invoiceReference} onChange={(event) => setScan({ ...scan, invoiceReference: event.target.value })} className={inputClass} />
                </Field>
                <Field label="Category">
                  <select value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass}>
                    <option value="">Select...</option>
                    {targetCategories.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Account">
                  <select
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select...</option>
                    {targetAccountOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Project / Client">
                  <select value={projectClient} onChange={(event) => setProjectClient(event.target.value)} className={inputClass}>
                    <option value="">None</option>
                    {settings.projects_clients.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Department">
                  <select value={department} onChange={(event) => setDepartment(event.target.value)} className={inputClass}>
                    <option value="">None</option>
                    {settings.departments.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Payment Method">
                  <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className={inputClass}>
                    {["Card", "EFT", "Debit Order", "Cash", "Other"].map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Amount excl. VAT">
                  <input value={scan.amountExclVat} onChange={(event) => updateMoney("amountExclVat", event.target.value)} type="number" className={inputClass} />
                </Field>
                <Field label="VAT">
                  <input value={scan.vatAmount} onChange={(event) => updateMoney("vatAmount", event.target.value)} type="number" className={inputClass} />
                </Field>
                <Field label="Total">
                  <input value={scan.totalAmount} onChange={(event) => updateMoney("totalAmount", event.target.value)} type="number" className={inputClass} />
                </Field>
                <Field label="Status">
                  <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
                    {["pending", "approved", "paid", "draft"].map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Description" className="md:col-span-2 xl:col-span-4">
                  <textarea value={scan.description} onChange={(event) => setScan({ ...scan, description: event.target.value })} className={textareaClass} />
                </Field>
              </div>

              <div className="rounded-lg border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
                  Detected line items
                </div>
                <div className="divide-y divide-slate-100">
                  {scan.lineItems.map((item, index) => (
                    <div key={`${item.description}-${index}`} className="flex items-center justify-between gap-4 px-4 py-2 text-sm">
                      <span className="text-slate-700">{item.description}</span>
                      <span className="font-medium text-slate-950">{money(item.amount, settings.default_currency)}</span>
                    </div>
                  ))}
                  {!scan.lineItems.length ? (
                    <div className="px-4 py-4 text-sm text-slate-500">No item lines detected.</div>
                  ) : null}
                </div>
              </div>

              {scan.confidenceNotes.length ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  {scan.confidenceNotes.map((note) => (
                    <div key={note} className="flex gap-2">
                      <Check size={15} className="mt-0.5 shrink-0" />
                      {note}
                    </div>
                  ))}
                </div>
              ) : null}

              <Button onClick={saveScan} disabled={saving || !hasSupabaseConfig()} className="justify-self-end">
                <Save size={16} />
                Save {target === "income" ? "income" : target === "recurring" ? "recurring cost" : "expense"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
