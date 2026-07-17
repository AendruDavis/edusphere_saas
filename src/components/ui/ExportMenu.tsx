import React from "react";
import { Download } from "lucide-react";

type ExportRow = Record<string, unknown>;

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportMenu({
  rows,
  filename,
}: {
  rows: ExportRow[];
  filename: string;
}) {
  const exportCsv = () => {
    const headers = Array.from(rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()));
    const content = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
    ].join("\n");
    download(`${filename}.csv`, content, "text/csv;charset=utf-8");
  };

  return (
    <button type="button" onClick={exportCsv} className="app-button-secondary">
      <Download className="h-4 w-4" />
      Export CSV
    </button>
  );
}
