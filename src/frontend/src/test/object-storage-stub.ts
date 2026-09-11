// Test-only stub for @caffeineai/object-storage.
//
// The app's generated `backend.ts` imports `ExternalBlob` from this package and
// re-exports it, but only ever uses it as a type in function signatures. The
// real package's `exports` map does not expose its internal `./blob` subpath,
// which Vite's strict exports resolution rejects when Vitest loads `dist/index.js`.
// Since no test exercises object storage, a type-only stub is sufficient and
// keeps the frontend suite from failing on an unrelated package-resolution seam.
export type ExternalBlob = {
  data: Uint8Array;
  contentType: string;
  filename?: string;
};
