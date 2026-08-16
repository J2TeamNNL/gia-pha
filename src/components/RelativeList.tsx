"use client";

import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/useTranslation";
import { useTreeStore } from "@/store/treeStore";
import { useAddressContext } from "./useAddressContext";
import { displayName } from "@/lib/personName";
import {
  buildRelativeRows,
  sortRelativeRows,
  type RelativeRow,
  type SortKey,
} from "@/kinship/relativeList";
import type { Register } from "@/kinship";
import {
  downloadText,
  toDelimited,
  type ExportFormat,
} from "@/lib/exportFile";
import { cn } from "@/lib/utils";

type RelativeListProps = { onClose: () => void };

const SORT_KEYS: SortKey[] = ["kinship", "branch", "name"];
const REGISTERS: Register[] = ["spoken", "formal", "reference"];
const FORMATS: ExportFormat[] = ["csv", "tsv", "json", "txt"];

function fill(template: string, values: Record<string, number | string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export function RelativeList({ onClose }: RelativeListProps) {
  const t = useTranslation();
  const persons = useTreeStore((state) => state.persons);
  const anchorPersonId = useTreeStore((state) => state.anchorPersonId);
  const context = useAddressContext();

  const [sortKey, setSortKey] = useState<SortKey>("kinship");
  const [register, setRegister] = useState<Register>("spoken");
  const [invitationTemplate, setInvitationTemplate] = useState("");
  const [copied, setCopied] = useState(false);

  const personById = useMemo(
    () => new Map(persons.map((person) => [person.id, person])),
    [persons],
  );
  const nameOf = (personId: string) => {
    const person = personById.get(personId);
    return person ? displayName(person) : personId;
  };
  const birthYearOf = (personId: string) =>
    personById.get(personId)?.birth_year ?? null;

  const rows = useMemo(() => {
    if (!anchorPersonId) return [];
    return sortRelativeRows({
      rows: buildRelativeRows(anchorPersonId, context, register),
      nameOf,
      birthYearOf,
      key: sortKey,
    });
    // nameOf/birthYearOf read personById, which is derived from persons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorPersonId, context, register, sortKey, personById]);

  const rankLabel = (generation: number) =>
    generation === 0 ? "—" : generation > 0 ? `+${generation}` : `${generation}`;

  const tableRows = (): string[][] => [
    [
      t.relatives.columns.name,
      t.relatives.columns.call,
      t.relatives.columns.selfRef,
      t.relatives.columns.branch,
      t.relatives.columns.generation,
      t.relatives.columns.birthYear,
      t.relatives.columns.note,
    ],
    ...rows.map((row) => [
      nameOf(row.personId),
      row.call ?? t.relatives.unresolved,
      row.selfRef ?? t.relatives.unresolved,
      row.branchName ?? t.kinship.defaultBranch,
      rankLabel(row.generation),
      String(birthYearOf(row.personId) ?? ""),
      row.viaPersonId ? `${t.relatives.viaSpouse}: ${nameOf(row.viaPersonId)}` : "",
    ]),
  ];

  const invitationLines = useMemo(() => {
    if (!invitationTemplate.trim()) return [];
    return rows
      .filter((row) => row.call)
      .map((row) =>
        invitationTemplate
          .replace(/\{call\}/g, row.call ?? "")
          .replace(/\{name\}/g, nameOf(row.personId)),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, invitationTemplate, personById]);

  const exportAs = (format: ExportFormat) => {
    const stamp = nameOf(anchorPersonId ?? "").replace(/\s+/g, "-") || "gia-pha";
    if (format === "json") {
      downloadText(
        `ho-hang-${stamp}.json`,
        JSON.stringify(
          rows.map((row: RelativeRow) => ({
            name: nameOf(row.personId),
            call: row.call,
            selfRef: row.selfRef,
            branch: row.branchName,
            generation: row.generation,
            birthYear: birthYearOf(row.personId),
            signature: row.signature,
            viaPerson: row.viaPersonId ? nameOf(row.viaPersonId) : null,
          })),
          null,
          2,
        ),
        format,
      );
      return;
    }
    if (format === "txt") {
      const body = invitationLines.length
        ? invitationLines.join("\n")
        : rows
            .map(
              (row) =>
                `${row.call ?? t.relatives.unresolved} ${nameOf(row.personId)}`,
            )
            .join("\n");
      downloadText(`ho-hang-${stamp}.txt`, body, format);
      return;
    }
    downloadText(
      `ho-hang-${stamp}.${format}`,
      toDelimited(tableRows(), format),
      format,
    );
  };

  const copyInvitations = async () => {
    await navigator.clipboard.writeText(invitationLines.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="flex-1 overflow-y-auto bg-stone-50 p-5 sm:p-10">
      <section className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-stone-800 p-3 text-white">
            <Users className="size-7" />
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-3xl text-stone-900">
              {t.relatives.title}
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              {t.relatives.description}
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            {t.relatives.close}
          </Button>
        </div>

        {!anchorPersonId ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            {t.relatives.noAnchor}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-4 rounded-xl border border-stone-200 bg-white p-4">
              <div className="space-y-1.5">
                <Label>{t.relatives.sortBy}</Label>
                <div className="flex gap-1.5">
                  {SORT_KEYS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSortKey(key)}
                      aria-pressed={sortKey === key}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                        sortKey === key
                          ? "border-stone-800 bg-stone-800 text-white"
                          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50",
                      )}
                    >
                      {key === "kinship"
                        ? t.relatives.sortKinship
                        : key === "branch"
                          ? t.relatives.sortBranch
                          : t.relatives.sortName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t.relatives.register}</Label>
                <div className="flex gap-1.5">
                  {REGISTERS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRegister(value)}
                      aria-pressed={register === value}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                        register === value
                          ? "border-stone-800 bg-stone-800 text-white"
                          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50",
                      )}
                    >
                      {t.relatives.registers[value]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ml-auto space-y-1.5">
                <Label>{t.relatives.exportAs}</Label>
                <div className="flex gap-1.5">
                  {FORMATS.map((format) => (
                    <Button
                      key={format}
                      variant="outline"
                      size="sm"
                      disabled={rows.length === 0}
                      onClick={() => exportAs(format)}
                    >
                      {format.toUpperCase()}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-4">
              <Label htmlFor="invitation-template">
                {t.relatives.invitation}
              </Label>
              <Input
                id="invitation-template"
                value={invitationTemplate}
                onChange={(event) => setInvitationTemplate(event.target.value)}
                placeholder={t.relatives.invitationPlaceholder}
              />
              <p className="text-xs text-stone-500">
                {t.relatives.invitationHint}
              </p>
              {invitationLines.length > 0 ? (
                <>
                  <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded-lg bg-stone-50 p-3 font-serif text-sm text-stone-800">
                    {invitationLines.join("\n")}
                  </pre>
                  <Button variant="outline" size="sm" onClick={copyInvitations}>
                    {copied
                      ? t.relatives.invitationCopied
                      : t.relatives.invitationCopy}
                  </Button>
                </>
              ) : (
                <p className="text-xs text-stone-400">
                  {t.relatives.invitationEmpty}
                </p>
              )}
            </div>

            {rows.length === 0 ? (
              <p className="text-sm text-stone-500">{t.relatives.empty}</p>
            ) : (
              <>
                <p className="text-sm text-stone-600">
                  {fill(t.relatives.count, { count: rows.length })}
                </p>
                <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
                  <table className="w-full min-w-[52rem] text-left text-sm">
                    <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
                      <tr>
                        <th scope="col" className="px-3 py-2">
                          {t.relatives.columns.name}
                        </th>
                        <th scope="col" className="px-3 py-2">
                          {t.relatives.columns.call}
                        </th>
                        <th scope="col" className="px-3 py-2">
                          {t.relatives.columns.selfRef}
                        </th>
                        <th scope="col" className="px-3 py-2">
                          {t.relatives.columns.branch}
                        </th>
                        <th scope="col" className="px-3 py-2">
                          {t.relatives.columns.generation}
                        </th>
                        <th scope="col" className="px-3 py-2">
                          {t.relatives.columns.birthYear}
                        </th>
                        <th scope="col" className="px-3 py-2">
                          {t.relatives.columns.note}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={`${row.personId}-${row.branchId ?? "none"}`}
                          className="border-b border-stone-100 last:border-0"
                        >
                          <td className="px-3 py-2">{nameOf(row.personId)}</td>
                          <td className="px-3 py-2">
                            {row.call ? (
                              <strong className="text-stone-900">
                                {row.call}
                              </strong>
                            ) : (
                              <span className="text-amber-700">
                                {t.relatives.unresolved}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {row.selfRef ?? (
                              <span className="text-amber-700">
                                {t.relatives.unresolved}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-stone-600">
                            {row.branchName ?? t.kinship.defaultBranch}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-stone-500">
                            {rankLabel(row.generation)}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-stone-500">
                            {birthYearOf(row.personId) ?? ""}
                          </td>
                          <td className="px-3 py-2 text-xs text-stone-500">
                            {row.viaPersonId &&
                              `${t.relatives.viaSpouse}: ${nameOf(row.viaPersonId)}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}
