import { useEffect, useRef, useState } from "react";
import { computeLayout, type LayoutInput, type LayoutResult } from "./layout";
import type {
  LayoutWorkerRequest,
  LayoutWorkerResponse,
} from "./layout.worker";

/**
 * Computes the graph layout in a Web Worker, falling back to a synchronous
 * call where workers are unavailable (unit tests). Stale worker responses
 * are discarded by request id.
 */
export function useGraphLayout(input: LayoutInput): LayoutResult | null {
  const [layout, setLayout] = useState<LayoutResult | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (typeof Worker === "undefined") return;
    const worker = new Worker(new URL("./layout.worker.ts", import.meta.url), {
      type: "module",
      name: "gia-pha-layout",
    });
    workerRef.current = worker;
    worker.addEventListener(
      "message",
      (event: MessageEvent<LayoutWorkerResponse>) => {
        if (event.data.id !== requestIdRef.current) return;
        if (event.data.ok) setLayout(event.data.result);
      },
    );
    return () => {
      workerRef.current = null;
      worker.terminate();
    };
  }, []);

  const { persons, relationships, focusId, depth } = input;
  useEffect(() => {
    const id = ++requestIdRef.current;
    const worker = workerRef.current;
    if (worker) {
      worker.postMessage({
        id,
        persons,
        relationships,
        focusId,
        depth,
      } satisfies LayoutWorkerRequest);
    } else {
      setLayout(computeLayout({ persons, relationships, focusId, depth }));
    }
  }, [persons, relationships, focusId, depth]);

  return layout;
}
