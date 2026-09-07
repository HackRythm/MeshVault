import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  onRowClick,
  emptyMessage = 'No records found',
  className = '',
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleHeaderClick = (col) => {
    if (!col.sortable) return;
    if (sortKey === col.accessor) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortKey(null);
        setSortDir('asc');
      }
    } else {
      setSortKey(col.accessor);
      setSortDir('asc');
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [data, sortKey, sortDir]);

  return (
    <div className={`w-full overflow-x-auto border border-zinc-800 rounded-lg bg-[#0c0c0e] ${className}`}>
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-zinc-800 bg-[#121215]/80 select-none">
            {columns.map((col, idx) => (
              <th
                key={col.key || col.accessor || idx}
                onClick={() => handleHeaderClick(col)}
                className={`py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                } ${col.sortable ? 'cursor-pointer hover:text-zinc-200 transition-colors' : ''} ${col.className || ''}`}
                style={{ width: col.width }}
              >
                <div className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : ''}`}>
                  <span>{col.header}</span>
                  {col.sortable && sortKey === col.accessor && (
                    sortDir === 'asc' ? (
                      <ChevronUp className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ChevronDown className="w-3 h-3 text-blue-400" />
                    )
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 text-center text-zinc-500 font-normal"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, rIdx) => {
              const rowId = row[keyField] ?? rIdx;
              return (
                <tr
                  key={rowId}
                  onClick={() => onRowClick?.(row)}
                  className={`h-9 transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-zinc-800/40' : 'hover:bg-zinc-900/30'
                  }`}
                >
                  {columns.map((col, cIdx) => {
                    const value = col.accessor ? row[col.accessor] : undefined;
                    const content = col.render ? col.render(value, row, rIdx) : value;
                    const isNumeric = col.align === 'right' || typeof value === 'number';
                    const isMono = col.mono || col.isId;

                    return (
                      <td
                        key={col.key || col.accessor || cIdx}
                        className={`py-2 px-3 text-zinc-300 align-middle ${
                          col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                        } ${isMono ? 'font-mono text-[11px] text-zinc-400' : ''} ${isNumeric ? 'tabular-nums' : ''} ${col.cellClassName || ''}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
