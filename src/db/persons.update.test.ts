/**
 * updatePerson interpolates column names into its statement, so the names it
 * accepts are the security boundary. These tests drive it through a stub
 * connection to see the statement it would run.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const run = vi.fn(async () => undefined);

vi.mock("./client", () => ({
  getDb: async () => ({ run }),
}));

const { updatePerson } = await import("./persons");

describe("updating a person", () => {
  beforeEach(() => {
    run.mockClear();
  });

  it("writes an allowed column with its value bound as a parameter", async () => {
    await updatePerson("p1", { first_name: "Long" });

    const [sql, params] = run.mock.calls[0] as unknown as [string, unknown[]];
    expect(sql).toBe(
      "UPDATE persons SET first_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    );
    expect(params).toEqual(["Long", "p1"]);
  });

  it("does nothing when there is nothing to change", async () => {
    await updatePerson("p1", {});

    expect(run).not.toHaveBeenCalled();
  });

  it("refuses a column name that is not part of a person", async () => {
    await expect(
      updatePerson("p1", { nickname: "Anh Hai" } as never),
    ).rejects.toThrow(/unknown person columns: nickname/);
    expect(run).not.toHaveBeenCalled();
  });

  it("refuses SQL smuggled in through a column name", async () => {
    await expect(
      updatePerson("p1", { "notes = '' , first_name": "x" } as never),
    ).rejects.toThrow(/unknown person columns/);
    // Nothing reaches the database: the statement is never assembled.
    expect(run).not.toHaveBeenCalled();
  });

  it("refuses to reassign a person's identity", async () => {
    await expect(updatePerson("p1", { id: "p2" } as never)).rejects.toThrow(
      /unknown person columns: id/,
    );
    expect(run).not.toHaveBeenCalled();
  });

  it("rejects the whole call when one column of several is unknown", async () => {
    await expect(
      updatePerson("p1", { notes: "ghi chú", dropped: 1 } as never),
    ).rejects.toThrow(/unknown person columns: dropped/);
    // Partially applying an edit is worse than refusing it.
    expect(run).not.toHaveBeenCalled();
  });
});
