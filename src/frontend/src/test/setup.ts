import "@testing-library/jest-dom/vitest";
import { configure } from "@testing-library/react";

// The app's components use `data-ocid` for test hooks instead of `data-testid`.
configure({ testIdAttribute: "data-ocid" });

// The app's `main.tsx` installs this so BigInt values (timestamps, ids) can be
// serialized by JSON.stringify, which @tanstack/react-query uses to hash query
// keys. Tests render pages directly without main.tsx, so replicate it here.
BigInt.prototype.toJSON = function () {
  return this.toString();
};
