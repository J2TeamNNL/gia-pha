export interface TreeMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveTreeMetadata {
  activeTreeId: string | null;
}

export function normalizeTreeName(name: string): string {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized) throw new Error("A family tree name is required.");
  if (normalized.length > 120) {
    throw new Error("A family tree name must be 120 characters or fewer.");
  }
  return normalized;
}

export function requireDeleteConfirmation(confirmed: boolean): void {
  if (!confirmed) {
    throw new Error("Deleting a family tree requires explicit confirmation.");
  }
}

export function selectNextActiveTree(
  trees: TreeMetadata[],
  deletedTreeId: string,
): string | null {
  return trees.find((tree) => tree.id !== deletedTreeId)?.id ?? null;
}
