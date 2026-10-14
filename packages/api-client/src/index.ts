// Typed fetch wrapper shared by web, admin, mobile.
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
}

export function createApiClient({ baseUrl, getToken }: ApiClientOptions) {
  async function request<T>(path: string, method: HttpMethod = "GET", body?: unknown, isForm = false): Promise<T> {
    const token = getToken ? await getToken() : null;
    const headers: Record<string, string> = {};
    if (!isForm) headers["Content-Type"] = "application/json";
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? (body as BodyInit) : JSON.stringify(body),
    });
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const j = await res.json();
        msg = (j as { error?: string }).error ?? msg;
      } catch { /* keep default */ }
      throw new Error(msg);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }
  return {
    get: <T>(p: string) => request<T>(p, "GET"),
    post: <T>(p: string, b?: unknown) => request<T>(p, "POST", b),
    put: <T>(p: string, b?: unknown) => request<T>(p, "PUT", b),
    patch: <T>(p: string, b?: unknown) => request<T>(p, "PATCH", b),
    del: <T>(p: string) => request<T>(p, "DELETE"),
    postForm: <T>(p: string, f: FormData) => request<T>(p, "POST", f, true),
  };
}
export type ApiClient = ReturnType<typeof createApiClient>;
