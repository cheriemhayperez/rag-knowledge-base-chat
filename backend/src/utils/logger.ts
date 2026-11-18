/** Lightweight console logging — never log secrets, document text, or embeddings. */

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** Local timestamp: [YYYY-MM-DD HH:mm:ss] */
export function formatTimestamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}]`;
}

export function logInfo(message: string): void {
  console.log(`[INFO] ${message}`);
}

export function logRequestStart(method: string, path: string): void {
  console.log(`${formatTimestamp()} ${method} ${path}`);
}

export function logRequestEnd(
  statusCode: number,
  method: string,
  path: string,
  durationMs: number,
): void {
  const seconds = (durationMs / 1000).toFixed(1);
  console.log(`[${statusCode}] ${method} ${path} - ${seconds}s`);
}

export function requestPath(url: string): string {
  const queryIndex = url.indexOf("?");
  return queryIndex === -1 ? url : url.slice(0, queryIndex);
}
