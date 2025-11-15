import { API_URL } from "../config";

export async function apiFetch(
  path: string,
  method = "GET",
  body?: any,
  token?: string
) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";
  const isJSON = contentType.includes("application/json");
  const data = isJSON ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      typeof data === "string"
        ? data
        : data?.message || "Unexpected error from server";
    throw new Error(message);
  }

  return typeof data === "string" ? data : data.data ?? data;
}
