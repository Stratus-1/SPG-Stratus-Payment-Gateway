"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type ExportRow = Record<string, string | number | boolean | null | undefined>;

export function exportCsv(filename: string, rows: ExportRow[]) {
  const headers = Object.keys(rows[0] ?? {});
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          return `"${String(value).replaceAll('"', '""')}"`;
        })
        .join(","),
    ),
  ].join("\n");

  downloadBlob(filename, "text/csv;charset=utf-8", csv);
}

export function exportExcel(filename: string, rows: ExportRow[]) {
  const headers = Object.keys(rows[0] ?? {});
  const table = [
    "<table>",
    `<tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`,
    ...rows.map(
      (row) =>
        `<tr>${headers
          .map((header) => `<td>${escapeHtml(String(row[header] ?? ""))}</td>`)
          .join("")}</tr>`,
    ),
    "</table>",
  ].join("");

  const workbook = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Report</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
      </head>
      <body>${table}</body>
    </html>`;

  downloadBlob(filename.replace(/\.xlsx$/i, ".xls"), "application/vnd.ms-excel", workbook);
}

export function exportPdf(title: string, filename: string, rows: ExportRow[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  const headers = Object.keys(rows[0] ?? {});

  doc.setFontSize(14);
  doc.text(title, 14, 16);
  autoTable(doc, {
    head: [headers],
    body: rows.map((row) => headers.map((header) => String(row[header] ?? ""))),
    startY: 24,
    styles: { fontSize: 8 },
  });
  doc.save(filename);
}

function downloadBlob(filename: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
