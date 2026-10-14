import { createApiClient } from "@mydistrict/api-client";
const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
export const adminApi = () =>
  createApiClient({ baseUrl, getToken: () => (typeof window !== "undefined" ? localStorage.getItem("md_admin_token") : null) });
export const API_FILES = "http://localhost:4000";
