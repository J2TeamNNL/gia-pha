import { useMemo } from "react";
import { useTreeStore } from "@/store/treeStore";
import type {
  AddressContext,
  BranchDialect,
} from "@/kinship/branchContext";
import type { KinshipPerson, KinshipRelationship } from "@/kinship";

/**
 * Assembles the context the branch-aware resolver needs from what the store
 * already holds, so resolving a term costs no database roundtrip.
 */
export function useAddressContext(): AddressContext {
  const persons = useTreeStore((state) => state.persons);
  const relationships = useTreeStore((state) => state.relationships);
  const branchProfiles = useTreeStore((state) => state.branchProfiles);
  const branchLinks = useTreeStore((state) => state.branchLinks);
  const defaultRegion = useTreeStore((state) => state.defaultRegion);

  const kinshipPersons = useMemo<KinshipPerson[]>(
    () =>
      persons.map((person) => ({
        id: person.id,
        gender: person.gender,
        birth_year: person.birth_year ?? null,
        birth_month: person.birth_month ?? null,
        birth_day: person.birth_day ?? null,
      })),
    [persons],
  );

  const kinshipRelationships = useMemo<KinshipRelationship[]>(
    () =>
      relationships.map((relationship) => ({
        person_id: relationship.person_id,
        related_to_id: relationship.related_to_id,
        rel_type: relationship.rel_type,
      })),
    [relationships],
  );

  const branchesById = useMemo(() => {
    const map = new Map<string, BranchDialect>();
    for (const profile of branchProfiles) {
      map.set(profile.id, {
        id: profile.id,
        name: profile.name,
        regionCode: profile.region_code,
        profileCode: profile.province_code
          ? `${profile.region_code}:${profile.province_code}`
          : undefined,
      });
    }
    return map;
  }, [branchProfiles]);

  const branchesByPerson = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const link of branchLinks) {
      const existing = map.get(link.person_id);
      // A person can hold both a DERIVED and a MANUAL link to one branch.
      if (existing) {
        if (!existing.includes(link.branch_profile_id)) {
          existing.push(link.branch_profile_id);
        }
      } else {
        map.set(link.person_id, [link.branch_profile_id]);
      }
    }
    return map;
  }, [branchLinks]);

  return useMemo(
    () => ({
      persons: kinshipPersons,
      relationships: kinshipRelationships,
      branchesByPerson,
      branchesById,
      fallbackRegion: defaultRegion,
    }),
    [
      kinshipPersons,
      kinshipRelationships,
      branchesByPerson,
      branchesById,
      defaultRegion,
    ],
  );
}
