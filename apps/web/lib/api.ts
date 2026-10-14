import { createApiClient } from "@mydistrict/api-client";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export function api(token?: string | null) {
  return createApiClient({ baseUrl, getToken: () => token ?? (typeof window !== "undefined" ? localStorage.getItem("md_token") : null) });
}
