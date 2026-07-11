/**
 * Runs the family graph layout off the main thread so large trees never
 * block interaction.
 */
import { computeLayout, type LayoutInput, type LayoutResult } from "./layout";

export interface LayoutWorkerRequest extends LayoutInput {
  id: number;
}

export type LayoutWorkerResponse =
  | { id: number; ok: true; result: LayoutResult }
  | { id: number; ok: false; error: string };

self.addEventListener("message", (event: MessageEvent<LayoutWorkerRequest>) => {
  const { id, ...input } = event.data;
  try {
    const result = computeLayout(input);
    self.postMessage({ id, ok: true, result } satisfies LayoutWorkerResponse);
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    } satisfies LayoutWorkerResponse);
  }
});
