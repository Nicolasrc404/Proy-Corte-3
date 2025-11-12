const API_URL = "http://localhost:8000";

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
  const data = await res.json();
  return data.data ?? data;
}
