import React from "react";
import { Search } from "lucide-react";
import { cn } from "../../lib/utils";
import { ExportMenu } from "./ExportMenu";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  className?: string;
};

export function DataTable<T extends Record<string, unknown>>({
  rows,
  columns,
  searchPlaceholder = "Search...",
  exportFilename,
  pageSize = 10,
  mobileRow,
  getRowKey,
  emptyTitle = "No records found",
  emptyDescription,
}: {
  rows: T[];
  columns: DataTableColumn<T>[];
  searchPlaceholder?: string;
  exportFilename?: string;
  pageSize?: number;
  mobileRow?: (row: T) => React.ReactNode;
  getRowKey?: (row: T, index: number) => React.Key;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortAsc, setSortAsc] = React.useState(true);

  const filteredRows = React.useMemo(() => {
    const text = query.trim().toLowerCase();
    const filtered = text
      ? rows.filter((row) => JSON.stringify(row).toLowerCase().includes(text))
      : rows;
    const column = columns.find((entry) => entry.key === sortKey);
    if (!column?.sortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const left = column.sortValue!(a);
      const right = column.sortValue!(b);
      if (left === right) return 0;
      return (left > right ? 1 : -1) * (sortAsc ? 1 : -1);
    });
  }, [columns, query, rows, sortAsc, sortKey]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  React.useEffect(() => {
    setPage(1);
  }, [query, rows.length]);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="app-input h-10 pl-9"
            placeholder={searchPlaceholder}
          />
        </div>
        {exportFilename && <ExportMenu rows={filteredRows} filename={exportFilename} />}
      </div>
      <div className="space-y-3 bg-slate-50/60 p-3 md:hidden">
        {visibleRows.map((row, rowIndex) => (
          <div key={getRowKey?.(row, rowIndex) ?? String(row.id ?? rowIndex)} className="app-mobile-record">
            {mobileRow ? mobileRow(row) : (
              <dl className="space-y-3">
                {columns.slice(0, 5).map((column, columnIndex) => (
                  <div key={column.key} className={cn(columnIndex === 0 ? "" : "flex items-start justify-between gap-4 border-t border-slate-100 pt-3")}>
                    {columnIndex === 0 ? (
                      <div className="text-sm font-semibold text-slate-950">{column.accessor(row)}</div>
                    ) : (
                      <>
                        <dt className="text-xs font-medium text-slate-500">{column.header}</dt>
                        <dd className="min-w-0 text-right text-sm text-slate-800">{column.accessor(row)}</dd>
                      </>
                    )}
                  </div>
                ))}
              </dl>
            )}
          </div>
        ))}
        {visibleRows.length === 0 && (
          <div className="app-empty-state bg-white">
            <p className="font-semibold text-slate-700">{emptyTitle}</p>
            {emptyDescription && <p className="mt-1 text-sm font-normal text-slate-500">{emptyDescription}</p>}
          </div>
        )}
      </div>
      <div className="hidden overflow-x-auto md:block" role="region" aria-label="Records table" tabIndex={0}>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cn("px-4 py-3", column.className)}>
                  {column.sortValue ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSortAsc(sortKey === column.key ? !sortAsc : true);
                        setSortKey(column.key);
                      }}
                      className="font-semibold"
                    >
                      {column.header}
                    </button>
                  ) : column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.map((row, rowIndex) => (
              <tr key={String(row.id ?? rowIndex)} className="hover:bg-slate-50">
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-3", column.className)}>
                    {column.accessor(row)}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-sm text-slate-400">
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <span>{filteredRows.length} record{filteredRows.length === 1 ? "" : "s"}</span>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button type="button" className="app-button-secondary px-3" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</button>
          <span className="whitespace-nowrap">Page {safePage} of {pageCount}</span>
          <button type="button" className="app-button-secondary px-3" disabled={safePage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Next</button>
        </div>
      </div>
    </div>
  );
}
