import { readFile } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

/**
 * Extract plain text from a selectable-text PDF on disk.
 * Does not perform OCR — scanned/image-only PDFs will return little or no text.
 */
export async function extractTextFromPdf(filePath: string): Promise<string> {
  const data = await readFile(filePath);
  return extractTextFromPdfData(data);
}

/**
 * Extract plain text from PDF bytes (e.g. future upload buffers).
 */
export async function extractTextFromPdfData(
  data: Buffer | Uint8Array,
): Promise<string> {
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}
