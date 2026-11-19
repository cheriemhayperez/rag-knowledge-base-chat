function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (raw && raw.length > 0) {
    return trimTrailingSlash(raw);
  }
  return "http://localhost:4000";
}

export function getBusinessId(): string {
  return process.env.NEXT_PUBLIC_BUSINESS_ID?.trim() ?? "";
}

export const MAX_PDF_BYTES = 10 * 1024 * 1024;
