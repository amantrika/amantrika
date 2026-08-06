import type { ReactNode } from "react";

/** Guest-list table: ivory zebra rows, sticky ornate header. */
export function Table({
  headers,
  children,
  className = "",
}: {
  headers: ReactNode[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto rounded-card border border-ornate/40 bg-surface ${className}`}>
      <table className="table-zebra w-full min-w-[640px] text-left text-sm">
        <thead className="sticky top-0 z-10 bg-surface">
          <tr className="border-b border-ornate/50">
            {headers.map((h, i) => (
              <th key={i} className="px-4 py-3 type-overline whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ornate/15">{children}</tbody>
      </table>
    </div>
  );
}
