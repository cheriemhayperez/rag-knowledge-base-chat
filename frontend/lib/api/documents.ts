import { getApiBaseUrl, getBusinessId } from "@/lib/config";
import type { UploadDocumentResult } from "@/types/documents";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (
    body &&
    typeof body === "object" &&
    "error" in body &&
    typeof (body as { error: unknown }).error === "string"
  ) {
    return (body as { error: string }).error;
  }

  return fallback;
}

function isUploadDocumentResult(body: unknown): body is UploadDocumentResult {
  if (!body || typeof body !== "object") {
    return false;
  }

  const value = body as Record<string, unknown>;
  return (
    typeof value.documentId === "string" &&
    typeof value.businessId === "string" &&
    typeof value.filename === "string" &&
    typeof value.fileType === "string" &&
    value.status === "ready" &&
    typeof value.chunkCount === "number"
  );
}

export async function uploadDocument(
  file: File,
): Promise<UploadDocumentResult> {
  const businessId = getBusinessId();
  if (!businessId) {
    throw new ApiError(
      "NEXT_PUBLIC_BUSINESS_ID is not configured. Add a businesses.id UUID to frontend/.env.local.",
      400,
    );
  }

  const formData = new FormData();
  formData.append("businessId", businessId);
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/api/documents/upload`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new ApiError(
      "Unable to reach the API. Check that the backend is running and try again.",
      0,
    );
  }

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new ApiError(
      readErrorMessage(body, "Failed to upload document"),
      response.status,
    );
  }

  if (!isUploadDocumentResult(body)) {
    throw new ApiError("Unexpected upload response from the server.", 500);
  }

  return body;
}
