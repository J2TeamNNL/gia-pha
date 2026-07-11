import { describe, expect, it } from "vitest";
import {
  normalizeTreeName,
  requireDeleteConfirmation,
  selectNextActiveTree,
  type TreeMetadata,
} from "./catalog";

const trees: TreeMetadata[] = [
  { id: "tree-a", name: "A", createdAt: "1", updatedAt: "1" },
  { id: "tree-b", name: "B", createdAt: "2", updatedAt: "2" },
];

describe("tree catalog commands", () => {
  it("normalizes valid names and rejects empty names", () => {
    expect(normalizeTreeName("  Họ   Nguyễn  ")).toBe("Họ Nguyễn");
    expect(() => normalizeTreeName("   ")).toThrow("name is required");
  });

  it("requires an explicit delete confirmation", () => {
    expect(() => requireDeleteConfirmation(false)).toThrow("explicit confirmation");
    expect(() => requireDeleteConfirmation(true)).not.toThrow();
  });

  it("selects a remaining tree when the active tree is deleted", () => {
    expect(selectNextActiveTree(trees, "tree-a")).toBe("tree-b");
    expect(selectNextActiveTree([trees[0]], "tree-a")).toBeNull();
  });
});
