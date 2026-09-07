const ACCESS_TOKEN_KEY = "edu_postgres_access_token";
const REFRESH_TOKEN_KEY = "edu_postgres_refresh_token";
const ACTIVE_SCHOOL_KEY = "edu_active_school_id";

type ApiOptions = RequestInit & {
  json?: unknown;
};

export type ApiErrorDetails = {
  code?: string;
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
};

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: ApiErrorDetails) {
    super(message);
    this.name = "ApiError";
  }
}

export function apiFieldErrors(error: unknown) {
  return error instanceof ApiError ? error.details?.fieldErrors ?? {} : {};
}

export type AuthSession = {
  accessToken: string;
  refreshToken?: string;
};

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAuthSession(session: AuthSession) {
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  if (session.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  }
}

export function clearAuthSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACTIVE_SCHOOL_KEY);
}

export function getActiveSchoolId() {
  return localStorage.getItem(ACTIVE_SCHOOL_KEY);
}

export function setActiveSchoolId(schoolId: string) {
  localStorage.setItem(ACTIVE_SCHOOL_KEY, schoolId);
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAccessToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
    const schoolId = getActiveSchoolId();
    if (schoolId) headers.set("X-School-Id", schoolId);
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed with status ${response.status}`;
    const details = typeof payload === "object" && payload !== null && "details" in payload
      ? (payload as { details?: ApiErrorDetails }).details
      : undefined;
    throw new ApiError(message, response.status, details);
  }

  return payload as T;
}

export async function uploadDataUrlAsset(dataUrl: string | null | undefined, folder: string) {
  if (!dataUrl || !dataUrl.startsWith("data:")) return dataUrl ?? null;
  const result = await apiRequest<{ url: string }>("/api/storage/data-url", {
    method: "POST",
    json: { dataUrl, folder },
  });
  return result.url;
}
