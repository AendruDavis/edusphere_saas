function databaseIdentity(value: string) {
  const url = new URL(value);
  const hostname = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ? "loopback" : url.hostname.toLowerCase();
  return `${hostname}:${url.port || "5432"}/${decodeURIComponent(url.pathname.slice(1))}`;
}

export function validateTestTarget(testUrl?: string, applicationUrl?: string, expectedMajor?: string) {
  if (!testUrl) throw new Error("TEST_DATABASE_URL is required; configuration tests never use DATABASE_URL as a fallback");
  let url: URL;
  try { url = new URL(testUrl); } catch { throw new Error("TEST_DATABASE_URL must be a PostgreSQL URL"); }
  const name = decodeURIComponent(url.pathname.slice(1));
  if (!["postgres:", "postgresql:"].includes(url.protocol)
    || !/(^|[_-])test([_-]|$)/i.test(name)
    || /prod|production|live/i.test(name)
    || !/^[a-zA-Z0-9_-]+$/.test(name)
    || url.search) {
    throw new Error("Use a dedicated database named edusphere_test_* with no URL query options");
  }
  if (applicationUrl && databaseIdentity(testUrl) === databaseIdentity(applicationUrl)) {
    throw new Error("TEST_DATABASE_URL must not identify the application database");
  }
  if (!expectedMajor || !/^\d+$/.test(expectedMajor) || Number(expectedMajor) < 14) {
    throw new Error("Set TEST_POSTGRES_MAJOR to the production PostgreSQL major version");
  }
  return { connectionString: testUrl, databaseName: name, major: Number(expectedMajor) };
}
