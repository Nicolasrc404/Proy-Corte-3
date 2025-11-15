import { API_URL } from "../config";

export async function apiFetch<TResponse = unknown, TBody = unknown>(
  path: string,
  method = "GET",
  body?: TBody,
  token?: string
): Promise<TResponse | null> {
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

  if (typeof data === "string") {
    return data as unknown as TResponse;
  }

  return (data.data ?? data) as TResponse;
}
