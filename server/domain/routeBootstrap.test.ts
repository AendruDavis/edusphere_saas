import assert from "node:assert/strict";
import test from "node:test";

test("secure routes load without schema composition errors", async () => {
  const routes = await import("../http/secureRoutes");

  assert.equal(typeof routes.registerSecureRoutes, "function");
});
