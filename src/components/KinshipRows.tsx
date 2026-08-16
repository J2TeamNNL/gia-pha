"use client";

import { useMemo } from "react";
import { resolveBranchAddresses } from "@/kinship";
import { useTreeStore } from "@/store/treeStore";
import { useTranslation } from "@/i18n/useTranslation";
import { useAddressContext } from "./useAddressContext";
import { displayName } from "@/lib/personName";

/**
 * Every applicable address term for one person, one row per branch.
 * The card on the graph has room for a single word; this is where a
 * multi-branch person shows every correct answer.
 */
export function KinshipRows({ personId }: { personId: string }) {
  const t = useTranslation();
  const anchorPersonId = useTreeStore((state) => state.anchorPersonId);
  const persons = useTreeStore((state) => state.persons);
  const context = useAddressContext();

  const addresses = useMemo(
    () =>
      anchorPersonId && anchorPersonId !== personId
        ? resolveBranchAddresses(anchorPersonId, personId, context)
        : [],
    [anchorPersonId, personId, context],
  );

  if (!anchorPersonId) {
    return <p className="text-xs text-stone-500">{t.kinship.noAnchor}</p>;
  }
  if (anchorPersonId === personId || addresses.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-stone-200 bg-stone-50 p-3">
      {addresses.map((address, index) => {
        const entry = address.resolution.entry;
        const via = address.viaPersonId
          ? persons.find((person) => person.id === address.viaPersonId)
          : undefined;
        return (
          <div key={address.branch?.id ?? `default-${index}`} className="text-sm">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="rounded bg-white px-1.5 py-0.5 text-[11px] font-medium text-stone-600 ring-1 ring-stone-200">
                {address.branch?.name ?? t.kinship.defaultBranch}
              </span>
              {entry ? (
                <span className="text-stone-700">
                  {t.kinship.callLabel}{" "}
                  <strong className="text-stone-900">{entry.spoken.call}</strong>
                  {" · "}
                  {t.kinship.selfLabel}{" "}
                  <strong className="text-stone-900">
                    {entry.spoken.selfRef}
                  </strong>
                </span>
              ) : (
                <span className="text-amber-700">{t.kinship.unknown}</span>
              )}
            </div>
            {via && (
              <p className="mt-0.5 text-[11px] text-stone-500">
                {t.kinship.viaSpouse.replace("{name}", displayName(via))}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
