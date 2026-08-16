/**
 * Distinguishable accent per branch, assigned by the branch's position in the
 * list rather than by region, so two branches from the same region stay apart.
 */
const BRANCH_COLORS = [
  "#38556E",
  "#8A6620",
  "#2F6B57",
  "#7A3B5E",
  "#3F5C86",
  "#7C4A24",
] as const;

export function branchColor(index: number): string {
  return BRANCH_COLORS[
    ((index % BRANCH_COLORS.length) + BRANCH_COLORS.length) %
      BRANCH_COLORS.length
  ];
}

export function branchColorMap(
  branchIds: readonly string[],
): Map<string, string> {
  return new Map(branchIds.map((id, index) => [id, branchColor(index)]));
}
