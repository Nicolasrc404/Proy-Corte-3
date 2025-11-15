const envUrl = import.meta.env.VITE_API_URL as string | undefined;

export const API_URL =
  envUrl && envUrl.length > 0 ? envUrl : "http://localhost:8000";
