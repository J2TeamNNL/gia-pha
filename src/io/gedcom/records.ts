import type { GedcomNode, RawGedcomLine } from "./types";

/** Rebuilds the flat, leveled line list into level-nested record trees (one per level-0 line). */
export function buildRecordTree(lines: RawGedcomLine[]): GedcomNode[] {
  const roots: GedcomNode[] = [];
  const stack: GedcomNode[] = [];

  for (const line of lines) {
    const node: GedcomNode = { ...line, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].level >= node.level) {
      stack.pop();
    }
    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }
    stack.push(node);
  }

  return roots;
}

export function findChild(node: GedcomNode, tag: string): GedcomNode | undefined {
  return node.children.find((child) => child.tag === tag);
}

export function findChildren(node: GedcomNode, tag: string): GedcomNode[] {
  return node.children.filter((child) => child.tag === tag);
}

/** Strips the `@...@` pointer delimiters GEDCOM wraps xrefs in; passes plain values through unchanged. */
export function stripXref(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const match = /^@(.+)@$/.exec(trimmed);
  return match ? match[1] : trimmed;
}
