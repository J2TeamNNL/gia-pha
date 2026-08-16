"use client";

import { useEffect, useMemo, useState } from "react";
import { GitBranch, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PersonPicker } from "./PersonPicker";
import { useTranslation } from "@/i18n/useTranslation";
import { useTreeStore } from "@/store/treeStore";
import { displayName } from "@/lib/personName";
import { provinceCode } from "@/lib/province";
import { REGION_PROFILES } from "@/kinship";
import type { BranchProfile, BranchRoot, RegionCode } from "@/db/types";
import {
  addBranchRoot,
  createBranchProfile,
  deleteBranchProfile,
  listBranchRoots,
  recomputeDerivedMembership,
  removeBranchRoot,
  removeManualBranchLink,
  setManualBranchLink,
  updateBranchProfile,
} from "@/db/branches";
import { loadBranchMembership } from "@/db/addressContext";
import { cn } from "@/lib/utils";

type BranchSetupProps = { onClose: () => void };

const REGIONS: RegionCode[] = ["BAC", "TRUNG", "NAM"];

function fill(template: string, values: Record<string, number | string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export function BranchSetup({ onClose }: BranchSetupProps) {
  const t = useTranslation();
  const persons = useTreeStore((state) => state.persons);
  const branchProfiles = useTreeStore((state) => state.branchProfiles);
  const branchLinks = useTreeStore((state) => state.branchLinks);
  const defaultRegion = useTreeStore((state) => state.defaultRegion);
  const setDefaultRegion = useTreeStore((state) => state.setDefaultRegion);
  const setBranchMembership = useTreeStore((state) => state.setBranchMembership);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [roots, setRoots] = useState<BranchRoot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const selected = branchProfiles.find((profile) => profile.id === selectedId);

  const personById = useMemo(
    () => new Map(persons.map((person) => [person.id, person])),
    [persons],
  );

  const membersOf = useMemo(() => {
    const map = new Map<string, { derived: string[]; manual: string[] }>();
    for (const link of branchLinks) {
      const entry = map.get(link.branch_profile_id) ?? {
        derived: [],
        manual: [],
      };
      if (link.source === "MANUAL") entry.manual.push(link.person_id);
      else entry.derived.push(link.person_id);
      map.set(link.branch_profile_id, entry);
    }
    return map;
  }, [branchLinks]);

  const selectedMembers = selectedId
    ? (membersOf.get(selectedId) ?? { derived: [], manual: [] })
    : { derived: [], manual: [] };

  const refresh = async () => {
    const membership = await loadBranchMembership();
    setBranchMembership(membership.profiles, membership.links);
  };

  useEffect(() => {
    if (!selectedId) {
      setRoots([]);
      return;
    }
    let cancelled = false;
    void listBranchRoots(selectedId).then((loaded) => {
      if (!cancelled) setRoots(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(undefined);
    try {
      await action();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  const patch = (data: Partial<Omit<BranchProfile, "id">>) => {
    if (!selectedId) return;
    void run(async () => {
      await updateBranchProfile(selectedId, data);
    });
  };

  const dialectCode = selected?.province_code
    ? `${selected.region_code}:${selected.province_code}`
    : null;
  const hasOwnDialect = Boolean(dialectCode && REGION_PROFILES[dialectCode]);

  return (
    <main className="flex-1 overflow-y-auto bg-stone-50 p-5 sm:p-10">
      <section className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-stone-800 p-3 text-white">
            <GitBranch className="size-7" />
          </div>
          <div className="flex-1">
            <h1 className="font-serif text-3xl text-stone-900">
              {t.branch.title}
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              {t.branch.description}
            </p>
          </div>
          <Button variant="outline" onClick={onClose}>
            {t.branch.close}
          </Button>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}

        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <Label>{t.branch.defaultRegion}</Label>
          <div
            role="group"
            aria-label={t.branch.defaultRegion}
            className="mt-2 flex flex-wrap gap-2"
          >
            {REGIONS.map((region) => (
              <button
                key={region}
                type="button"
                onClick={() => setDefaultRegion(region)}
                aria-pressed={defaultRegion === region}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  defaultRegion === region
                    ? "border-stone-800 bg-stone-800 text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50",
                )}
              >
                {t.branch.regions[region]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-500">
            {t.branch.defaultRegionHint}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
          <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              {t.branch.open}
            </span>
            {branchProfiles.length === 0 ? (
              <p className="text-sm text-stone-500">{t.branch.empty}</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {branchProfiles.map((profile) => {
                  const members = membersOf.get(profile.id);
                  const count =
                    (members?.derived.length ?? 0) + (members?.manual.length ?? 0);
                  return (
                    <li key={profile.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(profile.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                          profile.id === selectedId
                            ? "border-stone-800 bg-stone-50"
                            : "border-stone-200 bg-white hover:bg-stone-50",
                        )}
                      >
                        <span className="flex-1 truncate">{profile.name}</span>
                        <span className="shrink-0 rounded bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600">
                          {profile.province_code
                            ? profile.province_code.replace(/_/g, " ")
                            : t.branch.regions[profile.region_code]}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-stone-400">
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const profile = await createBranchProfile({
                    name: t.branch.create,
                    region_code: defaultRegion,
                    language_code: "vi",
                  });
                  setSelectedId(profile.id);
                })
              }
            >
              + {t.branch.create}
            </Button>
          </div>

          {!selected ? (
            <div className="grid place-items-center rounded-xl border border-dashed border-stone-300 bg-white p-10 text-sm text-stone-500">
              {t.branch.selectBranch}
            </div>
          ) : (
            <div className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                  {fill(t.branch.memberCount, {
                    count:
                      selectedMembers.derived.length +
                      selectedMembers.manual.length,
                  })}
                </span>
                {busy && <Loader2 className="size-4 animate-spin text-stone-400" />}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="branch-name">{t.branch.namePlaceholder}</Label>
                  <Input
                    id="branch-name"
                    defaultValue={selected.name}
                    key={`name-${selected.id}`}
                    placeholder={t.branch.namePlaceholder}
                    onBlur={(event) => {
                      const name = event.target.value.trim();
                      if (name && name !== selected.name) patch({ name });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="branch-province">{t.branch.province}</Label>
                  <Input
                    id="branch-province"
                    key={`province-${selected.id}`}
                    defaultValue={selected.province_code?.replace(/_/g, " ") ?? ""}
                    placeholder={t.branch.provincePlaceholder}
                    onBlur={(event) => {
                      const code = provinceCode(event.target.value);
                      if ((code || undefined) !== selected.province_code) {
                        patch({ province_code: code || undefined });
                      }
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t.branch.region}</Label>
                <div
                  role="group"
                  aria-label={t.branch.region}
                  className="flex flex-wrap gap-2"
                >
                  {REGIONS.map((region) => (
                    <button
                      key={region}
                      type="button"
                      onClick={() => patch({ region_code: region })}
                      aria-pressed={selected.region_code === region}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                        selected.region_code === region
                          ? "border-stone-800 bg-stone-800 text-white"
                          : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50",
                      )}
                    >
                      {t.branch.regions[region]}
                    </button>
                  ))}
                  <span
                    className={cn(
                      "self-center rounded px-2 py-1 text-xs font-medium",
                      hasOwnDialect
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-stone-100 text-stone-500",
                    )}
                  >
                    {hasOwnDialect ? t.branch.hasDialect : t.branch.noDialect}
                  </span>
                </div>
                <p className="text-xs text-stone-500">{t.branch.provinceHint}</p>
              </div>

              <hr className="border-stone-100" />

              <div className="space-y-2">
                <Label>{t.branch.roots}</Label>
                <ul className="flex flex-col gap-1.5">
                  {roots.map((root) => {
                    const person = personById.get(root.root_person_id);
                    return (
                      <li
                        key={root.id}
                        className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-1.5 text-sm"
                      >
                        <span className="flex-1 truncate">
                          {person ? displayName(person) : root.root_person_id}
                        </span>
                        <button
                          type="button"
                          aria-label={t.branch.remove}
                          className="text-stone-400 hover:text-red-600"
                          onClick={() =>
                            void run(async () => {
                              await removeBranchRoot(root.id);
                              await recomputeDerivedMembership(selected.id);
                              setRoots(await listBranchRoots(selected.id));
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <PersonPicker
                  persons={persons}
                  exclude={new Set(roots.map((root) => root.root_person_id))}
                  placeholder={t.branch.searchPlaceholder}
                  noResults={t.branch.noResults}
                  onPick={(person) =>
                    void run(async () => {
                      await addBranchRoot(selected.id, person.id);
                      await recomputeDerivedMembership(selected.id);
                      setRoots(await listBranchRoots(selected.id));
                    })
                  }
                />
                <p className="text-xs text-stone-500">{t.branch.rootsHint}</p>
              </div>

              <hr className="border-stone-100" />

              <div className="space-y-2">
                <Label>{t.branch.manual}</Label>
                <ul className="flex flex-col gap-1.5">
                  {selectedMembers.manual.map((personId) => {
                    const person = personById.get(personId);
                    return (
                      <li
                        key={personId}
                        className="flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-1.5 text-sm"
                      >
                        <span className="flex-1 truncate">
                          {person ? displayName(person) : personId}
                        </span>
                        <button
                          type="button"
                          aria-label={t.branch.remove}
                          className="text-stone-400 hover:text-red-600"
                          onClick={() =>
                            void run(async () => {
                              await removeManualBranchLink(personId, selected.id);
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <PersonPicker
                  persons={persons}
                  exclude={new Set(selectedMembers.manual)}
                  placeholder={t.branch.searchPlaceholder}
                  noResults={t.branch.noResults}
                  onPick={(person) =>
                    void run(async () => {
                      await setManualBranchLink(person.id, selected.id);
                    })
                  }
                />
                <p className="text-xs text-stone-500">{t.branch.manualHint}</p>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-stone-100 pt-3">
                {confirmingDelete ? (
                  <>
                    <span className="mr-auto self-center text-sm text-red-700">
                      {t.branch.deleteConfirm}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmingDelete(false)}
                    >
                      {t.paste.close}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await deleteBranchProfile(selected.id);
                          setSelectedId(null);
                          setConfirmingDelete(false);
                        })
                      }
                    >
                      {t.branch.deleteBranch}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="ghost"
                    onClick={() => setConfirmingDelete(true)}
                  >
                    {t.branch.deleteBranch}
                  </Button>
                )}
                <Button
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await recomputeDerivedMembership(selected.id);
                    })
                  }
                >
                  {busy ? t.branch.recomputing : t.branch.recompute}
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
