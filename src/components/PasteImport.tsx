"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CircleAlert, CircleCheck, ClipboardPaste } from "lucide-react";
import { Button } from "@/components/ui/button";
import { bulkImport } from "@/db/bulk";
import { planPaste, type PasteRowPlan } from "@/io/paste/plan";
import type { ColumnKey } from "@/io/paste/columns";
import { useTranslation } from "@/i18n/useTranslation";
import { useTreeStore } from "@/store/treeStore";

type PasteImportProps = { onClose: () => void };

const PREVIEW_LIMIT = 200;

/** A worked example, so the format is shown rather than only described. */
const SAMPLE = [
  "Họ tên\tGiới tính\tNăm sinh\tCha\tMẹ\tVợ/Chồng",
  "Nguyễn Văn Tổ\tNam\t1930\t\t\tTrần Thị Cố",
  "Trần Thị Cố\tNữ\t1933",
  "Nguyễn Văn Bố\tNam\t1962\tNguyễn Văn Tổ\tTrần Thị Cố",
].join("\n");

function fill(template: string, values: Record<string, number | string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

function rowSeverity(row: PasteRowPlan): "ERROR" | "WARNING" | "OK" {
  if (row.issues.some((issue) => issue.severity === "ERROR")) return "ERROR";
  return row.issues.length ? "WARNING" : "OK";
}

const SEVERITY_STYLES = {
  ERROR: "bg-red-50 text-red-700",
  WARNING: "bg-amber-50 text-amber-700",
  OK: "text-stone-600",
} as const;

export function PasteImport({ onClose }: PasteImportProps) {
  const t = useTranslation();
  const persons = useTreeStore((state) => state.persons);
  const addImported = useTreeStore((state) => state.addImported);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<string>();

  const plan = useMemo(() => planPaste(text, persons), [text, persons]);
  const readyCount = plan.rows.length - plan.errorCount;

  const runImport = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const result = await bulkImport({
        persons: plan.persons,
        relationships: plan.relationships,
      });
      addImported(result.persons, result.relationships);
      setDone(
        fill(t.paste.done, {
          persons: result.persons.length,
          relationships: result.relationships.length,
        }),
      );
      setText("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const columnLabel = (key: ColumnKey | null, position: number) =>
    key ? t.paste.columns[key] : `#${position + 1}`;

  return (
    <main className="flex-1 overflow-y-auto bg-stone-50 p-5 sm:p-10">
      <section className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-stone-800 p-3 text-white">
            <ClipboardPaste className="size-7" />
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-3xl text-stone-900">
              {t.paste.title}
            </h1>
            <p className="mt-1 text-sm text-stone-500">{t.paste.description}</p>
          </div>
          <Button variant="outline" onClick={onClose}>
            {t.paste.close}
          </Button>
        </div>

        <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
          {t.paste.formatHint}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setText(SAMPLE);
              setDone(undefined);
            }}
          >
            {t.paste.insertSample}
          </Button>
          {text.trim() && (
            <Button variant="ghost" size="sm" onClick={() => setText("")}>
              {t.paste.clear}
            </Button>
          )}
        </div>

        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setDone(undefined);
          }}
          placeholder={t.paste.placeholder}
          spellCheck={false}
          className="h-44 w-full rounded-xl border border-stone-200 bg-white p-4 font-mono text-sm text-stone-800 shadow-sm outline-none focus:border-stone-400"
        />

        {done && (
          <p
            role="status"
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {done}
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        {plan.rows.length === 0 ? (
          <p className="text-sm text-stone-500">{t.paste.empty}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-xl text-stone-800">
                  {t.paste.preview}
                </h2>
                <p className="text-xs text-stone-500">
                  {plan.hasHeader
                    ? t.paste.headerDetected
                    : t.paste.headerAssumed}
                </p>
              </div>
              <p className="text-sm text-stone-600">
                {fill(t.paste.summary, {
                  ready: readyCount,
                  warning: plan.warningCount,
                  error: plan.errorCount,
                })}
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      {t.paste.row}
                    </th>
                    {plan.columns.map((key, position) => (
                      <th key={position} scope="col" className="px-3 py-2">
                        {columnLabel(key, position)}
                      </th>
                    ))}
                    <th scope="col" className="px-3 py-2">
                      {t.paste.status}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {plan.rows.slice(0, PREVIEW_LIMIT).map((row) => {
                    const severity = rowSeverity(row);
                    return (
                      <tr
                        key={row.row}
                        className={`border-b border-stone-100 last:border-0 ${SEVERITY_STYLES[severity]}`}
                      >
                        <td className="px-3 py-2 tabular-nums text-stone-400">
                          {row.row}
                        </td>
                        {plan.columns.map((_, position) => (
                          <td key={position} className="px-3 py-2">
                            {row.cells[position] ?? ""}
                          </td>
                        ))}
                        <td className="px-3 py-2">
                          {severity === "OK" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700">
                              <CircleCheck className="size-4" />
                              {t.paste.ready}
                            </span>
                          ) : (
                            <ul className="space-y-1">
                              {row.issues.map((issue, position) => (
                                <li
                                  key={position}
                                  className="inline-flex items-start gap-1"
                                >
                                  {issue.severity === "ERROR" ? (
                                    <CircleAlert className="mt-0.5 size-4 shrink-0" />
                                  ) : (
                                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                                  )}
                                  <span>{issue.message}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {plan.rows.length > PREVIEW_LIMIT && (
              <p className="text-xs text-stone-500">
                {fill(t.paste.previewLimited, {
                  shown: PREVIEW_LIMIT,
                  total: plan.rows.length,
                })}
              </p>
            )}

            <div className="flex justify-end">
              <Button
                onClick={runImport}
                disabled={busy || plan.persons.length === 0}
              >
                {busy
                  ? t.paste.importing
                  : fill(
                      plan.errorCount
                        ? t.paste.importPartial
                        : t.paste.importAll,
                      { count: plan.persons.length, error: plan.errorCount },
                    )}
              </Button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
