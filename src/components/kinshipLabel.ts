import { useMemo } from "react";
import { resolveBranchAddresses, type BranchAddress } from "@/kinship";
import { useTreeStore } from "@/store/treeStore";
import { useAddressContext } from "./useAddressContext";

export interface PersonLabel {
  /** What ego calls this person, in the first applicable branch. */
  call: string | null;
  /** What ego calls themselves back. */
  selfRef: string | null;
  /** True when the path resolved but the data cannot settle the term. */
  unknown: boolean;
  addresses: BranchAddress[];
}

const UNRESOLVED = new Set(["UNKNOWN_SENIORITY", "UNKNOWN_GENDER", "NOT_FOUND"]);

export function labelFor(addresses: readonly BranchAddress[]): PersonLabel {
  const resolved = addresses.find(
    (address) => address.resolution.status === "OK",
  );
  if (resolved?.resolution.entry) {
    return {
      call: resolved.resolution.entry.spoken.call,
      selfRef: resolved.resolution.entry.spoken.selfRef,
      unknown: false,
      addresses: [...addresses],
    };
  }
  const unknown = addresses.some((address) =>
    UNRESOLVED.has(address.resolution.status),
  );
  return { call: null, selfRef: null, unknown, addresses: [...addresses] };
}

/**
 * Resolves the address term from the reference person to every person shown.
 * Computed in one pass so a card render never triggers its own traversal.
 */
export function usePersonLabels(personIds: readonly string[]): Map<string, PersonLabel> {
  const anchorPersonId = useTreeStore((state) => state.anchorPersonId);
  const context = useAddressContext();

  const key = personIds.join("|");
  return useMemo(() => {
    const labels = new Map<string, PersonLabel>();
    if (!anchorPersonId) return labels;
    for (const personId of key ? key.split("|") : []) {
      if (personId === anchorPersonId) continue;
      labels.set(
        personId,
        labelFor(resolveBranchAddresses(anchorPersonId, personId, context)),
      );
    }
    return labels;
  }, [anchorPersonId, context, key]);
}
