/**
 * Registers the app-shell service worker (see public/sw.js).
 *
 * Installing the app is what keeps a family's tree alive on iOS, which evicts
 * an uninstalled site's storage — OPFS included — after roughly seven days of
 * disuse. Registration is what makes the install prompt available.
 *
 * Production only: the dev server serves modules straight from source, and a
 * caching worker in front of that fights hot module replacement.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  navigator.serviceWorker
    .register("/sw.js", { scope: "/", updateViaCache: "none" })
    .catch((error: unknown) => {
      // Not fatal: the app still runs and still stores data. What is lost is the
      // offline shell, so say so rather than failing silently.
      console.error("Could not register the service worker:", error);
    });
}
