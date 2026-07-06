import { calculateVat, roundCurrency } from "@/lib/finance";

export type ScannedLineItem = {
  description: string;
  amount: number;
};

export type ScannedDocument = {
  rawText: string;
  date: string;
  party: string;
  description: string;
  invoiceReference: string;
  amountExclVat: number;
  vatAmount: number;
  totalAmount: number;
  lineItems: ScannedLineItem[];
  confidenceNotes: string[];
};

const TOTAL_WORDS = ["total", "amount due", "balance due", "grand total"];
const VAT_WORDS = ["vat", "tax"];
const SUBTOTAL_WORDS = ["subtotal", "sub total", "excl", "exclusive", "net"];
const IGNORE_LINE_WORDS = [
  "thank",
  "cashier",
  "change",
  "tender",
  "card",
  "approved",
  "merchant",
  "terminal",
  "www.",
  "http",
];

export function parseScannedFinanceDocument(text: string, vatRate: number): ScannedDocument {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 1);

  const dated = findDate(lines) ?? new Date().toISOString().slice(0, 10);
  const invoiceReference = findReference(lines);
  const party = findParty(lines);
  const lineItems = findLineItems(lines);
  const totalAmount = findLabelledAmount(lines, TOTAL_WORDS) ?? highestAmount(lines) ?? 0;
  const explicitVat = findLabelledAmount(lines, VAT_WORDS);
  const subtotal = findLabelledAmount(lines, SUBTOTAL_WORDS);
  const vatAmount =
    explicitVat ??
    (subtotal && totalAmount ? roundCurrency(totalAmount - subtotal) : calculateVat(totalAmount / (1 + vatRate / 100), vatRate));
  const amountExclVat = subtotal ?? roundCurrency(Math.max(totalAmount - vatAmount, 0));
  const description =
    lineItems
      .slice(0, 3)
      .map((item) => item.description)
      .join("; ") || "Scanned finance document";

  const confidenceNotes = [];
  if (!explicitVat) confidenceNotes.push("VAT was inferred because no clear VAT line was found.");
  if (!subtotal) confidenceNotes.push("Amount excl. VAT was inferred from total and VAT.");
  if (!invoiceReference) confidenceNotes.push("No clear invoice/reference number was found.");
  if (!lineItems.length) confidenceNotes.push("No reliable item lines were detected.");

  return {
    rawText: text,
    date: dated,
    party,
    description,
    invoiceReference,
    amountExclVat,
    vatAmount,
    totalAmount: totalAmount || roundCurrency(amountExclVat + vatAmount),
    lineItems,
    confidenceNotes,
  };
}

function findDate(lines: string[]) {
  for (const line of lines) {
    const iso = line.match(/\b(20\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
    if (iso) {
      return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
    }

    const za = line.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](20\d{2}|\d{2})\b/);
    if (za) {
      const year = za[3].length === 2 ? `20${za[3]}` : za[3];
      return `${year}-${za[2].padStart(2, "0")}-${za[1].padStart(2, "0")}`;
    }
  }
  return null;
}

function findReference(lines: string[]) {
  const refLine = lines.find((line) =>
    /\b(invoice|inv|receipt|ref|reference|tax invoice|doc no|number|no\.)\b/i.test(line),
  );
  if (!refLine) return "";
  return refLine.replace(/^(invoice|inv|receipt|ref|reference|tax invoice|doc no|number|no\.?)\s*[:#-]?\s*/i, "");
}

function findParty(lines: string[]) {
  const candidates = lines.filter((line) => {
    const lower = line.toLowerCase();
    return (
      !amountMatches(line).length &&
      !findDate([line]) &&
      !IGNORE_LINE_WORDS.some((word) => lower.includes(word)) &&
      !TOTAL_WORDS.some((word) => lower.includes(word)) &&
      !VAT_WORDS.some((word) => lower.includes(word))
    );
  });
  return candidates[0] ?? "Unknown";
}

function findLineItems(lines: string[]) {
  return lines
    .map((line) => {
      const amounts = amountMatches(line);
      if (!amounts.length) return null;

      const lower = line.toLowerCase();
      if (
        TOTAL_WORDS.some((word) => lower.includes(word)) ||
        VAT_WORDS.some((word) => lower.includes(word)) ||
        SUBTOTAL_WORDS.some((word) => lower.includes(word)) ||
        IGNORE_LINE_WORDS.some((word) => lower.includes(word))
      ) {
        return null;
      }

      const amount = parseAmount(amounts.at(-1) ?? "0");
      const description = line.replace(amounts.at(-1) ?? "", "").trim();
      if (!description || amount <= 0) return null;
      return { description, amount };
    })
    .filter((item): item is ScannedLineItem => Boolean(item))
    .slice(0, 20);
}

function findLabelledAmount(lines: string[], words: string[]) {
  const matches = lines
    .filter((line) => words.some((word) => line.toLowerCase().includes(word)))
    .flatMap((line) => amountMatches(line).map(parseAmount))
    .filter((amount) => amount > 0);
  if (!matches.length) return null;
  return roundCurrency(Math.max(...matches));
}

function highestAmount(lines: string[]) {
  const amounts = lines.flatMap((line) => amountMatches(line).map(parseAmount)).filter((amount) => amount > 0);
  if (!amounts.length) return null;
  return roundCurrency(Math.max(...amounts));
}

function amountMatches(line: string) {
  return line.match(/(?:R|ZAR)?\s*-?\d{1,3}(?:[ ,]\d{3})*(?:[.,]\d{2})|(?:R|ZAR)?\s*-?\d+[.,]\d{2}/gi) ?? [];
}

function parseAmount(value: string) {
  const cleaned = value
    .replace(/zar|r/gi, "")
    .replace(/\s/g, "")
    .replace(/,/g, ".");
  const parts = cleaned.split(".");
  const normalized =
    parts.length > 2 ? `${parts.slice(0, -1).join("")}.${parts.at(-1)}` : cleaned;
  return roundCurrency(Number(normalized) || 0);
}

