import { MAX_PDF_BYTES } from "@/lib/config";

export function isPdfFile(file: File): boolean {
  const byMime = file.type === "application/pdf";
  const byName = file.name.toLowerCase().endsWith(".pdf");
  return byMime || byName;
}

/** Returns an error message when invalid, otherwise null. */
export function validatePdfFile(file: File): string | null {
  if (!isPdfFile(file)) {
    return "Only PDF files are allowed.";
  }

  if (file.size === 0) {
    return "PDF file is empty.";
  }

  if (file.size > MAX_PDF_BYTES) {
    return "PDF exceeds the 10 MB limit.";
  }

  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
