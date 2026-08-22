import { describe, expect, it } from "vitest";
import {
  computeLayout,
  MAX_VISIBLE_NODES,
  NODE_HEIGHT,
  V_GAP,
} from "./layout";
import type { Person, Relationship } from "@/db/types";

let nextId = 0;
function person(overrides: Partial<Person> = {}): Person {
  return {
    id: `p${nextId++}`,
    first_name: "Người",
    gender: "MALE",
    is_living: true,
    ...overrides,
  };
}

function rel(
  personId: string,
  relatedToId: string,
  relType: Relationship["rel_type"],
): Relationship {
  return {
    id: `r${nextId++}`,
    person_id: personId,
    related_to_id: relatedToId,
    rel_type: relType,
    is_primary: false,
  };
}

describe("family graph layout", () => {
  it("places parents above, children below, and partners on the same row", () => {
    const father = person();
    const mother = person({ gender: "FEMALE" });
    const focus = person({ is_anchor: true });
    const child = person();
    const layout = computeLayout({
      persons: [father, mother, focus, child],
      relationships: [
        rel(father.id, focus.id, "PARENT_OF"),
        rel(mother.id, focus.id, "PARENT_OF"),
        rel(father.id, mother.id, "SPOUSE"),
        rel(focus.id, child.id, "PARENT_OF"),
      ],
      focusId: focus.id,
      depth: null,
    });

    const byId = new Map(layout.nodes.map((n) => [n.person.id, n]));
    expect(byId.get(father.id)!.generation).toBe(-1);
    expect(byId.get(mother.id)!.generation).toBe(-1);
    expect(byId.get(focus.id)!.generation).toBe(0);
    expect(byId.get(child.id)!.generation).toBe(1);
    expect(byId.get(father.id)!.y).toBeLessThan(byId.get(focus.id)!.y);
    expect(byId.get(child.id)!.y).toBe(byId.get(focus.id)!.y + NODE_HEIGHT + V_GAP);

    const couple = layout.edges.find((e) => e.type === "couple");
    expect(couple).toMatchObject({ fromId: father.id, toId: mother.id, divorced: false });
    const drop = layout.edges.find(
      (e) => e.type === "parent-child" && e.childId === focus.id,
    );
    expect(drop).toMatchObject({
      parentIds: expect.arrayContaining([father.id, mother.id]),
      adopted: false,
    });
  });

  it("treats adoptive parentage and divorce distinctly", () => {
    const parent = person();
    const ex = person({ gender: "FEMALE" });
    const child = person();
    const layout = computeLayout({
      persons: [parent, ex, child],
      relationships: [
        rel(parent.id, ex.id, "EX_SPOUSE"),
        rel(parent.id, child.id, "ADOPTED_PARENT_OF"),
      ],
      focusId: parent.id,
      depth: null,
    });
    expect(layout.edges).toContainEqual(
      expect.objectContaining({ type: "couple", divorced: true }),
    );
    expect(layout.edges).toContainEqual(
      expect.objectContaining({ type: "parent-child", adopted: true }),
    );
  });

  it("filters by generation depth and reports hidden people", () => {
    const grandparent = person();
    const parent = person();
    const focus = person({ is_anchor: true });
    const layout = computeLayout({
      persons: [grandparent, parent, focus],
      relationships: [
        rel(grandparent.id, parent.id, "PARENT_OF"),
        rel(parent.id, focus.id, "PARENT_OF"),
      ],
      focusId: focus.id,
      depth: 1,
    });
    expect(layout.nodes.map((n) => n.person.id)).not.toContain(grandparent.id);
    expect(layout.hiddenCount).toBe(1);
  });

  it("caps rendering at the visible-node guard, keeping the closest generations", () => {
    const focus = person({ is_anchor: true });
    const persons = [focus];
    const relationships: Relationship[] = [];
    let previous = [focus];
    // Wide tree: each generation adds 200 children.
    for (let gen = 0; gen < 3; gen++) {
      const next: Person[] = [];
      for (let i = 0; i < 200; i++) {
        const child = person();
        persons.push(child);
        relationships.push(
          rel(previous[i % previous.length].id, child.id, "PARENT_OF"),
        );
        next.push(child);
      }
      previous = next;
    }
    const layout = computeLayout({
      persons,
      relationships,
      focusId: focus.id,
      depth: null,
    });
    expect(layout.nodes).toHaveLength(MAX_VISIBLE_NODES);
    expect(layout.hiddenCount).toBe(persons.length - MAX_VISIBLE_NODES);
    // The focus person always survives the guard.
    expect(layout.nodes.some((n) => n.person.id === focus.id)).toBe(true);
  });

  it("falls back to the anchor when the focus id is stale and keeps orphans visible", () => {
    const anchor = person({ is_anchor: true });
    const orphan = person();
    const layout = computeLayout({
      persons: [anchor, orphan],
      relationships: [],
      focusId: "deleted-id",
      depth: null,
    });
    expect(layout.nodes).toHaveLength(2);
    const byId = new Map(layout.nodes.map((n) => [n.person.id, n]));
    expect(byId.get(orphan.id)!.generation).toBeGreaterThan(
      byId.get(anchor.id)!.generation,
    );
  });
});

describe("a family in its own component", () => {
  // The first-run shape: someone records themselves, then pastes a family list
  // that is not yet linked to them.
  function pastedFamily() {
    const me = person({ is_anchor: true });
    const grandfather = person();
    const grandmother = person({ gender: "FEMALE" });
    const father = person();
    return {
      me,
      grandfather,
      grandmother,
      father,
      persons: [me, grandfather, grandmother, father],
      relationships: [
        rel(grandfather.id, grandmother.id, "SPOUSE"),
        rel(grandfather.id, father.id, "PARENT_OF"),
        rel(grandmother.id, father.id, "PARENT_OF"),
      ],
    };
  }

  function rowOf(result: ReturnType<typeof computeLayout>, id: string) {
    const node = result.nodes.find((candidate) => candidate.person.id === id);
    expect(node, `node ${id} was dropped`).toBeDefined();
    return node!.y;
  }

  it("keeps parents above their child instead of flattening the family", () => {
    const f = pastedFamily();
    const result = computeLayout({
      persons: f.persons,
      relationships: f.relationships,
      focusId: f.me.id,
      depth: null,
    });

    // The whole point: the child must not share a row with their parents.
    expect(rowOf(result, f.father.id)).toBeGreaterThan(
      rowOf(result, f.grandfather.id),
    );
    expect(rowOf(result, f.grandfather.id)).toBe(rowOf(result, f.grandmother.id));
  });

  it("separates the parents' row from the child's by one generation", () => {
    const f = pastedFamily();
    const result = computeLayout({
      persons: f.persons,
      relationships: f.relationships,
      focusId: f.me.id,
      depth: null,
    });

    expect(rowOf(result, f.father.id) - rowOf(result, f.grandfather.id)).toBe(
      NODE_HEIGHT + V_GAP,
    );
  });

  it("does not overlap the focus with the disconnected block", () => {
    const f = pastedFamily();
    const result = computeLayout({
      persons: f.persons,
      relationships: f.relationships,
      focusId: f.me.id,
      depth: null,
    });

    const rows = new Set(result.nodes.map((node) => node.y));
    // Four people across three distinct rows: me, the couple, their child.
    expect(rows.size).toBe(3);
    expect(rowOf(result, f.me.id)).not.toBe(rowOf(result, f.grandfather.id));
  });

  it("still shows a disconnected family when generations shown is limited", () => {
    const f = pastedFamily();
    const result = computeLayout({
      persons: f.persons,
      relationships: f.relationships,
      focusId: f.me.id,
      depth: 1,
    });

    // Depth counts distance from the focus, which does not describe anyone in
    // another component; dropping them would hide data the family entered.
    expect(result.nodes).toHaveLength(4);
    expect(result.hiddenCount).toBe(0);
  });

  it("orders the focus's own relatives before another component", () => {
    const me = person({ is_anchor: true });
    const myFather = person();
    const stranger = person();
    const result = computeLayout({
      persons: [stranger, me, myFather],
      relationships: [rel(myFather.id, me.id, "PARENT_OF")],
      focusId: me.id,
      depth: null,
    });

    const order = result.nodes.map((node) => node.person.id);
    expect(order.indexOf(myFather.id)).toBeLessThan(order.indexOf(stranger.id));
  });
});
